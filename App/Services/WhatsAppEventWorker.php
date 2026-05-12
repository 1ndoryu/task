<?php

namespace App\Services;

/**
 * [125B-1] Worker de cola de eventos WhatsApp.
 *
 * Procesa eventos encolados por el webhook asíncrono. Se ejecuta vía
 * systemd timer (cada 5s, recomendado) o WP cron (cada minuto, fallback).
 *
 * Flujo por ciclo:
 *   1. Zombie recovery: re-encola eventos atascados en 'processing'
 *   2. Fetch hasta 5 eventos pendientes (FIFO)
 *   3. Por cada evento:
 *      a. Per-user lock (GET_LOCK, timeout 5s)
 *      b. Adquirir slot LLM global (GlobalLLMRateLimiter)
 *      c. Procesar mensaje: parsear, media, AgentChatProcessor
 *      d. Enviar respuesta via WacliManagerService
 *      e. Liberar slot LLM + per-user lock + marcar completado
 *
 * @package App\Services
 */
class WhatsAppEventWorker
{
    private \wpdb $wpdb;
    private string $tablaCola;
    private string $tablaCuentas;
    private WacliManagerService $wacliManager;
    private GlobalLLMRateLimiter $llmLimiter;

    public function __construct()
    {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->tablaCola    = $wpdb->prefix . 'glory_whatsapp_event_queue';
        $this->tablaCuentas = $wpdb->prefix . 'glory_whatsapp_accounts';
        $this->wacliManager = new WacliManagerService();
        $this->llmLimiter   = new GlobalLLMRateLimiter($wpdb);
    }

    /**
     * Ejecuta un ciclo del worker.
     * Llamado por systemd timer o WP cron.
     */
    public function run(): void
    {
        /* 1. Recuperar zombies */
        $this->recuperarZombies();

        /* 2. Obtener eventos pendientes (hasta 5) */
        $eventos = $this->obtenerEventosPendientes(5);

        if (empty($eventos)) {
            return;
        }

        error_log('[WhatsAppWorker] Ciclo: ' . count($eventos) . ' eventos pendientes');

        /* 3. Procesar cada evento */
        foreach ($eventos as $evento) {
            $this->procesarEvento($evento);
        }
    }

    // ─── Recuperación de zombies ────────────────────────────────────

    /**
     * Re-encola eventos que quedaron en 'processing' por más de 5 minutos
     * (worker muerto por fatal PHP, timeout, OOM, etc.).
     */
    private function recuperarZombies(): void
    {
        $afectados = $this->wpdb->query(
            "UPDATE {$this->tablaCola}
             SET status = 'pending', locked_until = NULL
             WHERE status = 'processing'
               AND updated_at < NOW() - INTERVAL 5 MINUTE"
        );

        if ($afectados > 0) {
            error_log("[WhatsAppWorker] Zombies recuperados: {$afectados}");
        }
    }

    // ─── Fetch de eventos ───────────────────────────────────────────

    /**
     * Obtiene los siguientes eventos pendientes para procesar.
     *
     * @param int $limite Máximo de eventos (default 5)
     * @return array Lista de objetos con datos de la cola
     */
    private function obtenerEventosPendientes(int $limite = 5): array
    {
        $rows = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->tablaCola}
                 WHERE status = 'pending'
                   AND (locked_until IS NULL OR locked_until < NOW())
                   AND attempts < max_attempts
                 ORDER BY created_at ASC
                 LIMIT %d",
                $limite
            )
        );

        return $rows ?: [];
    }

    // ─── Procesamiento de un evento ─────────────────────────────────

    /**
     * Procesa un evento de la cola.
     */
    private function procesarEvento(object $evento): void
    {
        /* Lock optimista: marcar como processing */
        $bloqueado = $this->wpdb->update(
            $this->tablaCola,
            [
                'status'       => 'processing',
                'locked_until' => date('Y-m-d H:i:s', time() + 300),
            ],
            [
                'id'     => $evento->id,
                'status' => 'pending',
            ]
        );

        if (!$bloqueado) {
            return; /* Otro worker lo tomó */
        }

        /* Resolver usuario desde account_name */
        $cuenta = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT user_id, phone_primary, enabled, authenticated,
                        daily_msg_count, daily_msg_date
                 FROM {$this->tablaCuentas}
                 WHERE account_name = %s",
                $evento->account_name
            )
        );

        if (!$cuenta || !$cuenta->enabled || !$cuenta->authenticated) {
            $this->marcarFallido($evento->id, 'Cuenta inválida o no autenticada');
            return;
        }

        $userId = (int)$cuenta->user_id;

        /* Per-user lock: solo un mensaje a la vez por usuario */
        $lockKey = "whatsapp_user_{$userId}";
        $locked  = $this->wpdb->get_var($this->wpdb->prepare('SELECT GET_LOCK(%s, 5)', $lockKey));

        if (!$locked) {
            $this->reencolarEvento((int)$evento->id, 5);
            return;
        }

        try {
            $this->procesarContenidoEvento($userId, $evento);
        } catch (\Throwable $e) {
            error_log('[WhatsAppWorker] Error procesando evento ' . $evento->id . ': ' . $e->getMessage());
            $falloRegistrado = $this->registrarFalloProcesamiento($evento, 'Error: ' . substr($e->getMessage(), 0, 200));
            if (!$falloRegistrado) {
                error_log('[WhatsAppWorker] No se pudo registrar fallo del evento ' . $evento->id);
            }
        } finally {
            $this->wpdb->query($this->wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lockKey));
        }
    }

    /**
     * Procesa el contenido del evento: parsea JSON, descarga media,
     * llama al LLM y envía respuesta.
     */
    private function procesarContenidoEvento(int $userId, object $evento): void
    {
        $data = json_decode($evento->event_body, true);
        if (!is_array($data)) {
            $this->marcarFallido($evento->id, 'JSON inválido');
            return;
        }

        /* ── Detectar formato ─────────────────────────── */
        $tipo         = (string)($data['type'] ?? '');
        $esFormatoNuevo = $tipo === '' && isset($data['Chat']) && (isset($data['Text']) || isset($data['Media']));

        if (!$esFormatoNuevo && $tipo !== 'message.received') {
            $this->marcarCompletado($evento->id);
            return;
        }

        /* FromMe/Revoked: descartar */
        if ($esFormatoNuevo) {
            if (!empty($data['FromMe']) || !empty($data['Revoked'])) {
                $this->marcarCompletado($evento->id);
                return;
            }
            $from = (string)($data['Chat'] ?? '');
            $text = trim((string)($data['Text'] ?? ''));
        } else {
            $msg  = $data['message'] ?? $data;
            $from = (string)($msg['from'] ?? $data['from'] ?? '');
            $text = trim((string)($msg['text']['body'] ?? $msg['body'] ?? $data['body'] ?? ''));
        }

        /* ── Extraer media ────────────────────────────── */
        $mediaEvento = null;
        if ($esFormatoNuevo && isset($data['Media']['Type'])) {
            $mediaKind  = (string)($data['Media']['Type'] ?? '');
            $mediaType  = (string)($data['Media']['MimeType'] ?? $mediaKind);
            $messageId  = (string)($data['ID'] ?? '');
            if ($mediaKind !== '' && $messageId !== '') {
                $mediaEvento = [
                    'type'          => $mediaKind,
                    'mimeType'      => $mediaType,
                    'chat'          => $from,
                    'messageId'     => $messageId,
                    'directPath'    => (string)($data['Media']['DirectPath'] ?? ''),
                    'mediaKey'      => (string)($data['Media']['MediaKey'] ?? ''),
                    'fileEncSHA256' => (string)($data['Media']['FileEncSHA256'] ?? ''),
                    'fileLength'    => (int)($data['Media']['FileLength'] ?? 0),
                ];
            }
        }

        /* ── Validar contenido procesable ─────────────── */
        $isGroup   = str_contains($from, '@g.us');
        $textEfectivo = (preg_match('/^\[.{1,20}\]$/', $text) && $mediaEvento !== null) ? '' : $text;

        if ($isGroup || ($textEfectivo === '' && $mediaEvento === null) || $from === '') {
            $this->marcarCompletado($evento->id);
            return;
        }

        /* Rate-limit: máx 20 mensajes por JID cada 5 minutos */
        if ($this->excedeLimiteJid($from)) {
            $fromMasked = substr(preg_replace('/[^0-9]/', '', $from), 0, 4) . '****';
            error_log('[WhatsAppWorker] Rate-limit JID alcanzado: ' . $fromMasked);
            $this->reencolarEvento((int)$evento->id, 60);
            return;
        }

        /* ── Daily message limit ──────────────────────── */
        $cuenta = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT daily_msg_count, daily_msg_date FROM {$this->tablaCuentas} WHERE user_id = %d",
                $userId
            )
        );
        if ($cuenta) {
            $hoy = UserTimeService::today($userId, 'whatsapp');
            $msgCount = (int)$cuenta->daily_msg_count;
            $msgDate  = $cuenta->daily_msg_date;

            if ($msgDate !== $hoy) {
                /* Reset diario */
                $resetOk = $this->wpdb->update(
                    $this->tablaCuentas,
                    ['daily_msg_count' => 0, 'daily_msg_date' => $hoy],
                    ['user_id' => $userId]
                );
                if ($resetOk === false) {
                    error_log('[WhatsAppWorker] No se pudo resetear contador diario user ' . $userId . ': ' . $this->wpdb->last_error);
                }
                $msgCount = 0;
            }

            $dailyLimit = (int)($_ENV['WHATSAPP_DAILY_MSG_LIMIT'] ?? getenv('WHATSAPP_DAILY_MSG_LIMIT') ?: 50);
            if ($msgCount >= $dailyLimit) {
                error_log("[WhatsAppWorker] Límite diario alcanzado para user {$userId}");
                $this->marcarFallido($evento->id, 'Daily limit reached');
                return;
            }
        }

        /* ── Session ID ───────────────────────────────── */
        $fromNum   = preg_replace('/[^0-9]/', '', $from) ?? '';
        $sessionId = 'whatsapp_' . $fromNum;

        $esLid   = str_contains($from, '@lid');
        $destino = $esLid ? $from : ('+' . $fromNum);

        /* ── Adquirir slot LLM global ─────────────────── */
        $slot = $this->llmLimiter->acquireSlot();
        if ($slot === false) {
            $this->reencolarEvento((int)$evento->id, 5);
            return;
        }

        try {
            /* ── Procesar media ───────────────────────────── */
            $mensajeParaAgente = $textEfectivo;
            $mediaParaAgente   = null;

            if ($mediaEvento !== null) {
                $tmpFile = null;
                try {
                    $mimeType  = (string)($mediaEvento['mimeType'] ?? $mediaEvento['type']);
                    $mediaKind = (string)($mediaEvento['type'] ?? '');

                    /* Intentar descarga directa CDN primero (no necesita store lock) */
                    if (!empty($mediaEvento['directPath']) && !empty($mediaEvento['mediaKey'])) {
                        $tmpFile = (new WacliService())->descargarMediaDirecto($mediaEvento);
                    } else {
                        $tmpFile = $this->wacliManager->descargarMedia(
                            $userId,
                            $mediaEvento['chat'],
                            $mediaEvento['messageId'],
                            $mimeType
                        );
                    }

                    if (str_starts_with($mimeType, 'image/') || $mediaKind === 'image') {
                        $b64             = base64_encode((string)file_get_contents($tmpFile));
                        $mediaParaAgente = ['mimeType' => $mimeType, 'base64' => $b64];
                        if ($mensajeParaAgente === '') {
                            $mensajeParaAgente = '[Imagen recibida]';
                        }
                        error_log('[WhatsAppWorker] Imagen OK, user=' . $userId . ' type=' . $mimeType);
                    } elseif (
                        str_starts_with($mimeType, 'audio/') ||
                        str_starts_with($mimeType, 'video/') ||
                        in_array($mediaKind, ['audio', 'video'], true)
                    ) {
                        $mensajeParaAgente = (new LLMProviderService())->transcribirAudio($tmpFile, $mimeType);
                        error_log('[WhatsAppWorker] Audio transcrito OK, user=' . $userId);
                    } else {
                        error_log('[WhatsAppWorker] Media no soportado: type=' . $mediaKind . ' mime=' . $mimeType);
                        if ($mensajeParaAgente === '') {
                            /* Marcar como completado (no es error — es un tipo no procesable) */
                            $this->marcarCompletado($evento->id);
                            return;
                        }
                    }
                } catch (\Throwable $mediaErr) {
                    error_log('[WhatsAppWorker] Error media: ' . $mediaErr->getMessage());
                    $mimeType  = (string)($mediaEvento['mimeType'] ?? $mediaEvento['type']);
                    $mediaKind = (string)($mediaEvento['type'] ?? '');
                    $placeholdersWacli = ['', '[Audio]', '[Image]', '[Video]', '[Document]', '[Sticker]', '[GIF]'];
                    $esPlaceholder = in_array($mensajeParaAgente, $placeholdersWacli, true)
                        || preg_match('/^\[.{1,20}\]$/', $mensajeParaAgente);
                    if ($esPlaceholder) {
                        if (str_starts_with($mimeType, 'audio/') || in_array($mediaKind, ['audio', 'video'], true)) {
                            $mensajeParaAgente = '[El usuario envió un audio que no se pudo transcribir (error técnico). Dile que lo reenvíe o escriba el mensaje.]';
                        } else {
                            $mensajeParaAgente = '[El usuario envió un archivo multimedia que no se pudo procesar. Dile que lo reenvíe.]';
                        }
                    }
                } finally {
                    if ($tmpFile !== null && file_exists($tmpFile)) {
                        unlink($tmpFile);
                    }
                }
            }

            if ($mensajeParaAgente === '') {
                $this->marcarCompletado($evento->id);
                return;
            }

            /* ── Procesar con AgentChatProcessor ────────── */
            $resultado = (new AgentChatProcessor())->procesar(
                $userId,
                $sessionId,
                $mensajeParaAgente,
                'whatsapp',
                $mediaParaAgente
            );

            /* ── Enviar respuesta como el usuario ──────── */
            if (!empty($resultado['respuesta'])) {
                $this->wacliManager->enviarTexto($userId, $destino, $resultado['respuesta']);
            }

            /* ── Incrementar contador diario ───────────── */
            $incrementado = $this->wpdb->query(
                $this->wpdb->prepare(
                    "UPDATE {$this->tablaCuentas}
                     SET daily_msg_count = daily_msg_count + 1
                     WHERE user_id = %d",
                    $userId
                )
            );
            if ($incrementado === false) {
                error_log('[WhatsAppWorker] No se pudo incrementar contador diario user ' . $userId . ': ' . $this->wpdb->last_error);
            }

            /* Marcar como completado */
            $this->marcarCompletado($evento->id);

        } finally {
            $this->llmLimiter->releaseSlot($slot);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────

    /**
     * Marca un evento como completado.
     */
    private function marcarCompletado(int $eventoId): bool
    {
        return $this->actualizarEvento($eventoId,
            [
                'status'       => 'completed',
                'processed_at' => current_time('mysql'),
            ]
        );
    }

    /**
     * Marca un evento como fallido.
     */
    private function marcarFallido(int $eventoId, string $razon): bool
    {
        $actualizado = $this->actualizarEvento($eventoId,
            [
                'status'       => 'failed',
                'processed_at' => current_time('mysql'),
            ]
        );
        error_log("[WhatsAppWorker] Evento {$eventoId} fallido: {$razon}");
        return $actualizado;
    }

    private function reencolarEvento(int $eventoId, int $delaySeconds): bool
    {
        return $this->actualizarEvento($eventoId,
            [
                'status'       => 'pending',
                'locked_until' => $delaySeconds > 0 ? date('Y-m-d H:i:s', time() + $delaySeconds) : null,
            ]
        );
    }

    private function registrarFalloProcesamiento(object $evento, string $razon): bool
    {
        $attempts = (int)$evento->attempts + 1;
        $maxAttempts = max(1, (int)$evento->max_attempts);
        if ($attempts < $maxAttempts) {
            $actualizado = $this->actualizarEvento((int)$evento->id,
                [
                    'status'       => 'pending',
                    'attempts'     => $attempts,
                    'locked_until' => date('Y-m-d H:i:s', time() + min(300, 30 * $attempts)),
                ]
            );
            error_log("[WhatsAppWorker] Evento {$evento->id} reencolado tras fallo {$attempts}/{$maxAttempts}: {$razon}");
            return $actualizado;
        }
        return $this->marcarFallido((int)$evento->id, $razon);
    }

    private function actualizarEvento(int $eventoId, array $datos): bool
    {
        $resultado = $this->wpdb->update($this->tablaCola, $datos, ['id' => $eventoId]);
        if ($resultado === false) {
            error_log('[WhatsAppWorker] Error actualizando evento ' . $eventoId . ': ' . $this->wpdb->last_error);
            return false;
        }
        return true;
    }

    /**
     * Rate-limit por JID: máx 20 peticiones en ventana de 5 minutos.
     */
    private function excedeLimiteJid(string $jid): bool
    {
        $key   = 'wa_rl_' . md5($jid);
        $count = (int)(get_transient($key) ?: 0);
        if ($count === 0) {
            set_transient($key, 1, 5 * MINUTE_IN_SECONDS);
            return false;
        }
        if ($count >= 20) {
            return true;
        }
        set_transient($key, $count + 1, 5 * MINUTE_IN_SECONDS);
        return false;
    }

    /**
     * Método estático para usar como callback de WP cron.
     */
    public static function runCron(): void
    {
        $worker = new self();
        $worker->run();
    }
}

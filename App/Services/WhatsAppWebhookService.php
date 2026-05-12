<?php

namespace App\Services;

/* [109B] Procesa eventos POST de wacli sync --webhook.
 * wacli envía NDJSON: una línea JSON por evento con X-Wacli-Signature: sha256=HMAC.
 * Seguridad: solo el número admin (WHATSAPP/WHATSAPP_SEGUNDO_NUMERO/WHATSAPP_AGENT_TO) puede
 * usar el chatbot. Los JIDs @lid se verifican buscando el WP user con ese JID en meta.
 * Rate-limit: máx 20 mensajes por número cada 5 minutos (transient WP).
 * Gotcha: wacli env WACLI_STORE_DIR debe estar seteado en el systemd service del host,
 *         no solo en el contenedor Docker.
 */
class WhatsAppWebhookService
{
    private string $secret;

    public function __construct()
    {
        // phpdotenv createImmutable no llama putenv(), usar $_ENV como fallback
        $this->secret = (string)($_ENV['WACLI_WEBHOOK_SECRET'] ?? getenv('WACLI_WEBHOOK_SECRET') ?: '');
    }

    /**
     * Verifica la firma HMAC-SHA256 del webhook.
     * El header tiene formato: sha256=<hex>
     */
    public function validarFirma(string $body, string $headerFirma): bool
    {
        if ($this->secret === '') {
            error_log('[WhatsApp] WACLI_WEBHOOK_SECRET no configurado — rechazando petición.');
            return false;
        }
        $esperada = 'sha256=' . hash_hmac('sha256', $body, $this->secret);
        return hash_equals($esperada, $headerFirma);
    }

    /**
     * Procesa una línea de evento NDJSON del webhook.
     * Soporta dos formatos de wacli:
     *   - Formato legacy: {type:"message.received", from, body}
     *   - Formato nuevo (Go/wasm, @lid JIDs): {Chat, SenderJID, Text, FromMe, Revoked, ...}
     * No lanza excepciones — registra errores y continúa.
     */
    public function procesarEvento(array $evento): void
    {
        $tipo = (string)($evento['type'] ?? '');

        /* Log para capturar el formato real de wacli */
        error_log('[WhatsApp] evento tipo=' . $tipo . ' raw=' . json_encode($evento));

        /* Detectar formato nuevo: sin "type", con "Text"/"Chat" o con "Media"/"Chat" */
        $esFormatoNuevo = $tipo === '' && isset($evento['Chat']) && (isset($evento['Text']) || isset($evento['Media']));

        if (!$esFormatoNuevo && $tipo !== 'message.received') {
            return;
        }

        if ($esFormatoNuevo) {
            /* Formato nuevo: FromMe:true = enviado por nosotros; Revoked:true = borrado */
            if (!empty($evento['FromMe']) || !empty($evento['Revoked'])) {
                return;
            }
            $from = (string)($evento['Chat'] ?? '');
            $text = trim((string)($evento['Text'] ?? ''));
        } else {
            /* Formato legacy */
            $msg  = $evento['message'] ?? $evento;
            $from = (string)($msg['from'] ?? $evento['from'] ?? '');
            $text = trim((string)($msg['text']['body'] ?? $msg['body'] ?? $evento['body'] ?? ''));
        }

        /* [115A-5][125A-3] Extraer media si el mensaje la incluye (puede venir con o sin caption).
         * Gotcha: wacli envía Media.Type como kind (audio/image) y Media.MimeType como MIME real para Whisper/visión. */
        $mediaEvento = null;
        if ($esFormatoNuevo && isset($evento['Media']['Type'])) {
            $mediaKind  = (string)($evento['Media']['Type'] ?? '');
            $mediaType  = (string)($evento['Media']['MimeType'] ?? $mediaKind);
            $messageId  = (string)($evento['ID'] ?? '');
            /* [116A-3] wacli media download usa --chat y --id (no --direct-path/--media-key) */
            if ($mediaKind !== '' && $messageId !== '') {
                $mediaEvento = ['type' => $mediaKind, 'mimeType' => $mediaType, 'chat' => $from, 'messageId' => $messageId];
            }
        }

        $isGroup = str_contains($from, '@g.us');
        /* Descartar solo si texto vacío Y sin media procesable */
        if ($isGroup || ($text === '' && $mediaEvento === null) || $from === '') {
            return;
        }

        /* Rate-limit: máx 20 mensajes por JID cada 5 minutos (evita flood/abuso LLM) */
        if ($this->excedeLimite($from)) {
            error_log('[WhatsApp] Rate-limit alcanzado para JID: ' . substr($from, 0, 20));
            return;
        }

        /* Verificar que el remitente es un número admin autorizado.
         * @lid JIDs no tienen número de teléfono legible; los buscamos por meta WP si
         * existe mapeo, o los verificamos contra la lista de dígitos del JID vs números env.
         * Sin verificación exitosa → se descarta el mensaje silenciosamente. */
        $adminId = $this->resolverAdminDesdeRemitente($from);
        if (!$adminId) {
            error_log('[WhatsApp] Remitente no autorizado descartado: ' . substr($from, 0, 20));
            return;
        }

        /* session_id: dígitos del JID (únicos por contacto) */
        $fromNum   = preg_replace('/[^0-9]/', '', $from) ?? '';
        $sessionId = 'whatsapp_' . $fromNum;

        /* Para enviar: @lid JIDs se pasan tal cual a wacli (protocolo nativo);
         * @s.whatsapp.net se usa como +dígitos */
        $esLid   = str_contains($from, '@lid');
        $destino = $esLid ? $from : ('+' . $fromNum);

        try {
            /* [115A-5] Procesar media si existe: imagen → visión, audio → transcripción */
            $mensajeParaAgente = $text;
            $mediaParaAgente   = null;

            if ($mediaEvento !== null) {
                $tmpFile = null;
                try {
                    $mimeType = (string)($mediaEvento['mimeType'] ?? $mediaEvento['type']);
                    $mediaKind = (string)($mediaEvento['type'] ?? '');
                    $tmpFile = (new WacliService())->descargarMedia(
                        $mediaEvento['chat'],
                        $mediaEvento['messageId'],
                        $mimeType
                    );

                    if (str_starts_with($mimeType, 'image/') || $mediaKind === 'image') {
                        /* Enviar imagen al LLM con visión multimodal */
                        $b64             = base64_encode((string)file_get_contents($tmpFile));
                        $mediaParaAgente = ['mimeType' => $mimeType, 'base64' => $b64];
                        /* Mantener caption si el usuario escribió algo junto a la imagen */
                        if ($mensajeParaAgente === '') {
                            $mensajeParaAgente = '[Imagen recibida]';
                        }
                        error_log('[WhatsApp] Imagen recibida, type=' . $mimeType . ' size=' . strlen($b64));
                    } elseif (str_starts_with($mimeType, 'audio/') || str_starts_with($mimeType, 'video/') || in_array($mediaKind, ['audio', 'video'], true)) {
                        /* Transcribir audio con Groq Whisper */
                        $mensajeParaAgente = (new LLMProviderService())->transcribirAudio($tmpFile, $mimeType);
                        error_log('[WhatsApp] Audio transcrito (' . $mimeType . '): ' . mb_substr($mensajeParaAgente, 0, 120));
                    } else {
                        error_log('[WhatsApp] Tipo de media no soportado: ' . $mediaKind . ' mime=' . $mimeType);
                        if ($mensajeParaAgente === '') {
                            return; /* nada procesable */
                        }
                    }
                } catch (\Throwable $mediaErr) {
                    error_log('[WhatsApp] Error procesando media: ' . $mediaErr->getMessage());
                    if ($mensajeParaAgente === '') {
                        /* [116A-3] En lugar de responder directamente y cortar, informar al LLM
                         * para que responda de forma natural y pida al usuario que reenvíe. */
                        $mimeType = (string)($mediaEvento['mimeType'] ?? $mediaEvento['type']);
                        $mediaKind = (string)($mediaEvento['type'] ?? '');
                        if (str_starts_with($mimeType, 'audio/') || str_starts_with($mimeType, 'video/') || in_array($mediaKind, ['audio', 'video'], true)) {
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
                return;
            }

            $resultado = (new AgentChatProcessor())->procesar($adminId, $sessionId, $mensajeParaAgente, 'whatsapp', $mediaParaAgente);

            if (!empty($resultado['respuesta'])) {
                (new WacliService())->enviarTexto($destino, $resultado['respuesta']);
            }
        } catch (\Throwable $e) {
            error_log('[WhatsApp] Error procesando mensaje entrante de ' . $fromNum . ': ' . $e->getMessage());
            try {
                (new WacliService())->enviarTexto($destino, 'Error interno. Intenta de nuevo en unos segundos.');
            } catch (\Throwable) {
                /* Silenciar */
            }
        }
    }

    /* --- Helpers privados --------------------------------------------------- */

    /**
     * Resuelve qué usuario administrador corresponde al remitente.
     * Para @s.whatsapp.net: compara dígitos vs números autorizados en .env y devuelve
     *   el primer admin de WP que coincida (o null si no hay coincidencia).
     * Para @lid: busca en wp_usermeta la clave 'whatsapp_lid' con el JID completo.
     *   Si no hay mapeo guardado, compara los dígitos del @lid vs números autorizados
     *   como fallback (cubre el caso del admin que nunca mapeó su JID manualmente).
     * En todos los casos, el usuario resultante DEBE tener rol administrator.
     *
     * [115A-2] Solo el número WHATSAPP (principal) y WHATSAPP_AGENT_TO activan el bot.
     * WHATSAPP_SEGUNDO_NUMERO queda EXCLUIDO del set autorizado: el bot solo responde al
     * número primario (EEUU). JIDs específicos se pueden bloquear via WHATSAPP_BLOCKED_JIDS
     * (lista separada por comas, ej: 55959850381429@lid).
     */
    private function resolverAdminDesdeRemitente(string $from): ?int
    {
        $fromNorm = preg_replace('/[^0-9]/', '', $from) ?? '';
        $esLid    = str_contains($from, '@lid');

        $env = function (string $k): string {
            return (string)($_ENV[$k] ?? getenv($k) ?: '');
        };

        /* [115A-2] Bloquear JIDs explícitamente excluidos.
         * WHATSAPP_BLOCKED_JIDS: lista separada por comas (ej: 55959850381429@lid).
         * Útil para bloquear números mapeados en wp_usermeta que no deben activar el bot. */
        $blockedJids = array_filter(array_map('trim', explode(',', $env('WHATSAPP_BLOCKED_JIDS'))));
        if (!empty($blockedJids) && in_array($from, $blockedJids, true)) {
            error_log('[WhatsApp] JID en lista de bloqueados, ignorado: ' . substr($from, 0, 20));
            return null;
        }

        if ($esLid) {
            /* Buscar mapeo explícito JID→user (guardado por primera autenticación exitosa) */
            $users = get_users([
                'meta_key'   => 'whatsapp_lid',
                'meta_value' => $from,
                'role'       => 'administrator',
                'number'     => 1,
                'fields'     => 'ID',
            ]);
            if (!empty($users)) {
                return (int)$users[0];
            }
            /* Fallback: comparar dígitos del @lid vs números env (ej: 584120825234@lid → 584120825234) */
        }

        /* Solo WHATSAPP (número principal) y WHATSAPP_AGENT_TO activan el bot.
         * WHATSAPP_SEGUNDO_NUMERO excluido — el bot solo responde al número primario. */
        $numerosPermitidos = array_filter([
            $env('WHATSAPP'),
            $env('WHATSAPP_AGENT_TO'),
        ]);

        foreach ($numerosPermitidos as $num) {
            if ($fromNorm !== '' && $fromNorm === (preg_replace('/[^0-9]/', '', $num) ?? '')) {
                /* Número coincide — obtener el primer admin de WP */
                $admins = get_users(['role' => 'administrator', 'number' => 1, 'fields' => 'ID']);
                if (!empty($admins)) {
                    return (int)$admins[0];
                }
            }
        }

        return null;
    }

    /**
     * Rate-limit por JID: máx 20 peticiones en ventana de 5 minutos.
     * Usa transients de WP (no requiere Redis ni tabla extra).
     */
    private function excedeLimite(string $jid): bool
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
}

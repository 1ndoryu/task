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

        /* Detectar formato nuevo: sin "type", con "Text" y "Chat" */
        $esFormatoNuevo = $tipo === '' && isset($evento['Text'], $evento['Chat']);

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

        $isGroup = str_contains($from, '@g.us');
        if ($isGroup || $text === '' || $from === '') {
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
            $resultado = (new AgentChatProcessor())->procesar($adminId, $sessionId, $text, 'whatsapp');

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
     */
    private function resolverAdminDesdeRemitente(string $from): ?int
    {
        $fromNorm = preg_replace('/[^0-9]/', '', $from) ?? '';
        $esLid    = str_contains($from, '@lid');

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

        /* Comparación por dígitos de teléfono vs números autorizados en .env */
        $env = function (string $k): string {
            return (string)($_ENV[$k] ?? getenv($k) ?: '');
        };
        $numerosPermitidos = array_filter([
            $env('WHATSAPP'),
            $env('WHATSAPP_SEGUNDO_NUMERO'),
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

<?php

namespace App\Services;

/* [109B] Procesa eventos POST de wacli sync --webhook.
 * wacli envía NDJSON: una línea JSON por evento con X-Wacli-Signature: sha256=HMAC.
 * Solo se procesan mensajes recibidos del número autorizado (WHATSAPP o WHATSAPP-SEGUNDO-NUMERO).
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

        $adminId = $this->obtenerAdminUserId();
        if (!$adminId) {
            return;
        }

        /* @lid JIDs son identificadores internos de WhatsApp — no se pueden convertir a
         * número de teléfono. Como el número wacli es privado, solo el admin lo conoce,
         * así que se permite cualquier remitente @lid no-grupo. Para @s.whatsapp.net sí
         * verificamos el número de forma explícita. */
        $esLid = str_contains($from, '@lid');
        if (!$esLid && !$this->esNúmeroAutorizado($from)) {
            return;
        }

        /* session_id: dígitos del JID (únicos por contacto) */
        $fromNum   = preg_replace('/[^0-9]/', '', $from) ?? '';
        $sessionId = 'whatsapp_' . $fromNum;

        /* Para enviar: @lid JIDs se pasan tal cual a wacli (protocolo nativo);
         * @s.whatsapp.net se usa como +dígitos */
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

    private function esNúmeroAutorizado(string $from): bool
    {
        $env = function (string $k): string {
            return (string)($_ENV[$k] ?? getenv($k) ?: '');
        };
        $numerosPermitidos = array_filter([
            $env('WHATSAPP'),
            $env('WHATSAPP_SEGUNDO_NUMERO'),
            $env('WHATSAPP_AGENT_TO'),
        ]);

        $fromNorm = preg_replace('/[^0-9]/', '', $from) ?? '';

        foreach ($numerosPermitidos as $num) {
            if ($fromNorm === preg_replace('/[^0-9]/', '', $num)) {
                return true;
            }
        }
        return false;
    }

    private function obtenerAdminUserId(): ?int
    {
        $admins = get_users(['role' => 'administrator', 'number' => 1, 'fields' => 'ID']);
        return !empty($admins) ? (int)$admins[0] : null;
    }
}

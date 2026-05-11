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
     * No lanza excepciones — registra errores y continúa.
     */
    public function procesarEvento(array $evento): void
    {
        $tipo = (string)($evento['type'] ?? '');

        /* Log para capturar el formato real de wacli (remover tras primera prueba exitosa) */
        error_log('[WhatsApp] evento tipo=' . $tipo . ' raw=' . json_encode($evento));

        /* Solo mensajes entrantes */
        if ($tipo !== 'message.received') {
            return;
        }

        /* Soportar ambos formatos: {message:{from:...}} y {from:...} directo */
        $msg  = $evento['message'] ?? $evento;
        $from = (string)($msg['from'] ?? $evento['from'] ?? '');
        $text = trim((string)($msg['text']['body'] ?? $msg['body'] ?? $evento['body'] ?? ''));
        $isGroup = str_contains($from, '@g.us');

        if ($isGroup || $text === '' || $from === '') {
            return;
        }

        /* Verificar que el remitente es un número autorizado */
        $adminId = $this->obtenerAdminUserId();
        if (!$this->esNúmeroAutorizado($from) || !$adminId) {
            return;
        }

        /* Normalizar número para session_id (solo dígitos) */
        $fromNum   = preg_replace('/[^0-9]/', '', $from) ?? '';
        $sessionId = 'whatsapp_' . $fromNum;

        try {
            $resultado = (new AgentChatProcessor())->procesar($adminId, $sessionId, $text, 'whatsapp');

            /* Enviar respuesta por WhatsApp */
            if (!empty($resultado['respuesta'])) {
                (new WacliService())->enviarTexto('+' . $fromNum, $resultado['respuesta']);
            }
        } catch (\Throwable $e) {
            error_log('[WhatsApp] Error procesando mensaje entrante de ' . $fromNum . ': ' . $e->getMessage());
            /* Intentar notificar al usuario del error por WhatsApp */
            try {
                (new WacliService())->enviarTexto('+' . $fromNum, 'Error interno. Intenta de nuevo en unos segundos.');
            } catch (\Throwable) {
                /* Silenciar: no podemos hacer nada más */
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

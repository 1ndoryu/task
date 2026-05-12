<?php

namespace App\Services;

/**
 * [125A-10] Alertas operativas del flujo WhatsApp multiusuario.
 * Separado del manager para mantener health checks, notificación y ejecución
 * wacli en fronteras pequeñas y auditables.
 */
class WacliAlertService
{
    private \wpdb $wpdb;
    private string $tablaCuentas;
    private WacliService $wacli;

    public function __construct()
    {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->tablaCuentas = $wpdb->prefix . 'glory_whatsapp_accounts';
        $this->wacli = new WacliService();
    }

    public function notificarAdminFallo(object $cuenta): void
    {
        $asunto  = 'Chatbot WhatsApp deshabilitado';
        $mensaje = "Cuenta: {$cuenta->account_name}\n"
                 . "Usuario ID: {$cuenta->user_id}\n"
                 . "Teléfono: {$cuenta->phone_primary}\n"
                 . "El health check detectó que el store está corrupto o el sync detenido.\n"
                 . "Se deshabilitó automáticamente. Fecha: " . current_time('mysql');

        $this->notificarWhatsapp($mensaje);
        $adminEmail = get_option('admin_email');
        if ($adminEmail) {
            wp_mail($adminEmail, $asunto, $mensaje);
        }
    }

    private function notificarWhatsapp(string $mensaje): void
    {
        try {
            $adminCuenta = $this->wpdb->get_row(
                "SELECT wa.user_id, wa.jid_primary
                 FROM {$this->tablaCuentas} wa
                 INNER JOIN {$this->wpdb->users} u ON u.ID = wa.user_id
                 INNER JOIN {$this->wpdb->usermeta} um ON um.user_id = u.ID
                 WHERE um.meta_key = 'wp_capabilities'
                   AND um.meta_value LIKE '%administrator%'
                   AND wa.jid_primary IS NOT NULL
                 LIMIT 1"
            );
            if ($adminCuenta && !empty($adminCuenta->jid_primary)) {
                $this->wacli->enviarTextoComoUsuario((int)$adminCuenta->user_id, $adminCuenta->jid_primary, $mensaje);
                error_log('[WacliAlert] Notificación WhatsApp enviada a admin user ' . $adminCuenta->user_id);
            }
        } catch (\Throwable $e) {
            error_log('[WacliAlert] Error notificando admin por WhatsApp: ' . $e->getMessage());
        }
    }
}
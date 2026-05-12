<?php

namespace App\Repository\WhatsApp;

class WhatsAppAccountRepository
{
    private \wpdb $wpdb;
    private string $tabla;

    public function __construct()
    {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->tabla = $wpdb->prefix . 'glory_whatsapp_accounts';
    }

    public function obtenerEstadoUsuario(int $userId): ?object
    {
        $row = $this->wpdb->get_row($this->wpdb->prepare(
            "SELECT phone_primary, authenticated, enabled, blocked,
                    daily_msg_count, daily_msg_date, health_status, last_sync
             FROM {$this->tabla}
             WHERE user_id = %d",
            $userId
        ));
        return $row ?: null;
    }

    public function obtenerRecipientUsuario(int $userId): ?object
    {
        $row = $this->wpdb->get_row($this->wpdb->prepare(
            "SELECT phone_primary, jid_primary
             FROM {$this->tabla}
             WHERE user_id = %d",
            $userId
        ));
        return $row ?: null;
    }

    public function obtenerUsoDiario(int $userId): ?object
    {
        $row = $this->wpdb->get_row($this->wpdb->prepare(
            "SELECT daily_msg_count, daily_msg_date
             FROM {$this->tabla}
             WHERE user_id = %d",
            $userId
        ));
        return $row ?: null;
    }
}
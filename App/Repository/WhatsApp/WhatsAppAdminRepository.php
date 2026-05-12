<?php

namespace App\Repository\WhatsApp;

class WhatsAppAdminRepository
{
    public function listarCuentas(string $estado, int $pagina, int $porPagina): array
    {
        global $wpdb;

        $tabla = $wpdb->prefix . 'glory_whatsapp_accounts';
        $offset = ($pagina - 1) * $porPagina;
        [$where, $whereArgs] = $this->filtroEstado($estado);

        $baseArgs = array_merge([1], $whereArgs);
        $total = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$tabla} a WHERE 1 = %d {$where}",
            $baseArgs
        ));

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT a.*, u.display_name, u.user_email
             FROM {$tabla} a
             LEFT JOIN {$wpdb->users} u ON u.ID = a.user_id
             WHERE 1 = %d {$where}
             ORDER BY a.created_at DESC
             LIMIT %d OFFSET %d",
            array_merge($baseArgs, [$porPagina, $offset])
        ));

        return [
            'total' => $total,
            'rows'  => $rows ?: [],
        ];
    }

    public function obtenerCuenta(int $userId): ?object
    {
        global $wpdb;

        $tabla = $wpdb->prefix . 'glory_whatsapp_accounts';
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT a.*, u.display_name, u.user_email
             FROM {$tabla} a
             LEFT JOIN {$wpdb->users} u ON u.ID = a.user_id
             WHERE a.user_id = %d",
            $userId
        ));

        return $row ?: null;
    }

    public function existeCuenta(int $userId): bool
    {
        global $wpdb;

        $tabla = $wpdb->prefix . 'glory_whatsapp_accounts';
        return (bool) $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$tabla} WHERE user_id = %d",
            $userId
        ));
    }

    public function actualizarEnabled(int $userId, bool $enabled): bool
    {
        global $wpdb;

        $tabla = $wpdb->prefix . 'glory_whatsapp_accounts';
        $updated = $wpdb->update(
            $tabla,
            ['enabled' => $enabled ? 1 : 0],
            ['user_id' => $userId],
            ['%d'],
            ['%d']
        );

        return $updated !== false;
    }

    public function obtenerHealthDashboard(): array
    {
        global $wpdb;

        $tabla = $wpdb->prefix . 'glory_whatsapp_accounts';
        $mensajesHoy = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(daily_msg_count), 0) FROM {$tabla} WHERE daily_msg_date = %s",
            current_time('Y-m-d')
        ));

        $recientes = $wpdb->get_results($wpdb->prepare(
            "SELECT user_id, health_status, last_health_check
             FROM {$tabla}
             WHERE last_health_check IS NOT NULL
             ORDER BY last_health_check DESC
             LIMIT %d",
            10
        ));

        return [
            'total'           => $this->contar($tabla),
            'activas'         => $this->contar($tabla, 'AND enabled = %d AND authenticated = %d', [1, 1]),
            'saludables'      => $this->contar($tabla, 'AND health_status = %s', ['healthy']),
            'degradadas'      => $this->contar($tabla, 'AND health_status = %s', ['degraded']),
            'muertas'         => $this->contar($tabla, 'AND health_status = %s', ['dead']),
            'sinSyncReciente' => $this->contar($tabla, 'AND (last_sync IS NULL OR last_sync < DATE_SUB(NOW(), INTERVAL 1 HOUR))'),
            'mensajesHoy'     => $mensajesHoy,
            'ultimosChequeos' => $recientes ?: [],
        ];
    }

    private function contar(string $tabla, string $where = '', array $args = []): int
    {
        global $wpdb;

        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$tabla} WHERE 1 = %d {$where}",
            array_merge([1], $args)
        ));
    }

    private function filtroEstado(string $estado): array
    {
        return match ($estado) {
            'activas' => ['AND a.enabled = %d AND a.authenticated = %d', [1, 1]],
            'inactivas' => ['AND (a.enabled = %d OR a.authenticated = %d)', [0, 0]],
            'muertas' => ['AND a.health_status = %s', ['dead']],
            default => ['', []],
        };
    }
}
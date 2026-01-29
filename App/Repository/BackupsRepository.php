<?php

namespace App\Repository;

use App\Database\Schema;

class BackupsRepository
{
    private int $userId;
    private string $table;

    public function __construct(int $userId)
    {
        $this->userId = $userId;
        $this->table = Schema::getTableName('backups');
    }

    /**
     * Obtiene el historial de backups (metadata)
     */
    public function getAll(): array
    {
        global $wpdb;

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, hash, size_bytes, device, trigger_source, created_at 
                 FROM {$this->table} 
                 WHERE user_id = %d 
                 ORDER BY created_at DESC",
                $this->userId
            ),
            ARRAY_A
        );

        return $results ?: [];
    }

    /**
     * Obtiene un backup completo por ID
     */
    public function getById(int $id): ?array
    {
        global $wpdb;

        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$this->table} WHERE id = %d AND user_id = %d",
                $id,
                $this->userId
            ),
            ARRAY_A
        );

        return $result ?: null;
    }

    /**
     * Crea un nuevo backup
     */
    public function create(array $data, string $trigger = 'sync'): int
    {
        global $wpdb;

        /* Asegurar que los datos sean JSON */
        $json = wp_json_encode($data);

        /* Comprimir y codificar */
        $gz = gzencode($json, 9);
        $base64 = base64_encode($gz);

        $hash = md5($json);
        $size = strlen($base64);

        $inserted = $wpdb->insert(
            $this->table,
            [
                'user_id' => $this->userId,
                'hash' => $hash,
                'size_bytes' => $size,
                'device' => 'web', /* TODO: Obtener del User-Agent si es posible */
                'trigger_source' => $trigger,
                'data' => $base64,
                'created_at' => current_time('mysql')
            ],
            ['%d', '%s', '%d', '%s', '%s', '%s', '%s']
        );

        if ($inserted) {
            $this->cleanupOldBackups();
            return $wpdb->insert_id;
        }

        return 0;
    }

    /**
     * Mantiene solo los últimos N backups para ahorrar espacio
     */
    private function cleanupOldBackups(int $keep = 50): void
    {
        global $wpdb;

        /* Obtener IDs de los backups que sobran */
        $ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT id FROM {$this->table} 
                 WHERE user_id = %d 
                 ORDER BY created_at DESC 
                 LIMIT %d, 1000",
                $this->userId,
                $keep
            )
        );

        if (!empty($ids)) {
            $idsList = implode(',', array_map('intval', $ids));
            $wpdb->query("DELETE FROM {$this->table} WHERE id IN ($idsList)");
        }
    }
}

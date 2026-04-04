<?php

namespace App\Repository;

use App\Database\Schema;

class BackupsRepository
{
    private const MAX_BACKUPS = 50;
    private const RETENCION_DIAS = 30;
    private const INTERVALO_MINUTOS = 30;
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
                "SELECT id, user_id, hash, size_bytes, device, trigger_source, data, created_at FROM {$this->table} WHERE id = %d AND user_id = %d",
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

        /* Ajuste: limitamos frecuencia para evitar exceso de copias. */
        if (!$this->puedeCrearBackup()) {
            return 0;
        }

        /* Asegurar que los datos sean JSON */
        // sentinel-disable-next-line json-sin-limite-bd — backup feature: almacenar todo el dataset es el proposito
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
    private function cleanupOldBackups(int $keep = self::MAX_BACKUPS): void
    {
        global $wpdb;

        /* Eliminamos backups fuera de la ventana de retención. */
        $limite = date('Y-m-d H:i:s', current_time('timestamp') - (self::RETENCION_DIAS * DAY_IN_SECONDS));
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$this->table} WHERE user_id = %d AND created_at < %s",
                $this->userId,
                $limite
            )
        );

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
            $placeholders = implode(',', array_fill(0, count($ids), '%d'));
            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$this->table} WHERE id IN ($placeholders)",
                ...$ids
            ));
        }
    }

    /**
     * Verifica si se puede crear un backup segun la frecuencia definida.
     */
    private function puedeCrearBackup(): bool
    {
        global $wpdb;

        $ultimo = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT created_at FROM {$this->table} WHERE user_id = %d ORDER BY created_at DESC LIMIT 1",
                $this->userId
            )
        );

        if (!$ultimo) return true;

        $ultimoTimestamp = strtotime($ultimo);
        if (!$ultimoTimestamp) return true;

        $ahora = current_time('timestamp');
        $intervalo = self::INTERVALO_MINUTOS * MINUTE_IN_SECONDS;

        return ($ahora - $ultimoTimestamp) >= $intervalo;
    }

    /**
     * Elimina un backup por ID.
     */
    public function deleteById(int $id): bool
    {
        global $wpdb;

        $deleted = $wpdb->delete(
            $this->table,
            [
                'id' => $id,
                'user_id' => $this->userId
            ],
            ['%d', '%d']
        );

        return $deleted !== false && $deleted > 0;
    }
}

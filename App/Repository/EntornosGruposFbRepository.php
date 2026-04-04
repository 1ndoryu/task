<?php

/**
 * [034A-14] Repositorio de Entornos de Grupos Facebook
 *
 * CRUD para entornos y overrides por grupo.
 * Cada entorno es una "vista filtrada" del mismo set de grupos,
 * con categoría, importancia y oculto distintos por grupo.
 *
 * @package App\Repository
 */

namespace App\Repository;

use App\Database\Schema;

class EntornosGruposFbRepository
{
    private int $userId;

    public function __construct(int $userId)
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('ID de usuario invalido');
        }
        $this->userId = $userId;
    }

    /* ── Entornos CRUD ── */

    public function listarEntornos(): array
    {
        global $wpdb;
        $table = Schema::getTableName('entornos_grupos_fb');
        Schema::ensureTableExists('entornos_grupos_fb');

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                // sentinel-disable-next-line repository-sin-whitelist-columnas — todas las columnas se usan via formatearEntorno
                "SELECT * FROM $table WHERE user_id = %d ORDER BY orden ASC, created_at ASC",
                $this->userId
            ),
            'ARRAY_A'
        );

        return array_map([$this, 'formatearEntorno'], $rows ?: []);
    }

    public function obtenerEntorno(int $id): ?array
    {
        global $wpdb;
        $table = Schema::getTableName('entornos_grupos_fb');

        $row = $wpdb->get_row(
            $wpdb->prepare(
                // sentinel-disable-next-line repository-sin-whitelist-columnas — todas las columnas se usan via formatearEntorno
                "SELECT * FROM $table WHERE id = %d AND user_id = %d",
                $id,
                $this->userId
            ),
            'ARRAY_A'
        );

        return $row ? $this->formatearEntorno($row) : null;
    }

    public function crearEntorno(array $datos): ?array
    {
        global $wpdb;
        $table = Schema::getTableName('entornos_grupos_fb');
        Schema::ensureTableExists('entornos_grupos_fb');

        $nombre = sanitize_text_field(trim($datos['nombre'] ?? ''));
        if (empty($nombre)) {
            return null;
        }

        $inserted = $wpdb->insert($table, [
            'user_id' => $this->userId,
            'nombre'  => mb_substr($nombre, 0, 100),
            'icono'   => sanitize_text_field($datos['icono'] ?? 'layers'),
            'color'   => sanitize_hex_color($datos['color'] ?? '#6366f1') ?: '#6366f1',
            'ai_prompt' => isset($datos['aiPrompt']) ? sanitize_textarea_field($datos['aiPrompt']) : null,
            'orden'   => (int)($datos['orden'] ?? 0),
        ], ['%d', '%s', '%s', '%s', '%s', '%d']);

        if (!$inserted) {
            return null;
        }

        return $this->obtenerEntorno((int)$wpdb->insert_id);
    }

    public function actualizarEntorno(int $id, array $datos): ?array
    {
        global $wpdb;
        $table = Schema::getTableName('entornos_grupos_fb');

        $campos = [];
        $formatos = [];

        if (isset($datos['nombre'])) {
            $campos['nombre'] = sanitize_text_field(mb_substr(trim($datos['nombre']), 0, 100));
            $formatos[] = '%s';
        }
        if (isset($datos['icono'])) {
            $campos['icono'] = sanitize_text_field($datos['icono']);
            $formatos[] = '%s';
        }
        if (isset($datos['color'])) {
            $campos['color'] = sanitize_hex_color($datos['color']) ?: '#6366f1';
            $formatos[] = '%s';
        }
        if (array_key_exists('aiPrompt', $datos)) {
            $campos['ai_prompt'] = $datos['aiPrompt'] !== null
                ? sanitize_textarea_field($datos['aiPrompt'])
                : null;
            $formatos[] = '%s';
        }
        if (isset($datos['orden'])) {
            $campos['orden'] = (int)$datos['orden'];
            $formatos[] = '%d';
        }

        if (empty($campos)) {
            return $this->obtenerEntorno($id);
        }

        $updated = $wpdb->update($table, $campos, [
            'id'      => $id,
            'user_id' => $this->userId,
        ], $formatos, ['%d', '%d']);

        if ($updated === false) {
            error_log('[034A-14] Fallo actualizarEntorno id=' . $id);
        }

        return $this->obtenerEntorno($id);
    }

    public function eliminarEntorno(int $id): bool
    {
        global $wpdb;
        $table = Schema::getTableName('entornos_grupos_fb');
        $tableOverrides = Schema::getTableName('grupos_fb_entorno_overrides');

        /* Primero eliminar overrides asociados */
        $deletedOv = $wpdb->delete($tableOverrides, ['entorno_id' => $id], ['%d']);
        if ($deletedOv === false) {
            error_log('[034A-14] Fallo al borrar overrides entorno_id=' . $id);
        }

        /* Si este entorno estaba activo, desactivarlo */
        $deactivated = $wpdb->update($table, ['activo' => 0], [
            'id'      => $id,
            'user_id' => $this->userId,
        ]);
        if ($deactivated === false) {
            error_log('[034A-14] Fallo al desactivar entorno id=' . $id);
        }

        $deleted = $wpdb->delete($table, [
            'id'      => $id,
            'user_id' => $this->userId,
        ], ['%d', '%d']);

        return $deleted !== false;
    }

    /* ── Activar/desactivar entorno ── */

    public function activarEntorno(?int $entornoId): bool
    {
        global $wpdb;
        $table = Schema::getTableName('entornos_grupos_fb');

        /* Desactivar todos */
        $resetResult = $wpdb->update(
            $table,
            ['activo' => 0],
            ['user_id' => $this->userId],
            ['%d'],
            ['%d']
        );
        if ($resetResult === false) {
            error_log('[034A-14] Fallo al desactivar entornos userId=' . $this->userId);
        }

        /* Activar el elegido (null = ninguno = vista base) */
        if ($entornoId !== null) {
            $activateResult = $wpdb->update(
                $table,
                ['activo' => 1],
                ['id' => $entornoId, 'user_id' => $this->userId],
                ['%d'],
                ['%d', '%d']
            );
            if ($activateResult === false) {
                error_log('[034A-14] Fallo al activar entorno id=' . $entornoId);
            }
        }

        return true;
    }

    public function obtenerEntornoActivo(): ?array
    {
        global $wpdb;
        $table = Schema::getTableName('entornos_grupos_fb');

        if (!Schema::tableExists('entornos_grupos_fb')) {
            return null;
        }

        $row = $wpdb->get_row(
            $wpdb->prepare(
                // sentinel-disable-next-line repository-sin-whitelist-columnas — todas las columnas se usan via formatearEntorno
                "SELECT * FROM $table WHERE user_id = %d AND activo = 1 LIMIT 1",
                $this->userId
            ),
            'ARRAY_A'
        );

        return $row ? $this->formatearEntorno($row) : null;
    }

    /* ── Overrides por entorno ── */

    /**
     * Obtiene los overrides de un entorno para todos los grupos.
     * @return array Mapa grupo_id => {categoria, importancia, oculto}
     */
    public function obtenerOverrides(int $entornoId): array
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb_entorno_overrides');

        if (!Schema::tableExists('grupos_fb_entorno_overrides')) {
            return [];
        }

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                // sentinel-disable-next-line repository-sin-whitelist-columnas — todas las columnas se usan en el mapa de overrides
                "SELECT * FROM $table WHERE entorno_id = %d",
                $entornoId
            ),
            'ARRAY_A'
        );

        $mapa = [];
        foreach ($rows ?: [] as $row) {
            $mapa[(int)$row['grupo_id']] = [
                'categoria'   => $row['categoria'],
                'importancia' => $row['importancia'] !== null ? (int)$row['importancia'] : null,
                'oculto'      => $row['oculto'] !== null ? (int)$row['oculto'] : null,
            ];
        }
        return $mapa;
    }

    /**
     * Guarda o actualiza un override de grupo en un entorno.
     * Usa upsert atómico para evitar race conditions.
     */
    public function guardarOverride(int $entornoId, int $grupoId, array $datos): bool
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb_entorno_overrides');
        Schema::ensureTableExists('grupos_fb_entorno_overrides');

        $categoria = array_key_exists('categoria', $datos)
            ? ($datos['categoria'] !== null ? sanitize_text_field($datos['categoria']) : null)
            : null;
        $importancia = isset($datos['importancia']) ? max(0, min(5, (int)$datos['importancia'])) : null;
        $oculto = isset($datos['oculto']) ? ((int)$datos['oculto'] ? 1 : 0) : null;

        $result = $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO $table (grupo_id, entorno_id, categoria, importancia, oculto)
                VALUES (%d, %d, %s, %d, %d)
                ON DUPLICATE KEY UPDATE
                    categoria = VALUES(categoria),
                    importancia = VALUES(importancia),
                    oculto = VALUES(oculto)",
                $grupoId,
                $entornoId,
                $categoria,
                $importancia ?? -1,
                $oculto ?? -1
            )
        );

        return $result !== false;
    }

    /**
     * Aplica overrides de un entorno a una lista de grupos.
     * Retorna los grupos con valores efectivos (override > base).
     */
    public function aplicarOverrides(array $grupos, int $entornoId): array
    {
        $overrides = $this->obtenerOverrides($entornoId);
        if (empty($overrides)) {
            return $grupos;
        }

        return array_map(function (array $grupo) use ($overrides) {
            $grupoId = (int)$grupo['id'];
            if (!isset($overrides[$grupoId])) {
                return $grupo;
            }
            $ov = $overrides[$grupoId];
            if ($ov['categoria'] !== null) {
                $grupo['categoria'] = $ov['categoria'];
            }
            if ($ov['importancia'] !== null && $ov['importancia'] >= 0) {
                $grupo['importancia'] = $ov['importancia'];
            }
            if ($ov['oculto'] !== null && $ov['oculto'] >= 0) {
                $grupo['oculto'] = $ov['oculto'];
            }
            return $grupo;
        }, $grupos);
    }

    /* ── Config por usuario ── */

    public function obtenerConfig(string $clave, string $default = ''): string
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb_config');

        if (!Schema::tableExists('grupos_fb_config')) {
            return $default;
        }

        $valor = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT valor FROM $table WHERE user_id = %d AND clave = %s",
                $this->userId,
                $clave
            )
        );

        return $valor !== null ? $valor : $default;
    }

    public function guardarConfig(string $clave, string $valor): bool
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb_config');
        Schema::ensureTableExists('grupos_fb_config');

        $result = $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO $table (user_id, clave, valor)
                VALUES (%d, %s, %s)
                ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
                $this->userId,
                sanitize_text_field($clave),
                sanitize_textarea_field($valor)
            )
        );

        return $result !== false;
    }

    /* ── Formateo ── */

    private function formatearEntorno(array $row): array
    {
        return [
            'id'        => (int)$row['id'],
            'nombre'    => $row['nombre'],
            'icono'     => $row['icono'],
            'color'     => $row['color'],
            'activo'    => (bool)$row['activo'],
            'aiPrompt'  => $row['ai_prompt'] ?? null,
            'orden'     => (int)$row['orden'],
            'createdAt' => $row['created_at'],
        ];
    }
}

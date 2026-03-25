<?php

/**
 * [253A-11] Repositorio de Grupos de Facebook
 *
 * CRUD para grupos detectados por la extensión fb-group-manager.
 * Soporta upsert atómico (UNIQUE KEY user_fb_group) para sync desde extensión.
 *
 * @package App\Repository
 */

namespace App\Repository;

use App\Database\Schema;

class GruposFbRepository
{
    private int $userId;

    public function __construct(int $userId)
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('ID de usuario invalido');
        }
        $this->userId = $userId;
    }

    /**
     * Lista todos los grupos del usuario (no eliminados)
     *
     * @param array $filtros Filtros opcionales: categoria, oculto, busqueda, importancia
     * @return array
     */
    public function listar(array $filtros = []): array
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb');

        $where = ["user_id = %d", "deleted_at IS NULL"];
        $params = [$this->userId];

        if (isset($filtros['oculto'])) {
            $where[] = "oculto = %d";
            $params[] = (int)$filtros['oculto'];
        }

        if (!empty($filtros['categoria'])) {
            $where[] = "categoria = %s";
            $params[] = $filtros['categoria'];
        }

        if (isset($filtros['importancia']) && $filtros['importancia'] !== '') {
            $where[] = "importancia = %d";
            $params[] = (int)$filtros['importancia'];
        }

        if (!empty($filtros['busqueda'])) {
            $where[] = "nombre LIKE %s";
            $params[] = '%' . $wpdb->esc_like($filtros['busqueda']) . '%';
        }

        $whereStr = implode(' AND ', $where);

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $table WHERE $whereStr ORDER BY importancia DESC, nombre ASC",
                ...$params
            ),
            'ARRAY_A'
        );

        return array_map([$this, 'formatearGrupo'], $rows ?: []);
    }

    /**
     * Obtiene un grupo por su ID interno
     */
    public function obtenerPorId(int $id): ?array
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb');

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM $table WHERE id = %d AND user_id = %d AND deleted_at IS NULL",
                $id,
                $this->userId
            ),
            'ARRAY_A'
        );

        return $row ? $this->formatearGrupo($row) : null;
    }

    /**
     * Bulk upsert de grupos desde la extensión.
     * Usa INSERT ... ON DUPLICATE KEY UPDATE para atomicidad.
     *
     * @param array $grupos Lista de grupos con formato de la extensión (GroupData)
     * @return array Resultado con conteo de insertados/actualizados
     */
    public function syncDesdeExtension(array $grupos): array
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb');
        $insertados = 0;
        $actualizados = 0;
        $errores = 0;
        $now = current_time('mysql');

        foreach ($grupos as $grupo) {
            $fbGroupId = sanitize_text_field($grupo['id'] ?? '');
            if (empty($fbGroupId)) {
                $errores++;
                continue;
            }

            $datosExtra = [];
            foreach (['friendsInGroup', 'postsPerDay', 'tags', 'lastVisit', 'addedAt'] as $campo) {
                if (isset($grupo[$campo])) {
                    $datosExtra[$campo] = $grupo[$campo];
                }
            }

            $nombre = sanitize_text_field(mb_substr($grupo['name'] ?? '', 0, 500));
            $url = esc_url_raw($grupo['url'] ?? '');
            $tipo = in_array($grupo['type'] ?? '', ['public', 'private', 'unknown']) ? $grupo['type'] : 'unknown';
            $cantidadMiembros = sanitize_text_field(mb_substr($grupo['memberCount'] ?? '', 0, 100));
            $imagenUrl = esc_url_raw(mb_substr($grupo['imageUrl'] ?? '', 0, 1000));
            $fuente = sanitize_text_field($grupo['source'] ?? 'link-scan');
            $categoria = !empty($grupo['category']) ? sanitize_text_field($grupo['category']) : null;
            $importancia = max(0, min(5, (int)($grupo['importance'] ?? 0)));
            $notas = sanitize_textarea_field($grupo['notes'] ?? '');
            $oculto = !empty($grupo['hidden']) ? 1 : 0;

            /* Upsert atómico: INSERT si no existe, UPDATE si ya existe */
            $resultado = $wpdb->query(
                $wpdb->prepare(
                    "INSERT INTO $table
                        (user_id, fb_group_id, nombre, url, tipo, cantidad_miembros, imagen_url, fuente, categoria, importancia, notas, oculto, datos_extra, fecha_deteccion, ultima_deteccion)
                    VALUES (%d, %s, %s, %s, %s, %s, %s, %s, %s, %d, %s, %d, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        nombre = VALUES(nombre),
                        url = VALUES(url),
                        tipo = VALUES(tipo),
                        cantidad_miembros = VALUES(cantidad_miembros),
                        imagen_url = CASE WHEN VALUES(imagen_url) != '' THEN VALUES(imagen_url) ELSE imagen_url END,
                        fuente = VALUES(fuente),
                        ultima_deteccion = VALUES(ultima_deteccion),
                        datos_extra = VALUES(datos_extra),
                        deleted_at = NULL",
                    $this->userId,
                    $fbGroupId,
                    $nombre,
                    $url,
                    $tipo,
                    $cantidadMiembros,
                    $imagenUrl,
                    $fuente,
                    $categoria,
                    $importancia,
                    $notas,
                    $oculto,
                    wp_json_encode($datosExtra),
                    $now,
                    $now
                )
            );

            if ($resultado === false) {
                $errores++;
                error_log("[GruposFb] Error upsert grupo $fbGroupId: " . $wpdb->last_error);
            } elseif ($wpdb->rows_affected === 1) {
                $insertados++;
            } else {
                $actualizados++;
            }
        }

        return [
            'insertados' => $insertados,
            'actualizados' => $actualizados,
            'errores' => $errores,
            'total' => count($grupos)
        ];
    }

    /**
     * Actualiza campos editables de un grupo (categoría, importancia, oculto, notas)
     */
    public function actualizar(int $id, array $datos): bool
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb');

        $camposPermitidos = [];
        $valores = [];

        if (array_key_exists('categoria', $datos)) {
            $camposPermitidos[] = 'categoria = %s';
            $valores[] = $datos['categoria'] !== null ? sanitize_text_field($datos['categoria']) : null;
        }

        if (array_key_exists('importancia', $datos)) {
            $camposPermitidos[] = 'importancia = %d';
            $valores[] = max(0, min(5, (int)$datos['importancia']));
        }

        if (array_key_exists('oculto', $datos)) {
            $camposPermitidos[] = 'oculto = %d';
            $valores[] = !empty($datos['oculto']) ? 1 : 0;
        }

        if (array_key_exists('notas', $datos)) {
            $camposPermitidos[] = 'notas = %s';
            $valores[] = sanitize_textarea_field($datos['notas']);
        }

        if (array_key_exists('ultimaPublicacion', $datos)) {
            $camposPermitidos[] = 'ultima_publicacion = %s';
            $valores[] = sanitize_text_field($datos['ultimaPublicacion']);
        }

        if (empty($camposPermitidos)) {
            return false;
        }

        $setClause = implode(', ', $camposPermitidos);
        $valores[] = $id;
        $valores[] = $this->userId;

        $resultado = $wpdb->query(
            $wpdb->prepare(
                "UPDATE $table SET $setClause WHERE id = %d AND user_id = %d AND deleted_at IS NULL",
                ...$valores
            )
        );

        return $resultado !== false;
    }

    /**
     * Soft delete de un grupo
     */
    public function eliminar(int $id): bool
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb');

        $resultado = $wpdb->query(
            $wpdb->prepare(
                "UPDATE $table SET deleted_at = %s WHERE id = %d AND user_id = %d AND deleted_at IS NULL",
                current_time('mysql'),
                $id,
                $this->userId
            )
        );

        return $resultado !== false && $wpdb->rows_affected > 0;
    }

    /**
     * Marcar grupo como publicado (actualiza ultima_publicacion a ahora)
     */
    public function marcarPublicado(int $id): bool
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb');

        $resultado = $wpdb->query(
            $wpdb->prepare(
                "UPDATE $table SET ultima_publicacion = %s WHERE id = %d AND user_id = %d AND deleted_at IS NULL",
                current_time('mysql'),
                $id,
                $this->userId
            )
        );

        return $resultado !== false && $wpdb->rows_affected > 0;
    }

    /**
     * Contar grupos por estado
     */
    public function contarEstadisticas(): array
    {
        global $wpdb;
        $table = Schema::getTableName('grupos_fb');

        $total = (int)$wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table WHERE user_id = %d AND deleted_at IS NULL",
                $this->userId
            )
        );

        $ocultos = (int)$wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table WHERE user_id = %d AND deleted_at IS NULL AND oculto = 1",
                $this->userId
            )
        );

        $hoyInicio = current_time('Y-m-d') . ' 00:00:00';
        $publicadosHoy = (int)$wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table WHERE user_id = %d AND deleted_at IS NULL AND ultima_publicacion >= %s",
                $this->userId,
                $hoyInicio
            )
        );

        return [
            'total' => $total,
            'visibles' => $total - $ocultos,
            'ocultos' => $ocultos,
            'publicadosHoy' => $publicadosHoy
        ];
    }

    /**
     * Formatea un row de BD al formato de respuesta API
     */
    private function formatearGrupo(array $row): array
    {
        $datosExtra = json_decode($row['datos_extra'] ?? '{}', true) ?: [];

        return [
            'id' => (int)$row['id'],
            'fbGroupId' => $row['fb_group_id'],
            'nombre' => $row['nombre'],
            'url' => $row['url'],
            'tipo' => $row['tipo'],
            'cantidadMiembros' => $row['cantidad_miembros'],
            'imagenUrl' => $row['imagen_url'],
            'fuente' => $row['fuente'],
            'categoria' => $row['categoria'],
            'importancia' => (int)$row['importancia'],
            'notas' => $row['notas'] ?? '',
            'oculto' => (bool)$row['oculto'],
            'ultimaPublicacion' => $row['ultima_publicacion'],
            'fechaDeteccion' => $row['fecha_deteccion'],
            'ultimaDeteccion' => $row['ultima_deteccion'],
            'datosExtra' => $datosExtra
        ];
    }
}

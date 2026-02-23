<?php

/**
 * Repositorio de Proyectos
 *
 * Maneja la persistencia de proyectos en la tabla wp_glory_proyectos.
 * Soporta migración desde user_meta y cifrado E2E.
 *
 * @package App\Repository
 */

namespace App\Repository;

use App\Database\Schema;
use App\Repository\CifradoTrait;

class ProyectosRepository
{
    use CifradoTrait;

    private const META_PROYECTOS = '_glory_dashboard_proyectos';

    public function __construct(int $userId)
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('ID de usuario invalido');
        }
        $this->userId = $userId;
        $this->inicializarCifrado();
    }

    /**
     * Obtiene los proyectos del usuario (SQL con fallback)
     */
    public function getAll(): array
    {
        global $wpdb;
        $table = Schema::getTableName('proyectos');

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT data, id_local FROM $table WHERE user_id = %d AND deleted_at IS NULL",
            $this->userId
        ), 'ARRAY_A');

        if (!empty($rows)) {
            $proyectos = array_map(function ($row) {
                $data = $this->decodeData($row['data'], null);
                if (is_array($data)) {
                    $data['id'] = (int)$row['id_local'];
                }
                return $data;
            }, $rows);

            return array_values(array_filter($proyectos, fn($p) => $p !== null && is_array($p)));
        }

        /* Fallback: migrar desde user_meta */
        $metaData = get_user_meta($this->userId, self::META_PROYECTOS, true);
        if (!empty($metaData)) {
            $proyectos = $this->decodeData($metaData, []);
            if (!empty($proyectos)) {
                $this->saveAll($proyectos);
                delete_user_meta($this->userId, self::META_PROYECTOS);
                return $proyectos;
            }
        }

        return [];
    }

    /**
     * Guarda los proyectos (Upsert + Soft Delete opcional)
     * 
     * @param array $proyectos Lista de proyectos a guardar
     * @param bool $partialUpdate Si es true, NO borra los proyectos que faltan (modo incremental)
     */
    public function saveAll(array $proyectos, bool $partialUpdate = false): bool
    {
        global $wpdb;
        $table = Schema::getTableName('proyectos');
        $now = current_time('mysql');

        $existingIds = [];
        if (!$partialUpdate) {
            $existingIds = $wpdb->get_col($wpdb->prepare(
                "SELECT id_local FROM $table WHERE user_id = %d AND deleted_at IS NULL",
                $this->userId
            ));
        }

        /* Pre-fetch mapa id_local => id para evitar N+1 queries dentro del loop */
        $existingRows = $wpdb->get_results($wpdb->prepare(
            "SELECT id, id_local FROM $table WHERE user_id = %d",
            $this->userId
        ), ARRAY_A);
        $existingMap = [];
        foreach ($existingRows as $row) {
            $existingMap[(int)$row['id_local']] = (int)$row['id'];
        }

        $incomingIds = [];
        $toUpdate = [];
        $toInsert = [];

        foreach ($proyectos as $proyecto) {
            if (!isset($proyecto['id'])) continue;

            $idLocal = (int)$proyecto['id'];
            $incomingIds[] = $idLocal;

            $nombreOriginal = sanitize_text_field($proyecto['nombre'] ?? '');
            $nombre = $this->cifradoHabilitado ? '[CIFRADO]' : $nombreOriginal;

            $estado = $proyecto['estado'] ?? 'activo';
            $prioridad = $proyecto['prioridad'] ?? null;
            $urgencia = $proyecto['urgencia'] ?? 'normal';

            /* Validar valores de urgencia */
            $urgenciasValidas = ['bloqueante', 'urgente', 'normal', 'chill'];
            if (!in_array($urgencia, $urgenciasValidas)) {
                $urgencia = 'normal';
            }

            $exists = $existingMap[$idLocal] ?? null;
            $dataJson = $this->encodeData($proyecto);

            if ($exists) {
                $toUpdate[] = [
                    'id' => $exists,
                    'nombre' => $nombre,
                    'estado' => $estado,
                    'prioridad' => $prioridad,
                    'urgencia' => $urgencia,
                    'data' => $dataJson
                ];
            } else {
                $toInsert[] = [
                    'user_id' => $this->userId,
                    'id_local' => $idLocal,
                    'nombre' => $nombre,
                    'estado' => $estado,
                    'prioridad' => $prioridad,
                    'urgencia' => $urgencia,
                    'data' => $dataJson
                ];
            }
        }

        /* Batch UPDATE con CASE para evitar N+1 */
        if (!empty($toUpdate)) {
            $ids = array_column($toUpdate, 'id');
            $caseNombre = '';
            $caseEstado = '';
            $casePrioridad = '';
            $caseUrgencia = '';
            $caseData = '';

            foreach ($toUpdate as $item) {
                $caseNombre .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['nombre']);
                $caseEstado .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['estado']);
                $casePrioridad .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['prioridad'] ?? '');
                $caseUrgencia .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['urgencia']);
                $caseData .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['data']);
            }

            $idsPlaceholders = implode(',', array_fill(0, count($ids), '%d'));
            $wpdb->query($wpdb->prepare(
                "UPDATE $table SET
                    nombre = CASE $caseNombre END,
                    estado = CASE $caseEstado END,
                    prioridad = CASE $casePrioridad END,
                    urgencia = CASE $caseUrgencia END,
                    data = CASE $caseData END,
                    deleted_at = NULL,
                    updated_at = %s
                WHERE id IN ($idsPlaceholders)",
                array_merge([$now], $ids)
            ));
        }

        /* Batch INSERT */
        foreach ($toInsert as $row) {
            $wpdb->insert($table, $row, ['%d', '%d', '%s', '%s', '%s', '%s', '%s']);
        }

        /* Soft Delete (Solo si NO es actualización parcial) */
        if (!$partialUpdate) {
            $toDelete = array_diff($existingIds, $incomingIds);
            if (!empty($toDelete)) {
                $idsList = implode(',', array_map('intval', $toDelete));
                $wpdb->query($wpdb->prepare(
                    "UPDATE $table SET deleted_at = %s WHERE user_id = %d AND id_local IN ($idsList)",
                    $now,
                    $this->userId
                ));
            }
        }

        return true;
    }

    /**
     * Elimina todos los proyectos del usuario
     */
    public function deleteAll(): bool
    {
        global $wpdb;
        $wpdb->delete(Schema::getTableName('proyectos'), ['user_id' => $this->userId]);
        return true;
    }
}

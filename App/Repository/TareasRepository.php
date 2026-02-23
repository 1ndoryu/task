<?php

/**
 * Repositorio de Tareas
 *
 * Maneja la persistencia de tareas en la tabla wp_glory_tareas.
 * Soporta migración desde user_meta y cifrado E2E.
 *
 * @package App\Repository
 */

namespace App\Repository;

use App\Database\Schema;
use App\Repository\CifradoTrait;

class TareasRepository
{
    use CifradoTrait;

    private const META_TAREAS = '_glory_dashboard_tareas';

    public function __construct(int $userId)
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('ID de usuario invalido');
        }
        $this->userId = $userId;
        $this->inicializarCifrado();
    }

    /**
     * Obtiene las tareas del usuario (SQL con fallback)
     */
    public function getAll(): array
    {
        global $wpdb;
        $table = Schema::getTableName('tareas');

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT data, id_local FROM $table WHERE user_id = %d AND deleted_at IS NULL",
            $this->userId
        ), 'ARRAY_A');

        if (!empty($rows)) {
            $tareas = array_map(function ($row) {
                $data = $this->decodeData($row['data'], null);
                if (is_array($data)) {
                    $data['id'] = (int)$row['id_local'];
                }
                return $data;
            }, $rows);

            return array_values(array_filter($tareas, fn($t) => $t !== null && is_array($t)));
        }

        /* Fallback: migrar desde user_meta */
        $metaData = get_user_meta($this->userId, self::META_TAREAS, true);
        if (!empty($metaData)) {
            $tareas = $this->decodeData($metaData, []);
            if (!empty($tareas)) {
                $this->saveAll($tareas);
                delete_user_meta($this->userId, self::META_TAREAS);
                return $tareas;
            }
        }

        return [];
    }

    /**
     * Guarda las tareas (Upsert + Soft Delete opcional)
     * 
     * @param array $tareas Lista de tareas a guardar
     * @param bool $partialUpdate Si es true, NO borra las tareas que faltan en la lista (modo incremental)
     */
    public function saveAll(array $tareas, bool $partialUpdate = false): bool
    {
        global $wpdb;
        $table = Schema::getTableName('tareas');
        $now = current_time('mysql');

        // Solo necesitamos obtener IDs existentes si vamos a borrar los que faltan
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

        foreach ($tareas as $tarea) {
            if (!isset($tarea['id'])) continue;

            $idLocal = (int)$tarea['id'];
            $incomingIds[] = $idLocal;

            $textoOriginal = sanitize_text_field($tarea['texto'] ?? '');
            $texto = $this->cifradoHabilitado ? '[CIFRADO]' : $textoOriginal;

            $completada = !empty($tarea['completado']) ? 1 : 0;
            $proyectoId = isset($tarea['proyectoId']) ? (int)$tarea['proyectoId'] : null;
            $padreId = isset($tarea['parentId']) ? (int)$tarea['parentId'] : null;
            $prioridad = $tarea['prioridad'] ?? null;
            $urgencia = $tarea['urgencia'] ?? 'normal';

            /* Validar valores de urgencia */
            $urgenciasValidas = ['bloqueante', 'urgente', 'normal', 'chill'];
            if (!in_array($urgencia, $urgenciasValidas)) {
                $urgencia = 'normal';
            }

            $exists = $existingMap[$idLocal] ?? null;
            $dataJson = $this->encodeData($tarea);

            if ($exists) {
                $toUpdate[] = [
                    'id' => $exists,
                    'texto' => $texto,
                    'completada' => $completada,
                    'proyecto_id' => $proyectoId,
                    'padre_id' => $padreId,
                    'prioridad' => $prioridad,
                    'urgencia' => $urgencia,
                    'data' => $dataJson
                ];
            } else {
                $toInsert[] = [
                    'user_id' => $this->userId,
                    'id_local' => $idLocal,
                    'texto' => $texto,
                    'completada' => $completada,
                    'proyecto_id' => $proyectoId,
                    'padre_id' => $padreId,
                    'prioridad' => $prioridad,
                    'urgencia' => $urgencia,
                    'data' => $dataJson
                ];
            }
        }

        /* Batch UPDATE con CASE para evitar N+1 */
        if (!empty($toUpdate)) {
            $ids = array_column($toUpdate, 'id');
            $caseTexto = '';
            $caseCompletada = '';
            $caseProyecto = '';
            $casePadre = '';
            $casePrioridad = '';
            $caseUrgencia = '';
            $caseData = '';

            foreach ($toUpdate as $item) {
                $caseTexto .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['texto']);
                $caseCompletada .= $wpdb->prepare(" WHEN id = %d THEN %d", $item['id'], $item['completada']);
                $pid = $item['proyecto_id'] === null ? 'NULL' : $wpdb->prepare("%d", $item['proyecto_id']);
                $caseProyecto .= " WHEN id = {$item['id']} THEN $pid";
                $ppid = $item['padre_id'] === null ? 'NULL' : $wpdb->prepare("%d", $item['padre_id']);
                $casePadre .= " WHEN id = {$item['id']} THEN $ppid";
                $casePrioridad .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['prioridad'] ?? '');
                $caseUrgencia .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['urgencia']);
                $caseData .= $wpdb->prepare(" WHEN id = %d THEN %s", $item['id'], $item['data']);
            }

            $idsPlaceholders = implode(',', array_fill(0, count($ids), '%d'));
            $wpdb->query($wpdb->prepare(
                "UPDATE $table SET
                    texto = CASE $caseTexto END,
                    completada = CASE $caseCompletada END,
                    proyecto_id = CASE $caseProyecto END,
                    padre_id = CASE $casePadre END,
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
            $wpdb->insert($table, $row, ['%d', '%d', '%s', '%d', '%d', '%d', '%s', '%s', '%s']);
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
     * Elimina todas las tareas del usuario
     */
    public function deleteAll(): bool
    {
        global $wpdb;
        $wpdb->delete(Schema::getTableName('tareas'), ['user_id' => $this->userId]);
        return true;
    }
}

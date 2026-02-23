<?php

/**
 * Repositorio de Carpetas de Notas
 *
 * Maneja la persistencia de carpetas para organizar notas.
 * La carpeta "General" es virtual (NULL en BD) y no se puede eliminar.
 *
 * @package App\Repository
 */

namespace App\Repository;

use App\Database\Schema;

class CarpetasNotasRepository
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
     * Obtiene todas las carpetas del usuario ordenadas por orden
     * Incluye carpeta virtual "General" al inicio con contador de notas sin carpeta
     * 
     * @return array
     */
    public function listar(): array
    {
        global $wpdb;
        $table = Schema::getTableName('carpetas_notas');
        $tableNotas = Schema::getTableName('notas');

        Schema::ensureTableExists('carpetas_notas');

        /* Contar notas sin carpeta (General) */
        $notasSinCarpeta = (int)$wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $tableNotas 
             WHERE user_id = %d AND carpeta_id IS NULL",
            $this->userId
        ));

        /* Obtener carpetas del usuario con conteo de notas */
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT c.*, COALESCE(COUNT(n.id), 0) as total_notas
             FROM $table c
             LEFT JOIN $tableNotas n ON n.carpeta_id = c.id AND n.user_id = c.user_id
             WHERE c.user_id = %d
             GROUP BY c.id
             ORDER BY c.orden ASC, c.id ASC",
            $this->userId
        ), 'ARRAY_A');

        /* Carpeta virtual "General" siempre al inicio */
        $carpetas = [
            [
                'id' => null,
                'nombre' => 'General',
                'orden' => -1,
                'totalNotas' => $notasSinCarpeta,
                'esVirtual' => true
            ]
        ];

        /* Añadir carpetas del usuario */
        foreach ($rows ?: [] as $row) {
            $carpetas[] = [
                'id' => (int)$row['id'],
                'nombre' => $row['nombre'],
                'orden' => (int)$row['orden'],
                'totalNotas' => (int)$row['total_notas'],
                'esVirtual' => false
            ];
        }

        return $carpetas;
    }

    /**
     * Obtiene una carpeta específica por ID
     */
    public function obtener(int $carpetaId): ?array
    {
        global $wpdb;
        $table = Schema::getTableName('carpetas_notas');

        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT id, user_id, nombre, orden, fecha_creacion FROM $table WHERE id = %d AND user_id = %d",
            $carpetaId,
            $this->userId
        ), 'ARRAY_A');

        if (!$row) {
            return null;
        }

        return [
            'id' => (int)$row['id'],
            'nombre' => $row['nombre'],
            'orden' => (int)$row['orden'],
            'esVirtual' => false
        ];
    }

    /**
     * Crea una nueva carpeta
     * 
     * @param string $nombre Nombre de la carpeta
     * @return array|null Carpeta creada o null si falla
     */
    public function crear(string $nombre): ?array
    {
        global $wpdb;
        $table = Schema::getTableName('carpetas_notas');

        Schema::ensureTableExists('carpetas_notas');

        /* Sanitizar nombre */
        $nombre = sanitize_text_field(trim($nombre));
        if (empty($nombre)) {
            return null;
        }

        /* Obtener el orden máximo actual */
        $maxOrden = (int)$wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(MAX(orden), 0) FROM $table WHERE user_id = %d",
            $this->userId
        ));

        $resultado = $wpdb->insert(
            $table,
            [
                'user_id' => $this->userId,
                'nombre' => $nombre,
                'orden' => $maxOrden + 1,
                'fecha_creacion' => current_time('mysql')
            ],
            ['%d', '%s', '%d', '%s']
        );

        if (!$resultado) {
            return null;
        }

        return [
            'id' => $wpdb->insert_id,
            'nombre' => $nombre,
            'orden' => $maxOrden + 1,
            'totalNotas' => 0,
            'esVirtual' => false
        ];
    }

    /**
     * Renombra una carpeta existente
     */
    public function renombrar(int $carpetaId, string $nuevoNombre): bool
    {
        global $wpdb;
        $table = Schema::getTableName('carpetas_notas');

        /* Verificar que la carpeta pertenece al usuario */
        $carpetaExistente = $this->obtener($carpetaId);
        if (!$carpetaExistente) {
            return false;
        }

        $nuevoNombre = sanitize_text_field(trim($nuevoNombre));
        if (empty($nuevoNombre)) {
            return false;
        }

        $resultado = $wpdb->update(
            $table,
            ['nombre' => $nuevoNombre],
            ['id' => $carpetaId, 'user_id' => $this->userId],
            ['%s'],
            ['%d', '%d']
        );

        return $resultado !== false;
    }

    /**
     * Elimina una carpeta y mueve sus notas a General (NULL)
     */
    public function eliminar(int $carpetaId): bool
    {
        global $wpdb;
        $table = Schema::getTableName('carpetas_notas');
        $tableNotas = Schema::getTableName('notas');

        /* Verificar que la carpeta pertenece al usuario */
        $carpetaExistente = $this->obtener($carpetaId);
        if (!$carpetaExistente) {
            return false;
        }

        /* Mover notas de esta carpeta a General (NULL) */
        $wpdb->update(
            $tableNotas,
            ['carpeta_id' => null],
            ['carpeta_id' => $carpetaId, 'user_id' => $this->userId],
            ['%s'],
            ['%d', '%d']
        );

        /* Eliminar la carpeta */
        $resultado = $wpdb->delete(
            $table,
            ['id' => $carpetaId, 'user_id' => $this->userId],
            ['%d', '%d']
        );

        return $resultado !== false;
    }

    /**
     * Actualiza el orden de las carpetas
     * 
     * @param array $ordenes Array de [id => orden]
     */
    public function actualizarOrden(array $ordenes): bool
    {
        global $wpdb;
        $table = Schema::getTableName('carpetas_notas');

        /* Batch: actualizar orden de todas las carpetas en una sola query con CASE */
        if (!empty($ordenes)) {
            $cases = '';
            $ids = [];
            foreach ($ordenes as $id => $orden) {
                $idInt = (int)$id;
                $ordenInt = (int)$orden;
                $cases .= sprintf("WHEN %d THEN %d ", $idInt, $ordenInt);
                $ids[] = $idInt;
            }
            $idsStr = implode(',', $ids);
            $wpdb->query($wpdb->prepare(
                "UPDATE $table SET orden = CASE id {$cases}END WHERE id IN ($idsStr) AND user_id = %d",
                $this->userId
            ));
        }

        return true;
    }
}

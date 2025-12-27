<?php

/**
 * Repositorio de Historial de Hábitos
 *
 * Maneja el registro retroactivo de cumplimiento de hábitos.
 * Permite marcar días pasados como completados, pospuestos u omitidos.
 *
 * @package App\Repository
 */

namespace App\Repository;

use App\Database\Schema;

class HabitosHistorialRepository
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
     * Marca un día para un hábito
     * 
     * @param int $habitoId ID local del hábito
     * @param string $fecha Fecha a marcar (Y-m-d)
     * @param string $estado Estado: 'completado', 'pospuesto', 'omitido'
     * @param string|null $notas Notas opcionales
     */
    public function marcarDia(
        int $habitoId,
        string $fecha,
        string $estado = 'completado',
        ?string $notas = null
    ): bool {
        global $wpdb;
        $table = Schema::getTableName('habitos_historial');

        /* Validar que la fecha no sea futura */
        $hoy = current_time('Y-m-d');
        if ($fecha > $hoy) {
            return false;
        }

        /* Validar estado */
        $estadosValidos = ['completado', 'pospuesto', 'omitido'];
        if (!in_array($estado, $estadosValidos)) {
            $estado = 'completado';
        }

        /* Verificar si ya existe */
        $existeId = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $table WHERE habito_id = %d AND fecha = %s",
            $habitoId,
            $fecha
        ));

        if ($existeId) {
            /* Actualizar */
            $result = $wpdb->update(
                $table,
                [
                    'estado' => $estado,
                    'notas' => $notas ? sanitize_textarea_field($notas) : null,
                    'fecha_registro' => current_time('mysql')
                ],
                ['id' => $existeId],
                ['%s', '%s', '%s'],
                ['%d']
            );
            return $result !== false;
        }

        /* Insertar nuevo */
        $result = $wpdb->insert(
            $table,
            [
                'user_id' => $this->userId,
                'habito_id' => $habitoId,
                'fecha' => $fecha,
                'estado' => $estado,
                'notas' => $notas ? sanitize_textarea_field($notas) : null
            ],
            ['%d', '%d', '%s', '%s', '%s']
        );

        return $result !== false;
    }

    /**
     * Elimina la marca de un día
     */
    public function desmarcarDia(int $habitoId, string $fecha): bool
    {
        global $wpdb;
        $table = Schema::getTableName('habitos_historial');

        $result = $wpdb->delete(
            $table,
            [
                'habito_id' => $habitoId,
                'fecha' => $fecha
            ],
            ['%d', '%s']
        );

        return $result !== false;
    }

    /**
     * Obtiene el historial de un hábito en un rango de fechas
     */
    public function obtenerHistorial(
        int $habitoId,
        string $fechaInicio,
        string $fechaFin
    ): array {
        global $wpdb;
        $table = Schema::getTableName('habitos_historial');

        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT fecha, estado, notas, fecha_registro
             FROM $table 
             WHERE habito_id = %d AND fecha BETWEEN %s AND %s
             ORDER BY fecha DESC",
            $habitoId,
            $fechaInicio,
            $fechaFin
        ), 'ARRAY_A');

        /* Convertir a array asociativo por fecha */
        $historial = [];
        foreach ($results as $row) {
            $historial[$row['fecha']] = [
                'estado' => $row['estado'],
                'notas' => $row['notas'],
                'fechaRegistro' => $row['fecha_registro']
            ];
        }

        return $historial;
    }

    /**
     * Obtiene los últimos N días de historial de un hábito
     */
    public function obtenerUltimosDias(int $habitoId, int $dias = 7): array
    {
        $hoy = current_time('Y-m-d');
        $fechaInicio = date('Y-m-d', strtotime("-$dias days", strtotime($hoy)));

        return $this->obtenerHistorial($habitoId, $fechaInicio, $hoy);
    }

    /**
     * Obtiene el historial resumido para mostrar en la columna de hábitos
     * Devuelve un array con los últimos 7 días con estado
     */
    public function obtenerResumen7Dias(int $habitoId): array
    {
        $historial = $this->obtenerUltimosDias($habitoId, 7);
        $hoy = current_time('Y-m-d');

        $resumen = [];
        for ($i = 6; $i >= 0; $i--) {
            $fecha = date('Y-m-d', strtotime("-$i days", strtotime($hoy)));
            $resumen[] = [
                'fecha' => $fecha,
                'diaSemana' => $this->obtenerDiaSemana($fecha),
                'estado' => $historial[$fecha]['estado'] ?? null,
                'esHoy' => $fecha === $hoy
            ];
        }

        return $resumen;
    }

    /**
     * Obtiene el historial de múltiples hábitos (optimizado)
     */
    public function obtenerHistorialMultiple(array $habitoIds, int $dias = 7): array
    {
        if (empty($habitoIds)) {
            return [];
        }

        global $wpdb;
        $table = Schema::getTableName('habitos_historial');

        $hoy = current_time('Y-m-d');
        $fechaInicio = date('Y-m-d', strtotime("-$dias days", strtotime($hoy)));

        $placeholders = implode(',', array_fill(0, count($habitoIds), '%d'));
        $params = array_merge($habitoIds, [$fechaInicio, $hoy]);

        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT habito_id, fecha, estado
             FROM $table 
             WHERE habito_id IN ($placeholders) AND fecha BETWEEN %s AND %s
             ORDER BY fecha DESC",
            $params
        ), 'ARRAY_A');

        /* Agrupar por hábito */
        $historialPorHabito = [];
        foreach ($results as $row) {
            $habitoId = (int)$row['habito_id'];
            if (!isset($historialPorHabito[$habitoId])) {
                $historialPorHabito[$habitoId] = [];
            }
            $historialPorHabito[$habitoId][$row['fecha']] = $row['estado'];
        }

        return $historialPorHabito;
    }

    /**
     * Obtiene estadísticas del hábito
     */
    public function obtenerEstadisticas(int $habitoId, int $dias = 30): array
    {
        $historial = $this->obtenerUltimosDias($habitoId, $dias);

        $completados = 0;
        $pospuestos = 0;
        $omitidos = 0;

        foreach ($historial as $dia) {
            switch ($dia['estado']) {
                case 'completado':
                    $completados++;
                    break;
                case 'pospuesto':
                    $pospuestos++;
                    break;
                case 'omitido':
                    $omitidos++;
                    break;
            }
        }

        $total = $completados + $pospuestos + $omitidos;
        $porcentaje = $total > 0 ? round(($completados / $total) * 100) : 0;

        return [
            'completados' => $completados,
            'pospuestos' => $pospuestos,
            'omitidos' => $omitidos,
            'total' => $total,
            'porcentajeCumplimiento' => $porcentaje,
            'dias' => $dias
        ];
    }

    /**
     * Obtiene el día de la semana en español (abreviado)
     */
    private function obtenerDiaSemana(string $fecha): string
    {
        $dias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        $diaSemana = date('w', strtotime($fecha));
        return $dias[$diaSemana];
    }
}

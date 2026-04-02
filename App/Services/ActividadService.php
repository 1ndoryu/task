<?php

/**
 * Servicio de Actividad
 *
 * Centraliza la lógica de negocio para actividad, heatmap y hábitos historial.
 * Extraído de ActividadApiController para cumplir con separación de responsabilidades.
 *
 * @package App\Services
 */

namespace App\Services;

use App\Repository\ActividadRepository;
use App\Repository\HabitosHistorialRepository;

class ActividadService
{
    /** Tipos de actividad válidos */
    private const TIPOS_VALIDOS = [
        'tarea_completada',
        'habito_cumplido',
        'nota_creada',
        'adjunto_subido',
        'tarea_desmarcada',
        'habito_desmarcado',
        'habito_pospuesto'
    ];

    /** Estados válidos para hábitos */
    private const ESTADOS_HABITO_VALIDOS = ['completado', 'pospuesto', 'omitido'];

    /**
     * Calcula fechas de inicio/fin según el período seleccionado
     *
     * @param string $periodo semana|mes|trimestre|anio
     * @param string|null $fechaHoyLocal Fecha del cliente (YYYY-MM-DD) para evitar problemas de timezone
     */
    public function calcularFechasPeriodo(string $periodo, ?string $fechaHoyLocal = null): array
    {
        $hoy = $fechaHoyLocal && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaHoyLocal)
            ? $fechaHoyLocal
            : current_time('Y-m-d');

        $diasMap = [
            'semana' => 7,
            'mes' => 30,
            'trimestre' => 90,
            'anio' => 365,
        ];

        $dias = $diasMap[$periodo] ?? 30;
        $inicio = date('Y-m-d', strtotime("-{$dias} days", strtotime($hoy)));

        return ['inicio' => $inicio, 'fin' => $hoy];
    }

    /**
     * Obtiene datos del heatmap de actividad
     */
    public function obtenerHeatmap(int $userId, array $params): array
    {
        $repo = new ActividadRepository($userId);

        $periodo = $params['periodo'] ?? 'mes';
        $fechas = $this->calcularFechasPeriodo($periodo, $params['fechaHoyLocal'] ?? null);

        $fechaInicio = $params['fechaInicio'] ?? $fechas['inicio'];
        $fechaFin = $params['fechaFin'] ?? $fechas['fin'];

        $heatmap = $repo->obtenerResumenHeatmap(
            $fechaInicio,
            $fechaFin,
            $params['tipo'] ?? null,
            $params['proyectoId'] ?? null,
            $params['habitoId'] ?? null
        );

        return [
            'heatmap' => $heatmap,
            'periodo' => [
                'inicio' => $fechaInicio,
                'fin' => $fechaFin,
                'tipo' => $periodo
            ]
        ];
    }

    /**
     * Obtiene estadísticas de actividad en un rango de fechas
     */
    public function obtenerEstadisticas(int $userId, ?string $fechaInicio, ?string $fechaFin): array
    {
        $repo = new ActividadRepository($userId);

        $hoy = current_time('Y-m-d');
        $fechaInicio = $fechaInicio ?: date('Y-m-d', strtotime('-30 days', strtotime($hoy)));
        $fechaFin = $fechaFin ?: $hoy;

        return [
            'estadisticas' => $repo->obtenerEstadisticas($fechaInicio, $fechaFin),
            'periodo' => ['inicio' => $fechaInicio, 'fin' => $fechaFin]
        ];
    }

    /**
     * Obtiene detalle de actividad de un día específico
     */
    public function obtenerDetalleDia(
        int $userId,
        string $fecha,
        ?string $tipo,
        ?int $proyectoId,
        ?int $habitoId
    ): array {
        $repo = new ActividadRepository($userId);

        return $repo->obtenerDetalleDia($fecha, $tipo, $proyectoId, $habitoId);
    }

    /**
     * [024A-33] Verifica si ya existe una actividad de hábito para user+habitoId+fecha+tipo.
     * Previene duplicados cuando el toggle se dispara múltiples veces en rápida sucesión.
     */
    private function existeActividadHabito(int $userId, int $elementoId, string $fecha, string $tipo): bool
    {
        global $wpdb;
        $table = \App\Database\Schema::getTableName('actividad');
        $existe = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE user_id = %d AND elemento_tipo = 'habito' AND elemento_id = %d AND fecha = %s AND tipo = %s",
            $userId, $elementoId, $fecha, $tipo
        ));
        return (int)$existe > 0;
    }

    /**
     * Registra actividad con lógica de negocio (desmarcar, sincronizar historial, etc.)
     *
     * @return array{success: bool, accion?: string, error?: string}
     */
    public function registrarActividad(int $userId, array $datos): array
    {
        $repo = new ActividadRepository($userId);
        $historialRepo = new HabitosHistorialRepository($userId);

        $tipo = $datos['tipo'];
        $elementoId = $datos['elementoId'] ?? null;
        $elementoTipo = $datos['elementoTipo'] ?? null;
        $proyectoId = $datos['proyectoId'] ?? null;
        $fecha = $datos['fecha'] ?? null;
        $detalles = $datos['detalles'] ?? [];
        $horaLocal = $datos['horaLocal'] ?? null;

        if (!in_array($tipo, self::TIPOS_VALIDOS)) {
            return ['success' => false, 'error' => 'Tipo de actividad no válido'];
        }

        $fechaActividad = $fecha ?: current_time('Y-m-d');

        /* Desmarcar hábito: eliminar actividad + historial sin registrar nueva */
        if ($tipo === 'habito_desmarcado' && $elementoId && $elementoTipo === 'habito') {
            $repo->eliminarPorHabito($elementoId, $fechaActividad);
            $historialRepo->desmarcarDia($elementoId, $fechaActividad);
            return ['success' => true, 'accion' => 'eliminado'];
        }

        /* Desmarcar tarea: eliminar actividad sin registrar nueva */
        if ($tipo === 'tarea_desmarcada' && $elementoId && $elementoTipo === 'tarea') {
            $repo->eliminarPorTarea($elementoId, $fechaActividad);
            return ['success' => true, 'accion' => 'eliminado'];
        }

        /* Hábito cumplido: sincronizar con historial */
        if ($tipo === 'habito_cumplido' && $elementoId && $elementoTipo === 'habito') {
            /* [024A-33] Dedup: si ya existe un habito_cumplido para este ID+fecha, ignorar.
             * Previene entradas duplicadas cuando el toggle se dispara múltiples veces. */
            if ($this->existeActividadHabito($userId, $elementoId, $fechaActividad, 'habito_cumplido')) {
                return ['success' => true, 'accion' => 'duplicado_ignorado'];
            }
            $historialRepo->marcarDia($elementoId, $fechaActividad, 'completado', null);
        }

        /* Hábito pospuesto: registrar en historial como pospuesto */
        if ($tipo === 'habito_pospuesto' && $elementoId && $elementoTipo === 'habito') {
            $historialRepo->marcarDia($elementoId, $fechaActividad, 'pospuesto', null);
        }

        $resultado = $repo->registrar(
            $tipo,
            $elementoId ?: null,
            $elementoTipo ?: null,
            $proyectoId ?: null,
            $fecha ?: null,
            is_array($detalles) ? $detalles : [],
            $horaLocal ?: null
        );

        if (!$resultado) {
            return ['success' => false, 'error' => 'Error al registrar actividad'];
        }

        return ['success' => true, 'accion' => 'registrado'];
    }

    /**
     * Obtiene historial completo de un hábito con resumen y estadísticas
     */
    public function obtenerHistorialHabito(int $userId, int $habitoId, int $dias): array
    {
        $repo = new HabitosHistorialRepository($userId);

        return [
            'historial' => $repo->obtenerUltimosDias($habitoId, $dias),
            'resumen7Dias' => $repo->obtenerResumen7Dias($habitoId),
            'estadisticas' => $repo->obtenerEstadisticas($habitoId, $dias)
        ];
    }

    /**
     * Marca un día de hábito y registra actividad si es completado
     *
     * @return array{success: bool, resumen7Dias?: array, error?: string}
     */
    public function marcarDiaHabito(
        int $userId,
        int $habitoId,
        string $fecha,
        string $estado,
        ?string $notas
    ): array {
        /* Validar fecha no futura */
        if ($fecha > current_time('Y-m-d')) {
            return ['success' => false, 'error' => 'No se pueden marcar fechas futuras'];
        }

        if (!in_array($estado, self::ESTADOS_HABITO_VALIDOS)) {
            return ['success' => false, 'error' => 'Estado no válido'];
        }

        $repo = new HabitosHistorialRepository($userId);
        $resultado = $repo->marcarDia($habitoId, $fecha, $estado, $notas);

        if (!$resultado) {
            return ['success' => false, 'error' => 'Error al marcar día'];
        }

        /* Registrar en actividad solo si es completado */
        if ($estado === 'completado') {
            $actividadRepo = new ActividadRepository($userId);
            $actividadRepo->registrar('habito_cumplido', $habitoId, 'habito', null, $fecha);
        }

        return [
            'success' => true,
            'resumen7Dias' => $repo->obtenerResumen7Dias($habitoId)
        ];
    }

    /**
     * Desmarca un día de hábito y elimina actividad asociada
     *
     * @return array{success: bool, resumen7Dias?: array, error?: string}
     */
    public function desmarcarDiaHabito(int $userId, int $habitoId, string $fecha): array
    {
        $repo = new HabitosHistorialRepository($userId);
        $resultado = $repo->desmarcarDia($habitoId, $fecha);

        if (!$resultado) {
            return ['success' => false, 'error' => 'Error al desmarcar día'];
        }

        /* Eliminar de actividad para que el heatmap se actualice */
        $actividadRepo = new ActividadRepository($userId);
        $actividadRepo->eliminarPorHabito($habitoId, $fecha);

        return [
            'success' => true,
            'resumen7Dias' => $repo->obtenerResumen7Dias($habitoId)
        ];
    }

    /**
     * Obtiene resumen de 7 días para múltiples hábitos (optimizado)
     */
    public function obtenerResumenMultiple(int $userId, array $habitoIds): array
    {
        $repo = new HabitosHistorialRepository($userId);
        $habitoIds = array_map('absint', $habitoIds);

        return $repo->obtenerHistorialMultiple($habitoIds, 7);
    }

    /**
     * Limpia toda la actividad de un usuario (herramienta admin)
     */
    public function limpiarActividad(int $userId): int
    {
        $repo = new ActividadRepository($userId);

        return $repo->limpiarTodo();
    }

    /**
     * [024A-34] Elimina una actividad individual por su ID.
     * @return array{success: bool, error?: string}
     */
    public function eliminarActividad(int $userId, int $actividadId): array
    {
        $repo = new ActividadRepository($userId);
        $eliminado = $repo->eliminarPorId($actividadId);

        if (!$eliminado) {
            return ['success' => false, 'error' => 'Actividad no encontrada o no pertenece al usuario'];
        }

        return ['success' => true];
    }
}

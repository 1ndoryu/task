<?php

/**
 * Actividad API Controller
 *
 * Maneja los endpoints REST para el mapa de calor de actividad
 *
 * Endpoints:
 * - GET /wp-json/glory/v1/actividad -> Obtener heatmap
 * - GET /wp-json/glory/v1/actividad/estadisticas -> Estadísticas
 * - POST /wp-json/glory/v1/actividad -> Registrar actividad manualmente
 * - GET /wp-json/glory/v1/habitos/{id}/historial -> Historial de hábito
 * - POST /wp-json/glory/v1/habitos/{id}/historial -> Marcar día de hábito
 * - DELETE /wp-json/glory/v1/habitos/{id}/historial/{fecha} -> Desmarcar día
 *
 * @package App\Api
 */

namespace App\Api;

use App\Repository\ActividadRepository;
use App\Repository\HabitosHistorialRepository;

class ActividadApiController
{
    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registrarRutas']);
    }

    public static function registrarRutas(): void
    {
        /* Obtener heatmap de actividad */
        register_rest_route('glory/v1', '/actividad', [
            'methods' => 'GET',
            'callback' => [self::class, 'obtenerHeatmap'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'fechaInicio' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'fechaFin' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'tipo' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'proyectoId' => [
                    'required' => false,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'habitoId' => [
                    'required' => false,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'periodo' => [
                    'required' => false,
                    'type' => 'string',
                    'default' => 'mes',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'fechaHoyLocal' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                    'description' => 'Fecha de hoy del cliente para evitar problemas de zona horaria'
                ]
            ]
        ]);

        /* Estadísticas de actividad */
        register_rest_route('glory/v1', '/actividad/estadisticas', [
            'methods' => 'GET',
            'callback' => [self::class, 'obtenerEstadisticas'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'fechaInicio' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'fechaFin' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
        ]);

        /* Registrar actividad manualmente */
        register_rest_route('glory/v1', '/actividad', [
            'methods' => 'POST',
            'callback' => [self::class, 'registrarActividad'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'tipo' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'elementoId' => [
                    'required' => false,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'elementoTipo' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'proyectoId' => [
                    'required' => false,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'fecha' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
        ]);

        /* Historial de hábito */
        register_rest_route('glory/v1', '/habitos/(?P<id>\d+)/historial', [
            'methods' => 'GET',
            'callback' => [self::class, 'obtenerHistorialHabito'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'dias' => [
                    'required' => false,
                    'type' => 'integer',
                    'default' => 30,
                    'sanitize_callback' => 'absint'
                ]
            ]
        ]);

        /* Marcar día de hábito */
        register_rest_route('glory/v1', '/habitos/(?P<id>\d+)/historial', [
            'methods' => 'POST',
            'callback' => [self::class, 'marcarDiaHabito'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'fecha' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'estado' => [
                    'required' => false,
                    'type' => 'string',
                    'default' => 'completado',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'notas' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_textarea_field'
                ]
            ]
        ]);

        /* Desmarcar día de hábito */
        register_rest_route('glory/v1', '/habitos/(?P<id>\d+)/historial/(?P<fecha>[0-9\-]+)', [
            'methods' => 'DELETE',
            'callback' => [self::class, 'desmarcarDiaHabito'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ],
                'fecha' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
        ]);

        /* Resumen de 7 días para múltiples hábitos */
        register_rest_route('glory/v1', '/habitos/historial-resumen', [
            'methods' => 'POST',
            'callback' => [self::class, 'obtenerResumenMultiple'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'habitoIds' => [
                    'required' => true,
                    'type' => 'array'
                ]
            ]
        ]);

        /* Limpiar toda la actividad del usuario (solo admin) */
        register_rest_route('glory/v1', '/actividad/limpiar', [
            'methods' => 'DELETE',
            'callback' => [self::class, 'limpiarActividad'],
            'permission_callback' => [self::class, 'verificarPermisosAdmin']
        ]);
    }

    /**
     * Verifica que el usuario esté autenticado
     */
    public static function verificarPermisos(): bool
    {
        return is_user_logged_in();
    }

    /**
     * Verifica que el usuario sea administrador
     */
    public static function verificarPermisosAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    /**
     * Calcula fechas según el período seleccionado
     * @param string $periodo Periodo a calcular (semana, mes, trimestre, anio)
     * @param string|null $fechaHoyLocal Fecha de hoy del cliente (YYYY-MM-DD) o null para usar servidor
     */
    private static function calcularFechasPeriodo(string $periodo, ?string $fechaHoyLocal = null): array
    {
        /* Usar fecha del cliente si se proporciona, sino usar fecha del servidor */
        $hoy = $fechaHoyLocal && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaHoyLocal)
            ? $fechaHoyLocal
            : current_time('Y-m-d');

        switch ($periodo) {
            case 'semana':
                $inicio = date('Y-m-d', strtotime('-7 days', strtotime($hoy)));
                break;
            case 'mes':
                $inicio = date('Y-m-d', strtotime('-30 days', strtotime($hoy)));
                break;
            case 'trimestre':
                $inicio = date('Y-m-d', strtotime('-90 days', strtotime($hoy)));
                break;
            case 'anio':
                $inicio = date('Y-m-d', strtotime('-365 days', strtotime($hoy)));
                break;
            default:
                $inicio = date('Y-m-d', strtotime('-30 days', strtotime($hoy)));
        }

        return ['inicio' => $inicio, 'fin' => $hoy];
    }

    /**
     * Obtiene el heatmap de actividad
     */
    public static function obtenerHeatmap(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new ActividadRepository($userId);

            /* Obtener fechas del período o parámetros */
            $periodo = $request->get_param('periodo') ?: 'mes';
            $fechaHoyLocal = $request->get_param('fechaHoyLocal');
            $fechas = self::calcularFechasPeriodo($periodo, $fechaHoyLocal);

            $fechaInicio = $request->get_param('fechaInicio') ?: $fechas['inicio'];
            $fechaFin = $request->get_param('fechaFin') ?: $fechas['fin'];

            $tipo = $request->get_param('tipo');
            $proyectoId = $request->get_param('proyectoId');
            $habitoId = $request->get_param('habitoId');

            $heatmap = $repo->obtenerResumenHeatmap(
                $fechaInicio,
                $fechaFin,
                $tipo ?: null,
                $proyectoId ?: null,
                $habitoId ?: null
            );

            return new \WP_REST_Response([
                'success' => true,
                'heatmap' => $heatmap,
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin,
                    'tipo' => $periodo
                ]
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene estadísticas de actividad
     */
    public static function obtenerEstadisticas(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new ActividadRepository($userId);

            $hoy = current_time('Y-m-d');
            $fechaInicio = $request->get_param('fechaInicio')
                ?: date('Y-m-d', strtotime('-30 days', strtotime($hoy)));
            $fechaFin = $request->get_param('fechaFin') ?: $hoy;

            $estadisticas = $repo->obtenerEstadisticas($fechaInicio, $fechaFin);

            return new \WP_REST_Response([
                'success' => true,
                'estadisticas' => $estadisticas,
                'periodo' => [
                    'inicio' => $fechaInicio,
                    'fin' => $fechaFin
                ]
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Registra una actividad manualmente
     */
    public static function registrarActividad(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new ActividadRepository($userId);

            $tipo = $request->get_param('tipo');
            $elementoId = $request->get_param('elementoId');
            $elementoTipo = $request->get_param('elementoTipo');
            $proyectoId = $request->get_param('proyectoId');
            $fecha = $request->get_param('fecha');

            /* Validar tipo - tipos principales y tipos de corrección */
            $tiposValidos = [
                'tarea_completada',
                'habito_cumplido',
                'nota_creada',
                'adjunto_subido',
                'tarea_desmarcada',
                'habito_desmarcado',
                'habito_pospuesto'
            ];
            if (!in_array($tipo, $tiposValidos)) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Tipo de actividad no válido'
                ], 400);
            }

            $fechaActividad = $fecha ?: current_time('Y-m-d');
            $historialRepo = new HabitosHistorialRepository($userId);

            /* 
             * Si es habito_desmarcado, eliminar el registro de habito_cumplido existente
             * y también eliminar del historial de hábitos
             */
            if ($tipo === 'habito_desmarcado' && $elementoId && $elementoTipo === 'habito') {
                $repo->eliminarPorHabito($elementoId, $fechaActividad);
                $historialRepo->desmarcarDia($elementoId, $fechaActividad);
            }

            /* 
             * Si es tarea_desmarcada, eliminar el registro de tarea_completada existente
             */
            if ($tipo === 'tarea_desmarcada' && $elementoId && $elementoTipo === 'tarea') {
                $repo->eliminarPorTarea($elementoId, $fechaActividad);
            }

            /* 
             * Si es habito_cumplido, además de registrar en actividad,
             * también insertar en historial de hábitos (para sincronizar MapaCalorHabito)
             */
            if ($tipo === 'habito_cumplido' && $elementoId && $elementoTipo === 'habito') {
                $historialRepo->marcarDia($elementoId, $fechaActividad, 'completado', null);
            }

            /* 
             * Si es habito_pospuesto, registrar en historial como pospuesto
             */
            if ($tipo === 'habito_pospuesto' && $elementoId && $elementoTipo === 'habito') {
                $historialRepo->marcarDia($elementoId, $fechaActividad, 'pospuesto', null);
            }

            $resultado = $repo->registrar(
                $tipo,
                $elementoId ?: null,
                $elementoTipo ?: null,
                $proyectoId ?: null,
                $fecha ?: null
            );

            if (!$resultado) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al registrar actividad'
                ], 500);
            }

            return new \WP_REST_Response([
                'success' => true
            ], 201);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene el historial de un hábito
     */
    public static function obtenerHistorialHabito(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new HabitosHistorialRepository($userId);

            $habitoId = (int)$request->get_param('id');
            $dias = (int)($request->get_param('dias') ?: 30);

            $historial = $repo->obtenerUltimosDias($habitoId, $dias);
            $resumen7Dias = $repo->obtenerResumen7Dias($habitoId);
            $estadisticas = $repo->obtenerEstadisticas($habitoId, $dias);

            return new \WP_REST_Response([
                'success' => true,
                'historial' => $historial,
                'resumen7Dias' => $resumen7Dias,
                'estadisticas' => $estadisticas
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marca un día de hábito
     */
    public static function marcarDiaHabito(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new HabitosHistorialRepository($userId);

            $habitoId = (int)$request->get_param('id');
            $fecha = $request->get_param('fecha');
            $estado = $request->get_param('estado') ?: 'completado';
            $notas = $request->get_param('notas');

            /* Validar fecha (no futura) */
            if ($fecha > current_time('Y-m-d')) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'No se pueden marcar fechas futuras'
                ], 400);
            }

            /* Validar estado */
            $estadosValidos = ['completado', 'pospuesto', 'omitido'];
            if (!in_array($estado, $estadosValidos)) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Estado no válido'
                ], 400);
            }

            $resultado = $repo->marcarDia($habitoId, $fecha, $estado, $notas);

            if (!$resultado) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al marcar día'
                ], 500);
            }

            /* También registrar en actividad si es completado */
            if ($estado === 'completado') {
                $actividadRepo = new ActividadRepository($userId);
                $actividadRepo->registrar(
                    'habito_cumplido',
                    $habitoId,
                    'habito',
                    null,
                    $fecha
                );
            }

            /* Devolver el nuevo resumen */
            $resumen7Dias = $repo->obtenerResumen7Dias($habitoId);

            return new \WP_REST_Response([
                'success' => true,
                'resumen7Dias' => $resumen7Dias
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Desmarca un día de hábito
     */
    public static function desmarcarDiaHabito(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new HabitosHistorialRepository($userId);

            $habitoId = (int)$request->get_param('id');
            $fecha = $request->get_param('fecha');

            $resultado = $repo->desmarcarDia($habitoId, $fecha);

            if (!$resultado) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al desmarcar día'
                ], 500);
            }

            /* También eliminar de la tabla de actividad para que el heatmap se actualice */
            $actividadRepo = new ActividadRepository($userId);
            $actividadRepo->eliminarPorHabito($habitoId, $fecha);

            /* Devolver el nuevo resumen */
            $resumen7Dias = $repo->obtenerResumen7Dias($habitoId);

            return new \WP_REST_Response([
                'success' => true,
                'resumen7Dias' => $resumen7Dias
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene el resumen de 7 días para múltiples hábitos (optimizado)
     */
    public static function obtenerResumenMultiple(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new HabitosHistorialRepository($userId);

            $habitoIds = $request->get_param('habitoIds');

            if (!is_array($habitoIds) || empty($habitoIds)) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Se requiere un array de IDs de hábitos'
                ], 400);
            }

            /* Sanitizar IDs */
            $habitoIds = array_map('absint', $habitoIds);

            $historial = $repo->obtenerHistorialMultiple($habitoIds, 7);

            return new \WP_REST_Response([
                'success' => true,
                'historial' => $historial
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Limpia toda la actividad del usuario actual
     * Solo disponible para administradores (herramienta de desarrollo)
     */
    public static function limpiarActividad(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $repo = new ActividadRepository($userId);

            $eliminados = $repo->limpiarTodo();

            return new \WP_REST_Response([
                'success' => true,
                'eliminados' => $eliminados
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

ActividadApiController::register();

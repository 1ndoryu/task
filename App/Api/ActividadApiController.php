<?php

/**
 * Actividad API Controller
 *
 * Endpoints REST para heatmap de actividad y hábitos historial.
 * Delega lógica de negocio a ActividadService.
 *
 * @package App\Api
 */

namespace App\Api;

use App\Services\ActividadService;

class ActividadApiController
{
    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registrarRutas']);
    }

    public static function registrarRutas(): void
    {
        $ns = 'glory/v1';
        $perm = [self::class, 'verificarPermisos'];
        $str = ['required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field'];
        $int = ['required' => false, 'type' => 'integer', 'sanitize_callback' => 'absint'];

        register_rest_route($ns, '/actividad', [
            'methods' => 'GET', 'callback' => [self::class, 'obtenerHeatmap'], 'permission_callback' => $perm,
            'args' => [
                'fechaInicio' => $str, 'fechaFin' => $str, 'tipo' => $str,
                'proyectoId' => $int, 'habitoId' => $int, 'fechaHoyLocal' => $str,
                'periodo' => $str + ['default' => 'mes'],
            ]
        ]);

        register_rest_route($ns, '/actividad/estadisticas', [
            'methods' => 'GET', 'callback' => [self::class, 'obtenerEstadisticas'], 'permission_callback' => $perm,
            'args' => ['fechaInicio' => $str, 'fechaFin' => $str]
        ]);

        register_rest_route($ns, '/actividad/dia', [
            'methods' => 'GET', 'callback' => [self::class, 'obtenerDetalleDia'], 'permission_callback' => $perm,
            'args' => [
                'fecha' => ['required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field',
                            'validate_callback' => fn($p) => is_string($p) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $p)],
                'tipo' => $str, 'proyectoId' => $int, 'habitoId' => $int,
            ]
        ]);

        register_rest_route($ns, '/actividad', [
            'methods' => 'POST', 'callback' => [self::class, 'registrarActividad'], 'permission_callback' => $perm,
            'args' => [
                'tipo' => ['required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field'],
                'elementoId' => $int, 'elementoTipo' => $str, 'proyectoId' => $int, 'fecha' => $str, 'horaLocal' => $str,
                'detalles' => ['required' => false, 'type' => 'array', 'sanitize_callback' => fn($p) => is_array($p) ? $p : []],
            ]
        ]);

        register_rest_route($ns, '/habitos/(?P<id>\d+)/historial', [
            'methods' => 'GET', 'callback' => [self::class, 'obtenerHistorialHabito'], 'permission_callback' => $perm,
            'args' => ['id' => ['required' => true] + $int, 'dias' => $int + ['default' => 30]]
        ]);

        register_rest_route($ns, '/habitos/(?P<id>\d+)/historial', [
            'methods' => 'POST', 'callback' => [self::class, 'marcarDiaHabito'], 'permission_callback' => $perm,
            'args' => [
                'id' => ['required' => true] + $int,
                'fecha' => ['required' => true] + $str,
                'estado' => $str + ['default' => 'completado'],
                'notas' => ['required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field'],
            ]
        ]);

        register_rest_route($ns, '/habitos/(?P<id>\d+)/historial/(?P<fecha>[0-9\-]+)', [
            'methods' => 'DELETE', 'callback' => [self::class, 'desmarcarDiaHabito'], 'permission_callback' => $perm,
            'args' => ['id' => ['required' => true] + $int, 'fecha' => ['required' => true] + $str]
        ]);

        register_rest_route($ns, '/habitos/historial-resumen', [
            'methods' => 'POST', 'callback' => [self::class, 'obtenerResumenMultiple'], 'permission_callback' => $perm,
            'args' => ['habitoIds' => ['required' => true, 'type' => 'array']]
        ]);

        register_rest_route($ns, '/actividad/limpiar', [
            'methods' => 'DELETE', 'callback' => [self::class, 'limpiarActividad'],
            'permission_callback' => [self::class, 'verificarPermisosAdmin']
        ]);
    }

    public static function verificarPermisos(): bool
    {
        return is_user_logged_in();
    }

    public static function verificarPermisosAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    private static function error(string $msg, int $code = 500): \WP_REST_Response
    {
        return new \WP_REST_Response(['success' => false, 'error' => $msg], $code);
    }

    public static function obtenerHeatmap(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $resultado = (new ActividadService())->obtenerHeatmap(get_current_user_id(), $request->get_params());
            return new \WP_REST_Response(['success' => true] + $resultado, 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }

    public static function obtenerEstadisticas(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $resultado = (new ActividadService())->obtenerEstadisticas(
                get_current_user_id(), $request->get_param('fechaInicio'), $request->get_param('fechaFin')
            );
            return new \WP_REST_Response(['success' => true] + $resultado, 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }

    public static function obtenerDetalleDia(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $fecha = $request->get_param('fecha');
            if (!$fecha || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
                return self::error('Fecha inválida', 400);
            }

            $detalle = (new ActividadService())->obtenerDetalleDia(
                get_current_user_id(), $fecha,
                $request->get_param('tipo') ?: null,
                $request->get_param('proyectoId') ?: null,
                $request->get_param('habitoId') ?: null
            );
            return new \WP_REST_Response(['success' => true, 'fecha' => $fecha, 'detalle' => $detalle], 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }

    public static function registrarActividad(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $resultado = (new ActividadService())->registrarActividad(get_current_user_id(), $request->get_params());
            if (!$resultado['success']) {
                $code = ($resultado['error'] === 'Tipo de actividad no válido') ? 400 : 500;
                return self::error($resultado['error'], $code);
            }
            return new \WP_REST_Response($resultado, ($resultado['accion'] === 'eliminado') ? 200 : 201);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }

    public static function obtenerHistorialHabito(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $resultado = (new ActividadService())->obtenerHistorialHabito(
                get_current_user_id(), (int) $request->get_param('id'), (int) ($request->get_param('dias') ?: 30)
            );
            return new \WP_REST_Response(['success' => true] + $resultado, 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }

    public static function marcarDiaHabito(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $resultado = (new ActividadService())->marcarDiaHabito(
                get_current_user_id(), (int) $request->get_param('id'),
                $request->get_param('fecha'), $request->get_param('estado') ?: 'completado',
                $request->get_param('notas')
            );
            if (!$resultado['success']) {
                return self::error($resultado['error'], 400);
            }
            return new \WP_REST_Response($resultado, 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }

    public static function desmarcarDiaHabito(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $resultado = (new ActividadService())->desmarcarDiaHabito(
                get_current_user_id(), (int) $request->get_param('id'), $request->get_param('fecha')
            );
            if (!$resultado['success']) {
                return self::error($resultado['error']);
            }
            return new \WP_REST_Response($resultado, 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }

    public static function obtenerResumenMultiple(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $habitoIds = $request->get_param('habitoIds');
            if (!is_array($habitoIds) || empty($habitoIds)) {
                return self::error('Se requiere un array de IDs de hábitos', 400);
            }
            $historial = (new ActividadService())->obtenerResumenMultiple(get_current_user_id(), $habitoIds);
            return new \WP_REST_Response(['success' => true, 'historial' => $historial], 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }

    public static function limpiarActividad(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $eliminados = (new ActividadService())->limpiarActividad(get_current_user_id());
            return new \WP_REST_Response(['success' => true, 'eliminados' => $eliminados], 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage());
        }
    }
}

ActividadApiController::register();

<?php

/**
 * AI API Controller
 *
 * API REST Universal para Asistentes de IA. Delega lógica a AIService.
 *
 * @package App\Api
 */

namespace App\Api;

use App\Services\AIService;
use App\Services\AgentRateLimitService;
use App\Services\LLMProviderService;

class AIApiController
{
    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes(): void
    {
        $ns = 'glory/v1';
        $auth = [self::class, 'requireAuthentication'];
        $san = 'sanitize_text_field';
        $numVal = fn($p) => is_numeric($p);

        register_rest_route($ns, '/ai/tareas', [
            [
                'methods' => 'GET', 'callback' => [self::class, 'obtenerTareas'], 'permission_callback' => $auth,
                'args' => [
                    'filtro' => ['required' => false, 'default' => 'todas', 'enum' => ['pendientes', 'completadas', 'todas'], 'sanitize_callback' => $san],
                    'proyectoId' => ['required' => false, 'validate_callback' => $numVal, 'sanitize_callback' => 'absint'],
                    'proyecto_id' => ['required' => false, 'validate_callback' => $numVal, 'sanitize_callback' => 'absint'],
                ],
            ],
            [
                'methods' => 'POST', 'callback' => [self::class, 'crearTarea'], 'permission_callback' => $auth,
                'args' => [
                    'texto' => ['required' => true, 'validate_callback' => fn($p) => is_string($p) && strlen($p) > 0, 'sanitize_callback' => $san],
                    'proyectoId' => ['required' => false, 'validate_callback' => $numVal, 'sanitize_callback' => 'absint'],
                    'prioridad' => ['required' => false, 'enum' => ['Muy Alta', 'Alta', 'Media', 'Baja', 'Muy Baja', null], 'sanitize_callback' => $san],
                    'urgencia' => ['required' => false, 'default' => 'normal', 'enum' => ['bloqueante', 'urgente', 'normal', 'chill'], 'sanitize_callback' => $san],
                    'fechaMaxima' => ['required' => false, 'validate_callback' => fn($p) => is_string($p), 'sanitize_callback' => $san],
                ],
            ],
        ]);

        register_rest_route($ns, '/ai/tareas/(?P<id>\d+)', [
            ['methods' => 'GET', 'callback' => [self::class, 'obtenerTarea'], 'permission_callback' => $auth],
            [
                'methods' => 'PUT', 'callback' => [self::class, 'editarTarea'], 'permission_callback' => $auth,
                'args' => [
                    'texto' => ['required' => false, 'validate_callback' => fn($p) => is_string($p), 'sanitize_callback' => $san],
                    'prioridad' => ['required' => false, 'sanitize_callback' => $san],
                    'urgencia' => ['required' => false, 'enum' => ['bloqueante', 'urgente', 'normal', 'chill'], 'sanitize_callback' => $san],
                    'fechaMaxima' => ['required' => false, 'sanitize_callback' => $san],
                    'proyectoId' => ['required' => false, 'validate_callback' => fn($p) => is_numeric($p) || $p === null],
                ],
            ],
            ['methods' => 'DELETE', 'callback' => [self::class, 'eliminarTarea'], 'permission_callback' => $auth],
        ]);

        register_rest_route($ns, '/ai/tareas/(?P<id>\d+)/completar', [
            'methods' => 'POST', 'callback' => [self::class, 'completarTarea'], 'permission_callback' => $auth,
        ]);

        register_rest_route($ns, '/ai/proyectos', [
            'methods' => 'GET', 'callback' => [self::class, 'obtenerProyectos'], 'permission_callback' => $auth,
            'args' => ['estado' => ['required' => false, 'default' => 'todos', 'enum' => ['activo', 'completado', 'pausado', 'todos'], 'sanitize_callback' => $san]],
        ]);

        register_rest_route($ns, '/ai/proyectos/(?P<id>\d+)', [
            'methods' => 'GET', 'callback' => [self::class, 'obtenerProyecto'], 'permission_callback' => $auth,
            'args' => ['filtro' => ['required' => false, 'default' => 'todas', 'enum' => ['pendientes', 'completadas', 'todas'], 'sanitize_callback' => $san]],
        ]);

        register_rest_route($ns, '/ai/habitos', [
            'methods' => 'GET', 'callback' => [self::class, 'obtenerHabitos'], 'permission_callback' => $auth,
            'args' => ['importancia' => ['required' => false, 'enum' => ['Muy Alta', 'Alta', 'Media', 'Baja', 'Muy Baja'], 'sanitize_callback' => $san]],
        ]);

        register_rest_route($ns, '/ai/resumen', [
            'methods' => 'GET', 'callback' => [self::class, 'obtenerResumen'], 'permission_callback' => $auth,
        ]);

        register_rest_route($ns, '/ai/chat', [
            'methods' => 'POST', 'callback' => [self::class, 'enviarChat'], 'permission_callback' => $auth,
        ]);

        register_rest_route($ns, '/ai/nutricion', [
            'methods' => 'POST', 'callback' => [self::class, 'estimarNutricion'], 'permission_callback' => $auth,
        ]);
    }

    public static function requireAuthentication(): bool
    {
        return is_user_logged_in();
    }

    private static function ok(array $data, int $code = 200): \WP_REST_Response
    {
        return new \WP_REST_Response([
            'success' => true, 'data' => $data,
            'meta' => ['userId' => get_current_user_id(), 'timestamp' => current_time('c')],
        ], $code);
    }

    private static function error(string $msg, string $code, int $status = 500): \WP_REST_Response
    {
        return new \WP_REST_Response(['success' => false, 'error' => ['code' => $code, 'message' => $msg]], $status);
    }

    public static function obtenerTareas(\WP_REST_Request $request): \WP_REST_Response
    {
        $filtro = $request->get_param('filtro');
        $proyectoId = $request->get_param('proyectoId') ?? $request->get_param('proyecto_id') ?? $request->get_param('proyecto');
        $completado = $request->get_param('completado');
        if ($completado !== null && $filtro === 'todas') {
            $filtro = filter_var($completado, FILTER_VALIDATE_BOOLEAN) ? 'completadas' : 'pendientes';
        }
        try {
            return self::ok((new AIService())->obtenerTareas(get_current_user_id(), $filtro, $proyectoId !== null ? (int) $proyectoId : null));
        } catch (\Exception $e) {
            return self::error('Error al obtener tareas: ' . $e->getMessage(), 'tareas_error');
        }
    }

    public static function obtenerTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $tarea = (new AIService())->obtenerTarea(get_current_user_id(), (int) $request->get_param('id'));
            return $tarea === null
                ? self::error('Tarea no encontrada', 'tarea_no_encontrada', 404)
                : self::ok(['tarea' => $tarea]);
        } catch (\Exception $e) {
            return self::error('Error al obtener tarea: ' . $e->getMessage(), 'tarea_error');
        }
    }

    public static function crearTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $nuevaTarea = (new AIService())->crearTarea(get_current_user_id(), [
                'texto' => $request->get_param('texto'), 'proyectoId' => $request->get_param('proyectoId'),
                'prioridad' => $request->get_param('prioridad'), 'urgencia' => $request->get_param('urgencia'),
                'fechaMaxima' => $request->get_param('fechaMaxima'),
            ]);
            return self::ok(['mensaje' => 'Tarea creada exitosamente', 'tarea' => $nuevaTarea], 201);
        } catch (\Exception $e) {
            return self::error('Error al crear tarea: ' . $e->getMessage(), 'crear_tarea_error');
        }
    }

    public static function editarTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $datos = array_filter(
                array_map(fn($c) => $request->get_param($c), array_flip(['texto', 'prioridad', 'urgencia', 'fechaMaxima', 'proyectoId'])),
                fn($v) => $v !== null
            );
            $tarea = (new AIService())->editarTarea(get_current_user_id(), (int) $request->get_param('id'), $datos);
            return $tarea === null
                ? self::error('Tarea no encontrada', 'tarea_no_encontrada', 404)
                : self::ok(['mensaje' => 'Tarea actualizada exitosamente', 'tarea' => $tarea]);
        } catch (\Exception $e) {
            return self::error('Error al editar tarea: ' . $e->getMessage(), 'editar_tarea_error');
        }
    }

    public static function completarTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $r = (new AIService())->completarTarea(get_current_user_id(), (int) $request->get_param('id'));
            return !$r['success']
                ? self::error('Tarea no encontrada', 'tarea_no_encontrada', 404)
                : self::ok(['mensaje' => $r['mensaje'], 'tarea' => $r['tarea'], 'completado' => $r['completado']]);
        } catch (\Exception $e) {
            return self::error('Error al completar tarea: ' . $e->getMessage(), 'completar_tarea_error');
        }
    }

    public static function eliminarTarea(\WP_REST_Request $request): \WP_REST_Response
    {
        $tareaId = (int) $request->get_param('id');
        try {
            return !(new AIService())->eliminarTarea(get_current_user_id(), $tareaId)
                ? self::error('Tarea no encontrada', 'tarea_no_encontrada', 404)
                : self::ok(['mensaje' => 'Tarea eliminada exitosamente', 'tareaId' => $tareaId]);
        } catch (\Exception $e) {
            return self::error('Error al eliminar tarea: ' . $e->getMessage(), 'eliminar_tarea_error');
        }
    }

    public static function obtenerProyectos(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            return self::ok((new AIService())->obtenerProyectos(get_current_user_id(), $request->get_param('estado')));
        } catch (\Exception $e) {
            return self::error('Error al obtener proyectos: ' . $e->getMessage(), 'proyectos_error');
        }
    }

    public static function obtenerProyecto(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $r = (new AIService())->obtenerProyecto(get_current_user_id(), (int) $request->get_param('id'), $request->get_param('filtro'));
            return $r === null
                ? self::error('Proyecto no encontrado', 'proyecto_no_encontrado', 404)
                : self::ok($r);
        } catch (\Exception $e) {
            return self::error('Error al obtener proyecto: ' . $e->getMessage(), 'proyecto_error');
        }
    }

    public static function obtenerHabitos(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            return self::ok((new AIService())->obtenerHabitos(get_current_user_id(), $request->get_param('importancia')));
        } catch (\Exception $e) {
            return self::error('Error al obtener hábitos: ' . $e->getMessage(), 'habitos_error');
        }
    }

    public static function obtenerResumen(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            return self::ok((new AIService())->obtenerResumen(get_current_user_id()));
        } catch (\Exception $e) {
            return self::error('Error al obtener resumen: ' . $e->getMessage(), 'resumen_error');
        }
    }

    public static function enviarChat(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!current_user_can('manage_options')) {
            return self::error('Los usuarios normales deben usar su propia API key desde el navegador.', 'ia_env_solo_admin', 403);
        }

        try {
            $json = $request->get_json_params();
            $json = is_array($json) ? $json : [];
            (new AgentRateLimitService())->assertAllowed(get_current_user_id(), 'ai_chat_backend', 80, HOUR_IN_SECONDS);
            $maxTokens = isset($json['maxTokens']) ? (int)$json['maxTokens'] : 2048;
            $maxTokens = max(64, min(4096, $maxTokens));
            $resultado = (new LLMProviderService())->enviarChat(
                is_array($json['messages'] ?? null) ? $json['messages'] : [],
                sanitize_text_field((string)($json['provider'] ?? 'groq')),
                sanitize_text_field((string)($json['model'] ?? 'meta-llama/llama-4-scout-17b-16e-instruct')),
                [
                    'temperature' => isset($json['temperature']) ? (float)$json['temperature'] : 0.7,
                    'maxTokens' => $maxTokens,
                ]
            );
            return self::ok($resultado);
        } catch (\Throwable $e) {
            error_log('[AIApiController] Error en enviarChat: ' . $e->getMessage());
            return self::error($e->getMessage(), 'ia_chat_error', 500);
        }
    }

    public static function estimarNutricion(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!current_user_can('manage_options')) {
            return self::error('Los usuarios normales deben configurar su propia API key para nutrición.', 'nutricion_env_solo_admin', 403);
        }

        try {
            $json = $request->get_json_params();
            $json = is_array($json) ? $json : [];
            (new AgentRateLimitService())->assertAllowed(get_current_user_id(), 'ai_nutrition_backend', 60, HOUR_IN_SECONDS);
            $resultado = (new LLMProviderService())->estimarNutricion(
                (string)($json['descripcion'] ?? ''),
                sanitize_text_field((string)($json['provider'] ?? 'groq')),
                sanitize_text_field((string)($json['model'] ?? 'meta-llama/llama-4-scout-17b-16e-instruct'))
            );
            return self::ok($resultado);
        } catch (\Throwable $e) {
            error_log('[AIApiController] Error en estimarNutricion: ' . $e->getMessage());
            return self::error($e->getMessage(), 'nutricion_error', 500);
        }
    }
}

AIApiController::register();

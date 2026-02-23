<?php

/**
 * Feedback API Controller
 *
 * Maneja los endpoints REST para el sistema de comentarios/feedback de usuarios Premium.
 * Los usuarios Premium pueden enviar hasta 3 comentarios por día.
 * Delega toda la lógica de datos a FeedbackService.
 *
 * Endpoints:
 * - POST  /wp-json/glory/v1/feedback          → Enviar feedback (solo Premium)
 * - GET   /wp-json/glory/v1/feedback/restante → Comentarios restantes del día
 * - GET   /wp-json/glory/v1/admin/feedback    → Listar todos (solo Admin)
 * - PUT   /wp-json/glory/v1/admin/feedback/{id}/leido → Marcar como leído (Admin)
 *
 * @package App\Api
 */

namespace App\Api;

use App\Services\FeedbackService;
use App\Services\SuscripcionService;

class FeedbackApiController
{
    private const API_NAMESPACE = 'glory/v1';

    /**
     * Registra los endpoints REST
     */
    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    /**
     * Define las rutas REST
     */
    public static function registerRoutes(): void
    {
        /* Enviar feedback (solo Premium) */
        register_rest_route(self::API_NAMESPACE, '/feedback', [
            'methods' => \WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'enviar'],
            'permission_callback' => [self::class, 'requirePremium'],
            'args' => [
                'tipo' => [
                    'required' => true,
                    'validate_callback' => fn($val) => in_array($val, ['sugerencia', 'bug', 'otro']),
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'mensaje' => [
                    'required' => true,
                    'validate_callback' => fn($val) => is_string($val) && strlen($val) >= 10 && strlen($val) <= 2000,
                    'sanitize_callback' => 'sanitize_textarea_field',
                ],
            ],
        ]);

        /* Comentarios restantes del día */
        register_rest_route(self::API_NAMESPACE, '/feedback/restante', [
            'methods' => \WP_REST_Server::READABLE,
            'callback' => [self::class, 'obtenerRestante'],
            'permission_callback' => [self::class, 'requireAuthentication'],
        ]);

        /* Listar feedback (solo Admin) */
        register_rest_route(self::API_NAMESPACE, '/admin/feedback', [
            'methods' => \WP_REST_Server::READABLE,
            'callback' => [self::class, 'listar'],
            'permission_callback' => [self::class, 'requireAdmin'],
            'args' => [
                'pagina' => [
                    'default' => 1,
                    'sanitize_callback' => 'absint',
                ],
                'porPagina' => [
                    'default' => 20,
                    'sanitize_callback' => 'absint',
                ],
                'soloNoLeidos' => [
                    'default' => false,
                    'sanitize_callback' => fn($val) => filter_var($val, FILTER_VALIDATE_BOOLEAN),
                ],
            ],
        ]);

        /* Marcar como leído (Admin) */
        register_rest_route(self::API_NAMESPACE, '/admin/feedback/(?P<id>\d+)/leido', [
            'methods' => \WP_REST_Server::EDITABLE,
            'callback' => [self::class, 'marcarLeido'],
            'permission_callback' => [self::class, 'requireAdmin'],
        ]);
    }

    /**
     * Verifica autenticación básica
     */
    public static function requireAuthentication(): bool
    {
        return is_user_logged_in();
    }

    /**
     * Verifica que el usuario sea Premium activo
     */
    public static function requirePremium(): bool
    {
        try {
            if (!is_user_logged_in()) return false;
            
            $servicioSuscripcion = new SuscripcionService(get_current_user_id());
            return $servicioSuscripcion->esPremium();
        } catch (\Throwable $e) {
            error_log('[FeedbackApiController] Error en requirePremium: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Verifica que el usuario sea administrador
     */
    public static function requireAdmin(): bool
    {
        return current_user_can('manage_options');
    }

    /**
     * Envía un nuevo feedback
     */
    public static function enviar(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $servicio = new FeedbackService();

            /* Verificar limite diario */
            $restante = $servicio->obtenerComentariosRestantes($userId);
            if ($restante <= 0) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Has alcanzado el limite de 3 comentarios por dia. Intenta manana.'
                ], 429);
            }

            $tipo = $request->get_param('tipo');
            $mensaje = $request->get_param('mensaje');

            $resultado = $servicio->crear($userId, $tipo, $mensaje);

            if ($resultado === false) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al enviar el comentario'
                ], 500);
            }

            return new \WP_REST_Response([
                'success' => true,
                'restante' => $restante - 1,
                'mensaje' => 'Gracias por tu feedback! Lo leeremos pronto.'
            ], 201);
        } catch (\Throwable $e) {
            error_log('[FeedbackApiController] Error en enviar: ' . $e->getMessage());
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtiene la cantidad de comentarios restantes del día
     */
    public static function obtenerRestante(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $servicioSuscripcion = new SuscripcionService($userId);
            $esPremium = $servicioSuscripcion->esPremium();
            $servicio = new FeedbackService();

            return new \WP_REST_Response([
                'success' => true,
                'esPremium' => $esPremium,
                'restante' => $esPremium ? $servicio->obtenerComentariosRestantes($userId) : 0,
                'limite' => $servicio->getLimiteDiario()
            ]);
        } catch (\Throwable $e) {
            error_log('[FeedbackApiController] Error en obtenerRestante: ' . $e->getMessage());
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Lista todos los feedback para administradores
     */
    public static function listar(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $pagina = max(1, (int) $request->get_param('pagina'));
            $porPagina = min(50, max(1, (int) $request->get_param('porPagina')));
            $soloNoLeidos = $request->get_param('soloNoLeidos');

            $servicio = new FeedbackService();
            $resultado = $servicio->listar($pagina, $porPagina, (bool) $soloNoLeidos);

            return new \WP_REST_Response([
                'success' => true,
                'feedbacks' => array_map(fn($f) => [
                    'id' => (int) $f['id'],
                    'userId' => (int) $f['user_id'],
                    'usuarioNombre' => $f['usuario_nombre'],
                    'usuarioEmail' => $f['usuario_email'],
                    'tipo' => $f['tipo'],
                    'mensaje' => $f['mensaje'],
                    'leido' => (bool) $f['leido'],
                    'fechaCreacion' => $f['fecha_creacion']
                ], $resultado['feedbacks']),
                'total' => $resultado['total'],
                'noLeidos' => $resultado['noLeidos'],
                'pagina' => $pagina,
                'totalPaginas' => ceil($resultado['total'] / $porPagina)
            ]);
        } catch (\Throwable $e) {
            error_log('[FeedbackApiController] Error en listar: ' . $e->getMessage());
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Marca un feedback como leído
     */
    public static function marcarLeido(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $id = (int) $request->get_param('id');
            $servicio = new FeedbackService();
            $servicio->marcarLeido($id);

            return new \WP_REST_Response(['success' => true]);
        } catch (\Throwable $e) {
            error_log('[FeedbackApiController] Error en marcarLeido: ' . $e->getMessage());
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }
}

/* Auto-registro del controlador */
FeedbackApiController::register();

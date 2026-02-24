<?php

/**
 * Mensajes API Controller
 *
 * Maneja los endpoints REST para el sistema de timeline (chat + historial)
 *
 * Endpoints:
 * - GET /wp-json/glory/v1/mensajes/{tipo}/{id} -> Obtener timeline (marca como leído)
 * - POST /wp-json/glory/v1/mensajes -> Enviar mensaje
 *
 * Endpoints de leidos/no-leidos -> ver MensajesLeidosApiController
 *
 * @package App\Api
 */

namespace App\Api;

use App\Database\Schema;
use App\Repository\MensajesRepository;
use App\Services\MensajesService;

class MensajesApiController
{
    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registrarRutas']);
    }

    public static function registrarRutas(): void
    {
        $namespace = 'glory/v1';

        /* Obtener timeline de un elemento */
        register_rest_route($namespace, '/mensajes/(?P<tipo>[a-z]+)/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [self::class, 'obtenerTimeline'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'tipo' => [
                    'required' => true,
                    'type' => 'string',
                    'enum' => ['tarea', 'proyecto', 'habito'],
                    'description' => 'Tipo de elemento'
                ],
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'ID del elemento'
                ],
                'limite' => [
                    'type' => 'integer',
                    'default' => 50,
                    'minimum' => 1,
                    'maximum' => 100
                ],
                'offset' => [
                    'type' => 'integer',
                    'default' => 0,
                    'minimum' => 0
                ]
            ]
        ]);

        /* Enviar mensaje */
        register_rest_route($namespace, '/mensajes', [
            'methods' => 'POST',
            'callback' => [self::class, 'enviarMensaje'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'tipoElemento' => [
                    'required' => true,
                    'type' => 'string',
                    'enum' => ['tarea', 'proyecto', 'habito'],
                    'description' => 'Tipo de elemento'
                ],
                'elementoId' => [
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'ID del elemento'
                ],
                'contenido' => [
                    'required' => true,
                    'type' => 'string',
                    'minLength' => 1,
                    'maxLength' => 2000,
                    'sanitize_callback' => 'sanitize_textarea_field',
                    'description' => 'Contenido del mensaje'
                ]
            ]
        ]);

        /* Contar mensajes (para badge) */
        register_rest_route($namespace, '/mensajes/contar/(?P<tipo>[a-z]+)/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [self::class, 'contarMensajes'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'tipo' => [
                    'required' => true,
                    'type' => 'string',
                    'enum' => ['tarea', 'proyecto', 'habito']
                ],
                'id' => [
                    'required' => true,
                    'type' => 'integer'
                ]
            ]
        ]);

        /* 
         * Registrar evento del sistema (historial)
         * Usado por el frontend para registrar cambios automáticamente
         */
        register_rest_route($namespace, '/mensajes/evento', [
            'methods' => 'POST',
            'callback' => [self::class, 'registrarEvento'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'tipoElemento' => [
                    'required' => true,
                    'type' => 'string',
                    'enum' => ['tarea', 'proyecto', 'habito']
                ],
                'elementoId' => [
                    'required' => true,
                    'type' => 'integer'
                ],
                'accion' => [
                    'required' => true,
                    'type' => 'string',
                    'enum' => ['creado', 'editado', 'completado', 'reabierto', 'asignado', 'desasignado', 'adjunto_agregado', 'adjunto_eliminado', 'prioridad', 'urgencia', 'fecha_limite', 'participante_agregado', 'participante_removido', 'compartido', 'descripcion', 'nombre']
                ],
                'detalle' => [
                    'type' => 'string',
                    'default' => null,
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
        ]);
    }

    /**
     * Verifica que el usuario este autenticado
     */
    public static function verificarPermisos(): bool
    {
        return is_user_logged_in();
    }

    /**
     * Obtiene el timeline de un elemento
     */
    public static function obtenerTimeline(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tipo = $request->get_param('tipo');
        $elementoId = (int)$request->get_param('id');
        $limite = (int)$request->get_param('limite');
        $offset = (int)$request->get_param('offset');

        /* Verificar acceso al elemento */
        if (!MensajesService::tieneAccesoAElemento($userId, $tipo, $elementoId)) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'No tienes acceso a este elemento'
            ], 403);
        }

        try {
            /* Asegurar que la tabla existe (migracion automatica) */
            Schema::ensureTableExists('mensajes');

            $repo = new MensajesRepository($userId);
            $mensajes = $repo->obtenerTimeline($tipo, $elementoId, $limite, $offset);
            $total = $repo->contarMensajes($tipo, $elementoId);

            /* Obtener avatares de usuarios */
            $mensajes = array_map(function ($mensaje) {
                $mensaje['avatar'] = get_avatar_url($mensaje['usuarioId'], ['size' => 40]);
                return $mensaje;
            }, $mensajes);

            /* Marcar como leído automáticamente al ver el timeline */
            $repo->marcarComoLeido($tipo, $elementoId);

            return new \WP_REST_Response([
                'success' => true,
                'mensajes' => $mensajes,
                'total' => $total,
                'limite' => $limite,
                'offset' => $offset
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Envia un mensaje de usuario
     */
    public static function enviarMensaje(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tipoElemento = $request->get_param('tipoElemento');
        $elementoId = (int)$request->get_param('elementoId');
        $contenido = $request->get_param('contenido');

        /* Verificar acceso al elemento */
        if (!MensajesService::tieneAccesoAElemento($userId, $tipoElemento, $elementoId)) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'No tienes acceso a este elemento'
            ], 403);
        }

        /* Validar contenido */
        if (empty(trim($contenido))) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'El mensaje no puede estar vacio'
            ], 400);
        }

        try {
            /* Asegurar que la tabla existe */
            Schema::ensureTableExists('mensajes');

            $repo = new MensajesRepository($userId);
            $mensaje = $repo->enviarMensaje($tipoElemento, $elementoId, $contenido);

            if (!$mensaje) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al enviar el mensaje'
                ], 500);
            }

            /* Agregar avatar */
            $mensaje['avatar'] = get_avatar_url($userId, ['size' => 40]);

            /* Notificar a los otros participantes del elemento */
            MensajesService::notificarParticipantesMensaje($userId, $tipoElemento, $elementoId, $contenido);

            return new \WP_REST_Response([
                'success' => true,
                'mensaje' => $mensaje
            ], 201);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cuenta los mensajes de un elemento
     */
    public static function contarMensajes(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tipo = $request->get_param('tipo');
        $elementoId = (int)$request->get_param('id');

        if (!MensajesService::tieneAccesoAElemento($userId, $tipo, $elementoId)) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'No tienes acceso a este elemento'
            ], 403);
        }

        try {
            Schema::ensureTableExists('mensajes');

            $repo = new MensajesRepository($userId);
            $total = $repo->contarMensajes($tipo, $elementoId);

            return new \WP_REST_Response([
                'success' => true,
                'total' => $total
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Registra un evento del sistema (historial de cambios)
     */
    public static function registrarEvento(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tipoElemento = $request->get_param('tipoElemento');
        $elementoId = (int)$request->get_param('elementoId');
        $accion = $request->get_param('accion');
        $detalle = $request->get_param('detalle');

        /* 
         * Para eventos del sistema, no devolvemos 403 si el elemento no existe.
         * Esto puede ocurrir por timing de sincronización: el frontend intenta
         * registrar un evento antes de que la tarea se haya guardado en la BD.
         * En ese caso, simplemente retornamos success: false sin error HTTP.
         */
        if (!MensajesService::tieneAccesoAElemento($userId, $tipoElemento, $elementoId)) {
            return new \WP_REST_Response([
                'success' => false,
                'skipped' => true,
                'reason' => 'elemento_no_encontrado'
            ], 200);
        }

        try {
            Schema::ensureTableExists('mensajes');

            $resultado = MensajesService::registrarEvento(
                $tipoElemento,
                $elementoId,
                $userId,
                $accion,
                $detalle
            );

            if (!$resultado) {
                return new \WP_REST_Response([
                    'success' => false,
                    'error' => 'Error al registrar evento'
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

}

MensajesApiController::register();

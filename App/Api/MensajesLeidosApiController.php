<?php

/**
 * Mensajes Leidos API Controller
 *
 * Maneja los endpoints REST para el sistema de lectura de mensajes (marcar leido, contar no leidos)
 *
 * Endpoints:
 * - POST /wp-json/glory/v1/mensajes/marcar-leido -> Marcar mensajes como leidos
 * - GET /wp-json/glory/v1/mensajes/no-leidos/{tipo}/{id} -> Contar no leidos de un elemento
 * - POST /wp-json/glory/v1/mensajes/no-leidos-masivo -> Contar no leidos de multiples elementos
 *
 * @package App\Api
 */

namespace App\Api;

use App\Database\Schema;
use App\Repository\MensajesRepository;
use App\Services\MensajesService;

class MensajesLeidosApiController
{
    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registrarRutas']);
    }

    public static function registrarRutas(): void
    {
        $namespace = 'glory/v1';

        /* Marcar mensajes como leidos */
        register_rest_route($namespace, '/mensajes/marcar-leido', [
            'methods' => 'POST',
            'callback' => [self::class, 'marcarComoLeido'],
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
                ]
            ]
        ]);

        /* Contar mensajes no leidos de un elemento */
        register_rest_route($namespace, '/mensajes/no-leidos/(?P<tipo>[a-z]+)/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [self::class, 'contarNoLeidos'],
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

        /* Contar no leidos de multiples elementos (para badges en lista) */
        register_rest_route($namespace, '/mensajes/no-leidos-masivo', [
            'methods' => 'POST',
            'callback' => [self::class, 'contarNoLeidosMasivo'],
            'permission_callback' => [self::class, 'verificarPermisos'],
            'args' => [
                'tipoElemento' => [
                    'required' => true,
                    'type' => 'string',
                    'enum' => ['tarea', 'proyecto', 'habito']
                ],
                'elementoIds' => [
                    'required' => true,
                    'type' => 'array',
                    'items' => ['type' => 'integer']
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
     * Marca los mensajes de un elemento como leidos
     */
    public static function marcarComoLeido(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tipoElemento = $request->get_param('tipoElemento');
        $elementoId = (int)$request->get_param('elementoId');

        if (!MensajesService::tieneAccesoAElemento($userId, $tipoElemento, $elementoId)) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => 'No tienes acceso a este elemento'
            ], 403);
        }

        try {
            Schema::ensureTableExists('mensajes_leidos');

            $repo = new MensajesRepository($userId);
            $repo->marcarComoLeido($tipoElemento, $elementoId);

            return new \WP_REST_Response([
                'success' => true
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cuenta los mensajes no leidos de un elemento
     */
    public static function contarNoLeidos(\WP_REST_Request $request): \WP_REST_Response
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
            Schema::ensureTableExists('mensajes_leidos');

            $repo = new MensajesRepository($userId);
            $noLeidos = $repo->contarNoLeidos($tipo, $elementoId);

            return new \WP_REST_Response([
                'success' => true,
                'noLeidos' => $noLeidos
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cuenta mensajes no leidos de multiples elementos (para badges en lista)
     */
    public static function contarNoLeidosMasivo(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = get_current_user_id();
        $tipoElemento = $request->get_param('tipoElemento');
        $elementoIds = $request->get_param('elementoIds');

        if (!is_array($elementoIds) || empty($elementoIds)) {
            return new \WP_REST_Response([
                'success' => true,
                'noLeidos' => []
            ], 200);
        }

        /* Filtrar solo IDs a los que tiene acceso */
        $idsConAcceso = array_filter($elementoIds, function ($id) use ($userId, $tipoElemento) {
            return MensajesService::tieneAccesoAElemento($userId, $tipoElemento, (int)$id);
        });

        if (empty($idsConAcceso)) {
            return new \WP_REST_Response([
                'success' => true,
                'noLeidos' => []
            ], 200);
        }

        try {
            Schema::ensureTableExists('mensajes_leidos');

            $repo = new MensajesRepository($userId);
            $noLeidos = $repo->contarNoLeidosMasivo($tipoElemento, array_map('intval', $idsConAcceso));

            return new \WP_REST_Response([
                'success' => true,
                'noLeidos' => $noLeidos
            ], 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

MensajesLeidosApiController::register();

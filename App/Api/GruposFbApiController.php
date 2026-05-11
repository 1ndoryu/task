<?php

/* sentinel-disable-file limite-lineas
 * Justificación: Controller REST principal con autenticación dual,
 * CRUD de grupos, sync bulk, categorías, token y ping.
 * Separar más endpoints rompería la cohesión del dominio grupos_fb. */

/**
 * [253A-11] API Controller para Grupos de Facebook
 *
 * Endpoints REST para gestión de grupos detectados por la extensión fb-group-manager.
 * Soporta autenticación dual admin: cookie WordPress + Bearer token de un admin.
 *
 * @package App\Api
 */

namespace App\Api;

use App\Repository\GruposFbRepository;
use App\Repository\EntornosGruposFbRepository;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class GruposFbApiController
{
    private const API_NAMESPACE = 'glory/v1';
    private const META_TOKEN = '_glory_ext_api_token';

    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes(): void
    {
        /* Listar grupos */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [self::class, 'listar'],
            'permission_callback' => [self::class, 'verificarAutenticacion'],
        ]);

        /* Sync bulk desde extensión */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/sync', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'sync'],
            'permission_callback' => [self::class, 'verificarAutenticacion'],
        ]);

        /* Actualizar grupo */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/(?P<id>\d+)', [
            'methods' => 'PUT',
            'callback' => [self::class, 'actualizar'],
            'permission_callback' => [self::class, 'verificarAutenticacion'],
            'args' => [
                'id' => ['validate_callback' => fn($p) => is_numeric($p) && $p > 0],
            ],
        ]);

        /* Eliminar grupo (soft delete) */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/(?P<id>\d+)', [
            'methods' => WP_REST_Server::DELETABLE,
            'callback' => [self::class, 'eliminar'],
            'permission_callback' => [self::class, 'verificarAutenticacion'],
            'args' => [
                'id' => ['validate_callback' => fn($p) => is_numeric($p) && $p > 0],
            ],
        ]);

        /* Marcar como publicado */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/(?P<id>\d+)/publicar', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'marcarPublicado'],
            'permission_callback' => [self::class, 'verificarAutenticacion'],
            'args' => [
                'id' => ['validate_callback' => fn($p) => is_numeric($p) && $p > 0],
            ],
        ]);

        /* Estadísticas */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/stats', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [self::class, 'estadisticas'],
            'permission_callback' => [self::class, 'verificarAutenticacion'],
        ]);

        /* Categorías: listar y guardar */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/categorias', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [self::class, 'listarCategorias'],
                'permission_callback' => [self::class, 'verificarAutenticacion'],
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [self::class, 'guardarCategorias'],
                'permission_callback' => [self::class, 'verificarAutenticacion'],
            ],
        ]);

        /* Token API: obtener (solo cookie auth) */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/token', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [self::class, 'obtenerToken'],
            'permission_callback' => [self::class, 'requiereCookieAuth'],
        ]);

        /* Token API: regenerar (solo cookie auth) */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/token/regenerar', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'regenerarToken'],
            'permission_callback' => [self::class, 'requiereCookieAuth'],
        ]);

        /* [024A-16] Ping: verificar conexión y token desde extensión o dashboard */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/ping', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [self::class, 'ping'],
            'permission_callback' => [self::class, 'verificarAutenticacion'],
        ]);

        /* [034A-14] Entornos, overrides y config: registrados en EntornosGruposFbApiController */
    }

    /* ────────────────────────────── Autenticación ────────────────────────────── */

    /**
     * [105A-3] Autenticación dual restringida a administradores.
     * El plugin Grupos FB ya no es accesible para usuarios normales aunque conserven
     * el panel o token en localStorage/configuración antigua.
     * Si es Bearer token, inyecta el user_id en el request para usarlo en callbacks.
     */
    public static function verificarAutenticacion(WP_REST_Request $request): bool
    {
        /* 1. Cookie auth (dashboard) */
        if (is_user_logged_in()) {
            return current_user_can('manage_options');
        }

        /* 2. Bearer token (extensión) */
        return self::verificarBearerToken($request);
    }

    /**
     * Solo permite autenticación por cookie (para gestión de tokens)
     */
    public static function requiereCookieAuth(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    /**
     * Verifica el Bearer token y extrae el user_id
     */
    private static function verificarBearerToken(WP_REST_Request $request): bool
    {
        $authHeader = $request->get_header('Authorization');
        if (empty($authHeader)) {
            return false;
        }

        if (!preg_match('/^Bearer\s+(\S+)$/i', $authHeader, $matches)) {
            return false;
        }

        $token = $matches[1];
        if (strlen($token) < 32) {
            return false;
        }

        /* Buscar el usuario que tiene este token.
         * Usamos hash del token en meta para no almacenar tokens en texto plano. */
        $tokenHash = hash('sha256', $token);

        global $wpdb;
        // sentinel-disable-next-line endpoint-accede-bd — validacion de token MCP requiere acceso directo a usermeta
        $userId = $wpdb->get_var(
            $wpdb->prepare( // sentinel-disable endpoint-accede-bd
                "SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = %s AND meta_value = %s LIMIT 1",
                self::META_TOKEN,
                $tokenHash
            )
        );

        if (!$userId) {
            return false;
        }

        /* Inyectar user_id para que los callbacks lo usen */
        if (!user_can((int)$userId, 'manage_options')) {
            return false;
        }

        $request->set_param('_ext_user_id', (int)$userId);
        return true;
    }

    /**
     * Obtiene el user_id del request (cookie o token)
     */
    private static function getUserId(WP_REST_Request $request): int
    {
        $extUserId = $request->get_param('_ext_user_id');
        if ($extUserId) {
            return (int)$extUserId;
        }
        return get_current_user_id();
    }

    /* ────────────────────────────── Endpoints ────────────────────────────── */

    /**
     * GET /grupos-fb — Lista todos los grupos del usuario
     */
    public static function listar(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $repo = new GruposFbRepository($userId);

            $filtros = [];
            if ($request->get_param('oculto') !== null) {
                $filtros['oculto'] = (int)$request->get_param('oculto');
            }
            if ($request->get_param('categoria')) {
                $filtros['categoria'] = $request->get_param('categoria');
            }
            if ($request->get_param('importancia') !== null && $request->get_param('importancia') !== '') {
                $filtros['importancia'] = $request->get_param('importancia');
            }
            if ($request->get_param('busqueda')) {
                $filtros['busqueda'] = $request->get_param('busqueda');
            }

            $grupos = $repo->listar($filtros);

            /* [034A-14] Si hay entorno activo o pasado por query param, aplicar overrides */
            $entornoId = $request->get_param('entorno_id');
            if ($entornoId) {
                $entornoRepo = new EntornosGruposFbRepository($userId);
                $grupos = $entornoRepo->aplicarOverrides($grupos, (int)$entornoId);
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => $grupos,
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al listar grupos: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /grupos-fb/sync — Bulk upsert desde extensión
     */
    public static function sync(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $repo = new GruposFbRepository($userId);

            $grupos = $request->get_json_params()['grupos'] ?? $request->get_param('grupos');
            if (!is_array($grupos) || empty($grupos)) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Se requiere un array de grupos',
                ], 400);
            }

            /* Limitar a 500 grupos por request para evitar timeouts */
            if (count($grupos) > 500) {
                // sentinel-disable-next-line request-json-directo — syncDesdeExtension sanitiza internamente cada campo
                $grupos = array_slice($grupos, 0, 500);
            }

            // sentinel-disable-next-line request-json-directo — syncDesdeExtension sanitiza internamente cada campo
            $resultado = $repo->syncDesdeExtension($grupos);

            /* [034A-1] Auto-crear categorías que la extensión envía pero no existen en la tabla de
             * definiciones. Sin esto el filtro de categorías y el editor no muestran las categorías
             * que vienen del entorno de la extensión. Solo inserta; nunca borra ni sobrescribe. */
            $repo->syncCategoriasDesdeGrupos($grupos);

            /* [034A-14] Si viene entorno_id, guardar overrides por grupo en ese entorno.
             * Los grupos enviados por la extensión pueden traer campos override (categoria,
             * importancia, oculto) que difieren del grupo base según el entorno activo. */
            $jsonParams = $request->get_json_params();
            $entornoId = $jsonParams['entorno_id'] ?? $request->get_param('entorno_id');
            if ($entornoId && (int)$entornoId > 0) {
                $entornoRepo = new EntornosGruposFbRepository($userId);
                foreach ($grupos as $grupo) {
                    $grupoNombre = $grupo['nombre'] ?? $grupo['name'] ?? '';
                    if (empty($grupoNombre)) {
                        continue;
                    }
                    /* Buscar el ID del grupo insertado */
                    $grupoDb = $repo->obtenerPorNombre($grupoNombre);
                    if ($grupoDb) {
                        $overrideData = [];
                        if (isset($grupo['categoria'])) {
                            $overrideData['categoria'] = $grupo['categoria'];
                        }
                        if (isset($grupo['importancia'])) {
                            $overrideData['importancia'] = $grupo['importancia'];
                        }
                        if (isset($grupo['oculto'])) {
                            $overrideData['oculto'] = $grupo['oculto'];
                        }
                        if (!empty($overrideData)) {
                            $overrideOk = $entornoRepo->guardarOverride((int)$entornoId, (int)$grupoDb['id'], $overrideData);
                            if (!$overrideOk) {
                                error_log("[034A-14] Fallo guardarOverride entorno=$entornoId grupo=" . $grupoDb['id']);
                            }
                        }
                    }
                }
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => $resultado,
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error en sync: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /grupos-fb/{id} — Actualizar grupo
     */
    public static function actualizar(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $repo = new GruposFbRepository($userId);
            $id = (int)$request->get_param('id');

            $datos = [];
            $camposEditables = ['categoria', 'importancia', 'oculto', 'notas', 'ultimaPublicacion'];
            foreach ($camposEditables as $campo) {
                if ($request->has_param($campo)) {
                    $datos[$campo] = $request->get_param($campo);
                }
            }

            if (empty($datos)) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'No hay campos para actualizar',
                ], 400);
            }

            $ok = $repo->actualizar($id, $datos);

            if (!$ok) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Grupo no encontrado o sin cambios',
                ], 404);
            }

            $grupo = $repo->obtenerPorId($id);

            return new WP_REST_Response([
                'success' => true,
                'data' => $grupo,
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al actualizar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /grupos-fb/{id} — Soft delete
     */
    public static function eliminar(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $repo = new GruposFbRepository($userId);
            $id = (int)$request->get_param('id');

            $ok = $repo->eliminar($id);

            if (!$ok) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Grupo no encontrado',
                ], 404);
            }

            return new WP_REST_Response([
                'success' => true,
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al eliminar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * [034A-2] POST /grupos-fb/{id}/publicar — Toggle publicado.
     * Si el grupo fue publicado dentro de las últimas 24h (configurable), desmarca.
     * Si no, marca con hora actual. Retorna el nuevo estado.
     */
    public static function marcarPublicado(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $repo = new GruposFbRepository($userId);
            $id = (int)$request->get_param('id');

            /* [034A-17] Duración configurable del ventana de publicado (default 24h) */
            $entornoRepo = new EntornosGruposFbRepository($userId);
            $horasVentana = (int)$entornoRepo->obtenerConfig('publicado_horas', '24');
            if ($horasVentana < 1 || $horasVentana > 720) {
                $horasVentana = 24;
            }

            $resultado = $repo->togglePublicado($id, $horasVentana);

            if (!$resultado['ok']) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Grupo no encontrado',
                ], 404);
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'publicado' => $resultado['publicado'],
                    'ultimaPublicacion' => $resultado['ultimaPublicacion'],
                ],
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al toggle publicado: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /grupos-fb/stats — Estadísticas
     */
    public static function estadisticas(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $repo = new GruposFbRepository($userId);

            return new WP_REST_Response([
                'success' => true,
                'data' => $repo->contarEstadisticas(),
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* ────────────────────────────── Categorías ────────────────────────────── */

    /**
     * GET /grupos-fb/categorias — Lista categorías del usuario
     */
    public static function listarCategorias(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $repo = new GruposFbRepository($userId);

            return new WP_REST_Response([
                'success' => true,
                'data' => $repo->listarCategoriasUsuario(),
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al listar categorías: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /grupos-fb/categorias — Guardar categorías (replace all)
     */
    public static function guardarCategorias(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $categorias = $request->get_json_params()['categorias'] ?? $request->get_param('categorias');

            if (!is_array($categorias)) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Se requiere un array de categorías',
                ], 400);
            }

            $repo = new GruposFbRepository($userId);
            // sentinel-disable-next-line request-json-directo — reemplazarCategorias sanitiza campos internamente
            $resultado = $repo->reemplazarCategorias($categorias);

            return new WP_REST_Response([
                'success' => true,
                'data' => $resultado,
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al guardar categorías: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* ────────────────────────────── Token API ────────────────────────────── */

    /**
     * GET /grupos-fb/token — Obtener o generar token
     */
    public static function obtenerToken(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $tokenHash = get_user_meta($userId, self::META_TOKEN, true);

            /* Si no tiene token, generar uno */
            if (empty($tokenHash)) {
                return self::regenerarToken($request);
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'tieneToken' => true,
                    'mensaje' => 'Ya tienes un token configurado. Usa "regenerar" para obtener uno nuevo.',
                ],
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al obtener token: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /grupos-fb/token/regenerar — Genera un nuevo token (invalida el anterior)
     */
    public static function regenerarToken(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = get_current_user_id();

            /* Generar token criptográficamente seguro */
            $token = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $token);

            /* Guardar solo el hash */
            update_user_meta($userId, self::META_TOKEN, $tokenHash);

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'token' => $token,
                    'mensaje' => 'Token generado. Cópialo ahora, no se mostrará de nuevo.',
                ],
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al regenerar token: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* [024A-16] Ping: verifica conexión, token válido, y devuelve info del usuario + conteo de grupos.
     * Usado por la extensión para confirmar que URL+token funcionan antes de sincronizar. */
    public static function ping(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = self::getUserId($request);
            $repo = new GruposFbRepository($userId);
            $stats = $repo->contarEstadisticas();
            $user = get_userdata($userId);

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'usuario' => $user ? $user->display_name : "user#$userId",
                    'gruposTotales' => $stats['total'] ?? 0,
                    'servidor' => home_url(),
                    'timestamp' => current_time('c'),
                ],
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error en ping: ' . $e->getMessage(),
            ], 500);
        }
    }
}

GruposFbApiController::register();

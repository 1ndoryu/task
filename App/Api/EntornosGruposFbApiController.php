<?php

/* sentinel-disable-file limite-lineas
 * Justificación: Controller REST de entornos con CRUD, overrides y config.
 * Está a 307 líneas efectivas (apenas sobre 300). */

/**
 * [034A-14] API Controller para Entornos de Grupos Facebook
 *
 * Endpoints REST para CRUD de entornos, overrides por grupo y config de usuario.
 * Separado del controller principal para respetar SRP y límite de líneas.
 *
 * @package App\Api
 */

namespace App\Api;

use App\Repository\EntornosGruposFbRepository;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class EntornosGruposFbApiController
{
    private const API_NAMESPACE = 'glory/v1';

    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes(): void
    {
        /* Entornos: CRUD */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/entornos', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [self::class, 'listarEntornos'],
                'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [self::class, 'crearEntorno'],
                'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
            ],
        ]);

        register_rest_route(self::API_NAMESPACE, '/grupos-fb/entornos/(?P<entorno_id>\d+)', [
            [
                'methods' => 'PUT',
                'callback' => [self::class, 'actualizarEntorno'],
                'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
                'args' => [
                    'entorno_id' => ['validate_callback' => fn($p) => is_numeric($p) && $p > 0],
                ],
            ],
            [
                'methods' => WP_REST_Server::DELETABLE,
                'callback' => [self::class, 'eliminarEntorno'],
                'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
                'args' => [
                    'entorno_id' => ['validate_callback' => fn($p) => is_numeric($p) && $p > 0],
                ],
            ],
        ]);

        /* Activar entorno */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/entornos/activar', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'activarEntorno'],
            'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
        ]);

        /* Overrides */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/entornos/(?P<entorno_id>\d+)/overrides', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [self::class, 'listarOverrides'],
                'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [self::class, 'guardarOverride'],
                'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
            ],
        ]);

        /* [034A-17] Config usuario */
        register_rest_route(self::API_NAMESPACE, '/grupos-fb/config', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [self::class, 'obtenerConfigMultiple'],
                'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [self::class, 'guardarConfigMultiple'],
                'permission_callback' => [GruposFbApiController::class, 'verificarAutenticacion'],
            ],
        ]);
    }

    /* ────────────────────────────── Helpers ────────────────────────────── */

    private static function getUserId(WP_REST_Request $request): int
    {
        $extUserId = $request->get_param('_ext_user_id');
        return $extUserId ? (int)$extUserId : get_current_user_id();
    }

    private static function getRepo(WP_REST_Request $request): EntornosGruposFbRepository
    {
        return new EntornosGruposFbRepository(self::getUserId($request));
    }

    /* ────────────────────────────── Entornos CRUD ────────────────────────────── */

    public static function listarEntornos(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);

            return new WP_REST_Response([
                'success' => true,
                'data' => $repo->listarEntornos(),
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al listar entornos: ' . $e->getMessage(),
            ], 500);
        }
    }

    public static function crearEntorno(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);
            $json = $request->get_json_params();

            /* Filtrar campos esperados */
            $datos = [
                'nombre'  => $json['nombre'] ?? '',
                'icono'   => $json['icono'] ?? 'layers',
                'color'   => $json['color'] ?? '#6366f1',
                'aiPrompt' => $json['aiPrompt'] ?? null,
                'orden'   => $json['orden'] ?? 0,
            ];

            $entorno = $repo->crearEntorno($datos);

            if (!$entorno) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'No se pudo crear el entorno (nombre requerido)',
                ], 400);
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => $entorno,
            ], 201);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al crear entorno: ' . $e->getMessage(),
            ], 500);
        }
    }

    public static function actualizarEntorno(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);
            $entornoId = (int)$request->get_param('entorno_id');
            $json = $request->get_json_params();

            /* Filtrar solo campos permitidos */
            $datos = [];
            $permitidos = ['nombre', 'icono', 'color', 'aiPrompt', 'orden'];
            foreach ($permitidos as $campo) {
                if (array_key_exists($campo, $json)) {
                    $datos[$campo] = $json[$campo];
                }
            }

            $entorno = $repo->actualizarEntorno($entornoId, $datos);

            if (!$entorno) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Entorno no encontrado',
                ], 404);
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => $entorno,
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al actualizar entorno: ' . $e->getMessage(),
            ], 500);
        }
    }

    public static function eliminarEntorno(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);
            $entornoId = (int)$request->get_param('entorno_id');
            $ok = $repo->eliminarEntorno($entornoId);

            if (!$ok) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Entorno no encontrado',
                ], 404);
            }

            return new WP_REST_Response(['success' => true], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al eliminar entorno: ' . $e->getMessage(),
            ], 500);
        }
    }

    public static function activarEntorno(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);
            $json = $request->get_json_params();
            $entornoId = isset($json['entornoId']) && $json['entornoId'] !== null
                ? (int)$json['entornoId']
                : null;

            $repo->activarEntorno($entornoId);

            return new WP_REST_Response([
                'success' => true,
                'data' => $entornoId !== null ? $repo->obtenerEntorno($entornoId) : null,
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al activar entorno: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* ────────────────────────────── Overrides ────────────────────────────── */

    public static function listarOverrides(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);
            $entornoId = (int)$request->get_param('entorno_id');

            return new WP_REST_Response([
                'success' => true,
                'data' => $repo->obtenerOverrides($entornoId),
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al listar overrides: ' . $e->getMessage(),
            ], 500);
        }
    }

    public static function guardarOverride(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);
            $entornoId = (int)$request->get_param('entorno_id');
            $json = $request->get_json_params();

            /* [034A-14] Aceptar grupoId (DB int) o fbGroupId (string de Facebook).
             * La extensión envía fbGroupId porque no conoce el ID de BD. */
            $grupoId = (int)($json['grupoId'] ?? 0);
            if ($grupoId <= 0 && !empty($json['fbGroupId'])) {
                $gruposFbRepo = new \App\Repository\GruposFbRepository();
                $gruposFbRepo->setUserId(get_current_user_id());
                $grupo = $gruposFbRepo->obtenerPorNombre($json['fbGroupId']);
                if (!$grupo) {
                    /* Intentar buscar por fb_group_id directamente */
                    $grupo = $gruposFbRepo->obtenerPorFbGroupId($json['fbGroupId']);
                }
                $grupoId = $grupo ? (int)$grupo['id'] : 0;
            }

            if ($grupoId <= 0) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'grupoId o fbGroupId requerido',
                ], 400);
            }

            $entorno = $repo->obtenerEntorno($entornoId);
            if (!$entorno) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Entorno no encontrado',
                ], 404);
            }

            /* Filtrar solo campos de override validos */
            $overrideData = [];
            if (array_key_exists('categoria', $json)) {
                $overrideData['categoria'] = $json['categoria'];
            }
            if (array_key_exists('importancia', $json)) {
                $overrideData['importancia'] = $json['importancia'];
            }
            if (array_key_exists('oculto', $json)) {
                $overrideData['oculto'] = $json['oculto'];
            }

            $ok = $repo->guardarOverride($entornoId, $grupoId, $overrideData);

            return new WP_REST_Response([
                'success' => $ok,
            ], $ok ? 200 : 500);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al guardar override: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* ────────────────────────────── Config ────────────────────────────── */

    /**
     * [034A-17] GET /grupos-fb/config?claves=publicado_horas,otro
     */
    public static function obtenerConfigMultiple(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);
            $clavesParam = $request->get_param('claves') ?? '';
            $claves = array_filter(array_map('trim', explode(',', $clavesParam)));

            $resultado = [];
            foreach ($claves as $clave) {
                $resultado[$clave] = $repo->obtenerConfig($clave);
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => $resultado,
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al obtener config: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /grupos-fb/config — body: {publicado_horas: "48"}
     */
    public static function guardarConfigMultiple(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $repo = self::getRepo($request);
            $datos = $request->get_json_params();

            /* Whitelist de claves permitidas */
            $clavesPermitidas = ['publicado_horas'];
            $guardadas = 0;

            foreach ($datos as $clave => $valor) {
                if (!in_array($clave, $clavesPermitidas, true)) {
                    continue;
                }
                $ok = $repo->guardarConfig((string)$clave, (string)$valor);
                if ($ok) {
                    $guardadas++;
                }
            }

            return new WP_REST_Response([
                'success' => true,
                'data' => ['guardadas' => $guardadas],
            ], 200);
        } catch (\Exception $e) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Error al guardar config: ' . $e->getMessage(),
            ], 500);
        }
    }
}

EntornosGruposFbApiController::register();

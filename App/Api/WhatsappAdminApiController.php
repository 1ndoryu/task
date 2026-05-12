<?php

namespace App\Api;

use App\Repository\WhatsApp\WhatsAppAdminRepository;
use App\Services\WacliManagerService;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class WhatsappAdminApiController
{
    private const API_NAMESPACE = 'glory/v1';

    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes(): void
    {
        register_rest_route(self::API_NAMESPACE, '/admin/whatsapp/cuentas', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [self::class, 'listarCuentas'],
            'permission_callback' => [AdminApiController::class, 'requireAdminPermission'],
            'args'                => self::argumentosLista(),
        ]);

        register_rest_route(self::API_NAMESPACE, '/admin/whatsapp/cuenta/(?P<user_id>\d+)', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [self::class, 'detalleCuenta'],
            'permission_callback' => [AdminApiController::class, 'requireAdminPermission'],
            'args'                => self::argumentosUsuario(),
        ]);

        register_rest_route(self::API_NAMESPACE, '/admin/whatsapp/cuenta/(?P<user_id>\d+)/toggle', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [self::class, 'toggleCuenta'],
            'permission_callback' => [AdminApiController::class, 'requireAdminPermission'],
            'args'                => array_merge(self::argumentosUsuario(), [
                'enabled' => [
                    'required'          => true,
                    'validate_callback' => fn($p) => in_array($p, [0, 1, '0', '1', true, false], true),
                ],
            ]),
        ]);

        register_rest_route(self::API_NAMESPACE, '/admin/whatsapp/health', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [self::class, 'healthDashboard'],
            'permission_callback' => [AdminApiController::class, 'requireAdminPermission'],
        ]);

        register_rest_route(self::API_NAMESPACE, '/admin/whatsapp/cuenta/(?P<user_id>\d+)/health-check', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [self::class, 'forceHealthCheck'],
            'permission_callback' => [AdminApiController::class, 'requireAdminPermission'],
            'args'                => self::argumentosUsuario(),
        ]);
    }

    public static function listarCuentas(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $estado = (string) ($request->get_param('estado') ?: 'todas');
            $pagina = max(1, (int) $request->get_param('pagina'));
            $porPagina = min(100, max(1, (int) $request->get_param('porPagina') ?: 20));
            $resultado = (new WhatsAppAdminRepository())->listarCuentas($estado, $pagina, $porPagina);

            return new WP_REST_Response([
                'success'      => true,
                'data'         => array_map([self::class, 'formatearCuentaLista'], $resultado['rows']),
                'total'        => $resultado['total'],
                'pagina'       => $pagina,
                'porPagina'    => $porPagina,
                'totalPaginas' => (int) ceil($resultado['total'] / $porPagina),
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappAdminAPI] listarCuentas: ' . $e->getMessage());
            return self::error('Error al listar cuentas WhatsApp.', 'wa_list_error');
        }
    }

    public static function detalleCuenta(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $cuenta = (new WhatsAppAdminRepository())->obtenerCuenta((int) $request->get_param('user_id'));
            if (!$cuenta) {
                return self::error('Cuenta WhatsApp no encontrada.', 'not_found', 404);
            }

            return new WP_REST_Response([
                'success' => true,
                'data'    => self::formatearCuentaDetalle($cuenta),
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappAdminAPI] detalleCuenta: ' . $e->getMessage());
            return self::error('Error al obtener detalle.', 'wa_detail_error');
        }
    }

    public static function toggleCuenta(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = (int) $request->get_param('user_id');
            $enabledParam = filter_var($request->get_param('enabled'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($enabledParam === null) {
                return self::error('El estado enabled debe ser booleano.', 'invalid_enabled', 400);
            }

            $repository = new WhatsAppAdminRepository();
            if (!$repository->existeCuenta($userId)) {
                return self::error('Cuenta WhatsApp no encontrada.', 'not_found', 404);
            }

            if (!$repository->actualizarEnabled($userId, $enabledParam)) {
                return self::error('No se pudo actualizar la cuenta WhatsApp.', 'update_failed');
            }

            if (!$enabledParam) {
                self::detenerSync($userId);
            }

            return new WP_REST_Response([
                'success' => true,
                'message' => $enabledParam ? 'Cuenta habilitada.' : 'Cuenta deshabilitada.',
                'data'    => ['enabled' => $enabledParam],
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappAdminAPI] toggleCuenta: ' . $e->getMessage());
            return self::error('Error al cambiar estado.', 'wa_toggle_error');
        }
    }

    public static function healthDashboard(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $data = (new WhatsAppAdminRepository())->obtenerHealthDashboard();
            $data['ultimosChequeos'] = array_map(function ($row) {
                return [
                    'user_id'   => (int) $row->user_id,
                    'status'    => $row->health_status,
                    'lastCheck' => $row->last_health_check,
                ];
            }, $data['ultimosChequeos']);

            return new WP_REST_Response([
                'success' => true,
                'data'    => $data,
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappAdminAPI] healthDashboard: ' . $e->getMessage());
            return self::error('Error al obtener dashboard de salud.', 'wa_health_error');
        }
    }

    public static function forceHealthCheck(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $status = (new WacliManagerService())->healthCheck((int) $request->get_param('user_id'));

            return new WP_REST_Response([
                'success' => true,
                'message' => 'Health check ejecutado.',
                'data'    => ['health_status' => $status],
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappAdminAPI] forceHealthCheck: ' . $e->getMessage());
            return self::error('Error en health check.', 'wa_health_force_error');
        }
    }

    private static function argumentosLista(): array
    {
        return array_merge(self::argumentosUsuario(false), [
            'estado' => [
                'required'          => false,
                'validate_callback' => fn($p) => in_array($p, ['todas', 'activas', 'inactivas', 'muertas'], true),
                'default'           => 'todas',
            ],
            'pagina' => [
                'required'          => false,
                'validate_callback' => fn($p) => is_numeric($p) && $p > 0,
                'sanitize_callback' => 'absint',
                'default'           => 1,
            ],
            'porPagina' => [
                'required'          => false,
                'validate_callback' => fn($p) => is_numeric($p) && $p > 0 && $p <= 100,
                'sanitize_callback' => 'absint',
                'default'           => 20,
            ],
        ]);
    }

    private static function argumentosUsuario(bool $incluir = true): array
    {
        if (!$incluir) {
            return [];
        }

        return [
            'user_id' => [
                'required'          => true,
                'validate_callback' => fn($p) => is_numeric($p) && $p > 0,
                'sanitize_callback' => 'absint',
            ],
        ];
    }

    private static function formatearCuentaLista(object $cuenta): array
    {
        return [
            'user_id'           => (int) $cuenta->user_id,
            'user_name'         => $cuenta->display_name ?? "Usuario #{$cuenta->user_id}",
            'user_email'        => $cuenta->user_email ?? '',
            'account_name'      => $cuenta->account_name,
            'phone_primary'     => $cuenta->phone_primary,
            'authenticated'     => (bool) $cuenta->authenticated,
            'enabled'           => (bool) $cuenta->enabled,
            'blocked'           => (bool) $cuenta->blocked,
            'daily_msg_count'   => (int) $cuenta->daily_msg_count,
            'health_status'     => $cuenta->health_status,
            'last_sync'         => $cuenta->last_sync,
            'last_health_check' => $cuenta->last_health_check,
            'created_at'        => $cuenta->created_at,
        ];
    }

    private static function formatearCuentaDetalle(object $cuenta): array
    {
        return array_merge(self::formatearCuentaLista($cuenta), [
            'jid_primary'       => $cuenta->jid_primary,
            'linked_jid'        => $cuenta->linked_jid,
            'store_path'        => $cuenta->store_path,
            'status_transition' => $cuenta->status_transition,
            'daily_msg_date'    => $cuenta->daily_msg_date,
            'updated_at'        => $cuenta->updated_at,
        ]);
    }

    private static function detenerSync(int $userId): void
    {
        try {
            (new WacliManagerService())->detenerSync($userId);
        } catch (\Throwable $e) {
            error_log('[WhatsappAdminAPI] error deteniendo sync user ' . $userId . ': ' . $e->getMessage());
        }
    }

    private static function error(string $message, string $code, int $status = 500): WP_REST_Response
    {
        return new WP_REST_Response([
            'success' => false,
            'message' => $message,
            'code'    => $code,
        ], $status);
    }
}

WhatsappAdminApiController::register();
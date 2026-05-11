<?php

/**
 * API REST admin-only para Magnific Upscaler.
 *
 * @package App\Api
 */

namespace App\Api;

use App\Services\MagnificService;

class MagnificApiController
{
    private const API_NAMESPACE = 'glory/v1';

    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes(): void
    {
        register_rest_route(self::API_NAMESPACE, '/magnific/upscale', [
            'methods' => 'POST',
            'callback' => [self::class, 'iniciarEscalado'],
            'permission_callback' => [self::class, 'requireAdmin'],
        ]);

        register_rest_route(self::API_NAMESPACE, '/magnific/upscale/(?P<task_id>[A-Za-z0-9_-]+)', [
            'methods' => 'GET',
            'callback' => [self::class, 'obtenerEstado'],
            'permission_callback' => [self::class, 'requireAdmin'],
        ]);
    }

    public static function requireAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    public static function iniciarEscalado(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json = $request->get_json_params();
            $data = (new MagnificService())->iniciarEscalado(is_array($json) ? $json : []);
            return new \WP_REST_Response(['success' => true, 'data' => $data], 200);
        } catch (\Throwable $e) {
            error_log('[MagnificApiController] Error iniciarEscalado: ' . $e->getMessage());
            return new \WP_REST_Response(['success' => false, 'error' => ['message' => $e->getMessage()]], 500);
        }
    }

    public static function obtenerEstado(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $data = (new MagnificService())->obtenerEstado(
                (string)$request->get_param('task_id'),
                (string)($request->get_param('mode') ?? 'creative')
            );
            return new \WP_REST_Response(['success' => true, 'data' => $data], 200);
        } catch (\Throwable $e) {
            error_log('[MagnificApiController] Error obtenerEstado: ' . $e->getMessage());
            return new \WP_REST_Response(['success' => false, 'error' => ['message' => $e->getMessage()]], 500);
        }
    }
}

MagnificApiController::register();
<?php

namespace App\Api;

use App\Services\AgentActionService;
use App\Services\WacliService;

class AgentApiController
{
    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes(): void
    {
        $ns = 'glory/v1';
        $admin = [self::class, 'requireAdmin'];

        register_rest_route($ns, '/agent/wacli/status', [
            'methods' => 'GET',
            'callback' => [self::class, 'wacliStatus'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/actions', [
            'methods' => 'GET',
            'callback' => [self::class, 'listarAcciones'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/actions/whatsapp', [
            'methods' => 'POST',
            'callback' => [self::class, 'proponerWhatsapp'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/actions/(?P<id>\d+)/approve', [
            'methods' => 'POST',
            'callback' => [self::class, 'aprobarAccion'],
            'permission_callback' => $admin,
        ]);
    }

    public static function requireAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    public static function wacliStatus(): \WP_REST_Response
    {
        try {
            return self::ok((new WacliService())->estado());
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'wacli_status_error', 500);
        }
    }

    public static function listarAcciones(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $estado = $request->get_param('estado');
            $limit = (int)($request->get_param('limit') ?? 50);
            $acciones = (new AgentActionService())->listar(
                get_current_user_id(),
                is_string($estado) && $estado !== '' ? sanitize_text_field($estado) : null,
                $limit
            );

            return self::ok(['acciones' => $acciones]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_actions_error', 500);
        }
    }

    public static function proponerWhatsapp(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json = $request->get_json_params();
            $json = is_array($json) ? $json : [];
            $message = trim((string)($json['message'] ?? ''));
            $to = isset($json['to']) ? sanitize_text_field((string)$json['to']) : null;

            if ($message === '') {
                return self::error('El mensaje es obligatorio.', 'whatsapp_message_required', 400);
            }

            $wacli = new WacliService();
            $recipient = $wacli->resolverDestinatario($to, true);
            $accion = (new AgentActionService())->crearPropuesta(
                get_current_user_id(),
                'whatsapp_send_text',
                'Enviar WhatsApp',
                [
                    'provider' => 'wacli',
                    'to' => $recipient,
                    'toMasked' => self::mask($recipient),
                    'message' => $message,
                ],
                true
            );

            return self::ok(['accion' => $accion], 201);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'whatsapp_proposal_error', 500);
        }
    }

    public static function aprobarAccion(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $id = (int)$request->get_param('id');
            $service = new AgentActionService();
            $accion = $service->obtener($id);

            if (!$accion) {
                return self::error('Acción no encontrada.', 'agent_action_not_found', 404);
            }

            if ($accion['tipo'] !== 'whatsapp_send_text') {
                return self::error('Tipo de acción no soportado todavía.', 'agent_action_unsupported', 400);
            }

            $accion = $service->aprobarYEjecutar($id, get_current_user_id(), function (array $accionActual) {
                $payload = is_array($accionActual['payload'] ?? null) ? $accionActual['payload'] : [];
                return (new WacliService())->enviarTexto(
                    isset($payload['to']) ? (string)$payload['to'] : null,
                    (string)($payload['message'] ?? '')
                );
            });

            return self::ok(['accion' => $accion]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_action_approve_error', 500);
        }
    }

    private static function ok(array $data, int $code = 200): \WP_REST_Response
    {
        return new \WP_REST_Response([
            'success' => true,
            'data' => $data,
            'meta' => ['userId' => get_current_user_id(), 'timestamp' => current_time('c')],
        ], $code);
    }

    private static function error(string $message, string $code, int $status): \WP_REST_Response
    {
        return new \WP_REST_Response([
            'success' => false,
            'error' => ['code' => $code, 'message' => $message],
        ], $status);
    }

    private static function mask(string $value): string
    {
        $value = trim($value);
        $length = strlen($value);
        if ($length <= 6) {
            return str_repeat('*', $length);
        }
        return substr($value, 0, 3) . str_repeat('*', max(0, $length - 6)) . substr($value, -3);
    }
}

AgentApiController::register();

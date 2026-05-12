<?php
/* sentinel-disable-file directorio-abarrotado: App/Api es una carpeta legacy de controllers REST WordPress;
 * reorganizarla requiere un bloque propio para no romper registro de rutas/autoload. */

namespace App\Api;

use App\Services\AgentRestHandlers;

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
        $auth = [self::class, 'requireAuth'];

        register_rest_route($ns, '/agent/wacli/status', [
            'methods' => 'GET',
            'callback' => [AgentRestHandlers::class, 'wacliStatus'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/actions', [
            'methods' => 'GET',
            'callback' => [AgentRestHandlers::class, 'listarAcciones'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/chat/messages', [
            [
                'methods' => 'GET',
                'callback' => [AgentRestHandlers::class, 'listarMensajesChat'],
                'permission_callback' => $auth,
            ],
            [
                'methods' => 'POST',
                'callback' => [AgentRestHandlers::class, 'guardarMensajeChat'],
                'permission_callback' => $auth,
            ],
            [
                'methods' => 'DELETE',
                'callback' => [AgentRestHandlers::class, 'limpiarMensajesChat'],
                'permission_callback' => $auth,
            ],
        ]);

        register_rest_route($ns, '/agent/research', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'buscarResearch'],
            'permission_callback' => $auth,
        ]);

        register_rest_route($ns, '/agent/actions/whatsapp', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'proponerWhatsapp'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/actions/github', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'proponerGithub'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/actions/reminder', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'proponerRecordatorio'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/analyze', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'analizarActivo'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/scheduler/run', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'ejecutarScheduler'],
            'permission_callback' => $admin,
        ]);

        register_rest_route($ns, '/agent/chat/messages/(?P<id>\d+)', [
            'methods' => 'PATCH',
            'callback' => [AgentRestHandlers::class, 'actualizarAccionesChat'],
            'permission_callback' => $auth,
            'args' => ['id' => ['required' => true, 'type' => 'integer', 'minimum' => 1]],
        ]);

        register_rest_route($ns, '/agent/actions/(?P<id>\d+)/approve', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'aprobarAccion'],
            'permission_callback' => $admin,
        ]);

        /* [115A-13] Cola HMAC para runner local OpenCode.
         * No usa cookie WP: el runner firma cada request con OPENCODE_RUNNER_SECRET. */
        register_rest_route($ns, '/agent/opencode/jobs', [
            'methods' => 'GET',
            'callback' => [AgentRestHandlers::class, 'listarOpencodeJobs'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/agent/opencode/jobs/(?P<id>\d+)/claim', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'reclamarOpencodeJob'],
            'permission_callback' => '__return_true',
            'args' => ['id' => ['required' => true, 'type' => 'integer', 'minimum' => 1]],
        ]);

        register_rest_route($ns, '/agent/opencode/jobs/(?P<id>\d+)/result', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'reportarOpencodeJob'],
            'permission_callback' => '__return_true',
            'args' => ['id' => ['required' => true, 'type' => 'integer', 'minimum' => 1]],
        ]);

        /* [fix-cancel+notify] Cancelacion y notificacion de sesion en tiempo real. */
        register_rest_route($ns, '/agent/opencode/jobs/(?P<id>\d+)/cancel', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'cancelarOpencodeJob'],
            'permission_callback' => '__return_true',
            'args' => ['id' => ['required' => true, 'type' => 'integer', 'minimum' => 1]],
        ]);

        register_rest_route($ns, '/agent/opencode/jobs/(?P<id>\d+)/status', [
            'methods' => 'GET',
            'callback' => [AgentRestHandlers::class, 'estadoOpencodeJob'],
            'permission_callback' => '__return_true',
            'args' => ['id' => ['required' => true, 'type' => 'integer', 'minimum' => 1]],
        ]);

        register_rest_route($ns, '/agent/opencode/jobs/(?P<id>\d+)/notify-session', [
            'methods' => 'POST',
            'callback' => [AgentRestHandlers::class, 'notificarSesionOpencodeJob'],
            'permission_callback' => '__return_true',
            'args' => ['id' => ['required' => true, 'type' => 'integer', 'minimum' => 1]],
        ]);

        /* [109B] Webhook público de wacli sync --webhook.
         * Auth por HMAC-SHA256 (X-Wacli-Signature), no por cookie WP.
         * wacli envía NDJSON (una línea por evento). */
        register_rest_route($ns, '/whatsapp/webhook', [
            'methods'             => 'POST',
            'callback'            => [AgentRestHandlers::class, 'whatsappWebhook'],
            'permission_callback' => '__return_true', // auth via HMAC interna
        ]);

        /* [109A] Chat procesado server-side (para integraciones futuras; autenticado). */
        register_rest_route($ns, '/agent/chat/process', [
            'methods'             => 'POST',
            'callback'            => [AgentRestHandlers::class, 'procesarChatServerSide'],
            'permission_callback' => $auth,
        ]);
    }

    public static function requireAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    public static function requireAuth(): bool
    {
        return is_user_logged_in();
    }
}

AgentApiController::register();

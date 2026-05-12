<?php
/* sentinel-disable-file directorio-abarrotado: App/Api es legacy de controllers REST;
 * mover todos los controllers a subdirectorios requiere un bloque propio. */

/**
 * [125B-1] WhatsApp User API Controller
 *
 * Endpoints REST para que los usuarios gestionen su propio chatbot WhatsApp.
 * Cada endpoint verifica que el usuario esté logueado y tenga la capability
 * 'glory_whatsapp_chatbot' (agregada al rol subscriber en functions.php).
 *
 * Endpoints:
 * - POST /wp-json/glory/v1/whatsapp/register       → Registrar cuenta + QR
 * - POST /wp-json/glory/v1/whatsapp/renew-qr        → Regenerar QR (rate limited 1/30s)
 * - GET  /wp-json/glory/v1/whatsapp/auth-status     → Estado de autenticación
 * - POST /wp-json/glory/v1/whatsapp/unlink          → Desvincular WhatsApp
 * - GET  /wp-json/glory/v1/whatsapp/recipients      → Listar contactos (enmascarados)
 * - GET  /wp-json/glory/v1/whatsapp/daily-usage     → Consumo diario de mensajes
 *
 * @package App\Api
 */

namespace App\Api;

use App\Repository\WhatsApp\WhatsAppAccountRepository;
use App\Services\WacliManagerService;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class WhatsappUserApiController
{
    private const API_NAMESPACE = 'glory/v1';

    public static function register(): void
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes(): void
    {
        $ns = self::API_NAMESPACE;

        /* Registrar cuenta WhatsApp */
        register_rest_route($ns, '/whatsapp/register', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [self::class, 'registrarCuenta'],
            'permission_callback' => [self::class, 'requireWhatsappPermission'],
            'args'                => [
                'primary' => [
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => fn($v) => is_string($v) && strlen($v) >= 10 && strlen($v) <= 20,
                ],
            ],
        ]);

        /* Regenerar QR (rate limited) */
        register_rest_route($ns, '/whatsapp/renew-qr', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [self::class, 'renewQr'],
            'permission_callback' => [self::class, 'requireWhatsappPermission'],
        ]);

        /* Estado de autenticación */
        register_rest_route($ns, '/whatsapp/auth-status', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [self::class, 'authStatus'],
            'permission_callback' => [self::class, 'requireWhatsappPermission'],
        ]);

        /* Desvincular WhatsApp */
        register_rest_route($ns, '/whatsapp/unlink', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [self::class, 'unlink'],
            'permission_callback' => [self::class, 'requireWhatsappPermission'],
        ]);

        /* Listar contactos (enmascarados) */
        register_rest_route($ns, '/whatsapp/recipients', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [self::class, 'recipients'],
            'permission_callback' => [self::class, 'requireWhatsappPermission'],
        ]);

        /* Consumo diario de mensajes */
        register_rest_route($ns, '/whatsapp/daily-usage', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [self::class, 'dailyUsage'],
            'permission_callback' => [self::class, 'requireWhatsappPermission'],
        ]);
    }

    // ─── Permission ───────────────────────────────────────────────

    /**
     * Verifica que el usuario esté logueado y tenga la capability del chatbot.
     */
    public static function requireWhatsappPermission(): bool
    {
        return is_user_logged_in() && current_user_can('glory_whatsapp_chatbot');
    }

    // ─── Endpoints ────────────────────────────────────────────────

    /**
     * POST /whatsapp/register
     *
     * Registra una nueva cuenta WhatsApp para el usuario actual.
     * Crea el store en disco, ejecuta wacli auth, retorna QR.
     */
    public static function registrarCuenta(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId      = get_current_user_id();
            $phonePrimary = sanitize_text_field($request->get_param('primary'));

            $manager = new WacliManagerService();
            $resultado = $manager->registrarUsuario($userId, $phonePrimary);

            return new WP_REST_Response([
                'ok'          => true,
                'qr'          => $resultado['qr'],
                'accountName' => $resultado['accountName'],
                'message'     => 'Cuenta creada. Escanea el código QR desde WhatsApp > Dispositivos vinculados.',
            ], 201);
        } catch (\Throwable $e) {
            error_log('[WhatsappUserAPI] register error: ' . $e->getMessage());
            return new WP_REST_Response([
                'ok'      => false,
                'message' => $e->getMessage(),
                'code'    => 'register_error',
            ], 400);
        }
    }

    /**
     * POST /whatsapp/renew-qr
     *
     * Regenera el código QR. Rate limit: 1 vez cada 30s por usuario.
     */
    public static function renewQr(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId     = get_current_user_id();
            $rateKey    = 'glory_whatsapp_qr_' . $userId;

            /* Rate limit: 1/30s */
            $lastQr = get_transient($rateKey);
            if ($lastQr) {
                return new WP_REST_Response([
                    'ok'        => false,
                    'message'   => 'Debes esperar antes de regenerar el QR. Intenta de nuevo en unos segundos.',
                    'code'      => 'rate_limited',
                    'retryAfter' => 30,
                ], 429);
            }

            $manager  = new WacliManagerService();
            $qrOutput = $manager->generarCodigoQR($userId);

            set_transient($rateKey, true, 30);

            return new WP_REST_Response([
                'ok'  => true,
                'qr'  => $qrOutput,
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappUserAPI] renewQr error: ' . $e->getMessage());
            return new WP_REST_Response([
                'ok'      => false,
                'message' => $e->getMessage(),
                'code'    => 'renew_qr_error',
            ], 400);
        }
    }

    /**
     * GET /whatsapp/auth-status
     *
     * Retorna el estado de autenticación del usuario actual.
     */
    public static function authStatus(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId  = get_current_user_id();
            $manager = new WacliManagerService();
            $estado  = $manager->verificarAuth($userId);

            $cuenta = (new WhatsAppAccountRepository())->obtenerEstadoUsuario($userId);

            return new WP_REST_Response([
                'ok'             => true,
                'authenticated'  => $estado['authenticated'],
                'linkedJid'      => $estado['linked_jid'],
                'phonePrimary'   => $cuenta ? $cuenta->phone_primary : null,
                'enabled'        => $cuenta ? (bool) $cuenta->enabled : false,
                'blocked'        => $cuenta ? (bool) $cuenta->blocked : false,
                'dailyMsgCount'  => $cuenta ? (int) $cuenta->daily_msg_count : 0,
                'dailyMsgDate'   => $cuenta ? $cuenta->daily_msg_date : null,
                'healthStatus'   => $cuenta ? $cuenta->health_status : 'unknown',
                'lastSync'       => $cuenta ? $cuenta->last_sync : null,
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappUserAPI] authStatus error: ' . $e->getMessage());
            return new WP_REST_Response([
                'ok'        => false,
                'message'   => 'Error al verificar estado de autenticación.',
                'code'      => 'auth_status_error',
                'debugInfo' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /whatsapp/unlink
     *
     * Desvincula el WhatsApp del usuario actual.
     * Detiene sync, limpia store, resetea BD.
     */
    public static function unlink(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId  = get_current_user_id();
            $manager = new WacliManagerService();
            $desvinculado = $manager->desvincular($userId);
            if (!$desvinculado) {
                throw new \RuntimeException('No se pudo completar la desvinculación de WhatsApp.');
            }

            return new WP_REST_Response([
                'ok'      => true,
                'message' => 'WhatsApp desvinculado correctamente. Puedes registrar un nuevo número cuando quieras.',
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappUserAPI] unlink error: ' . $e->getMessage());
            return new WP_REST_Response([
                'ok'      => false,
                'message' => 'Error al desvincular: ' . $e->getMessage(),
                'code'    => 'unlink_error',
            ], 400);
        }
    }

    /**
     * GET /whatsapp/recipients
     *
     * Lista los contactos registrados (enmascarados por privacidad).
     * Solo retorna los números del usuario actual.
     */
    public static function recipients(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = get_current_user_id();

            /* Por ahora: solo el número primario del propio usuario.
             * En v2 se podrían listar contactos del JID. */
            $cuenta = (new WhatsAppAccountRepository())->obtenerRecipientUsuario($userId);

            $recipients = [];
            if ($cuenta && $cuenta->phone_primary) {
                /* Enmascarar: mostrar últimos 4 dígitos */
                $masked = $cuenta->phone_primary;
                if (strlen($masked) > 6) {
                    $masked = substr($masked, 0, 4) . '***' . substr($masked, -4);
                }
                $recipients[] = [
                    'jid'     => $cuenta->jid_primary ?? $cuenta->phone_primary,
                    'masked'  => $masked,
                    'type'    => 'own',
                ];
            }

            return new WP_REST_Response([
                'ok'         => true,
                'recipients' => $recipients,
                'total'      => count($recipients),
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappUserAPI] recipients error: ' . $e->getMessage());
            return new WP_REST_Response([
                'ok'      => false,
                'message' => 'Error al listar contactos.',
                'code'    => 'recipients_error',
            ], 500);
        }
    }

    /**
     * GET /whatsapp/daily-usage
     *
     * Retorna el consumo de mensajes del día actual.
     */
    public static function dailyUsage(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $userId = get_current_user_id();
            $cuenta = (new WhatsAppAccountRepository())->obtenerUsoDiario($userId);

            $count   = $cuenta ? (int) $cuenta->daily_msg_count : 0;
            $date    = $cuenta ? $cuenta->daily_msg_date : null;
            $limit   = defined('WHATSAPP_DAILY_MSG_LIMIT') ? WHATSAPP_DAILY_MSG_LIMIT : 50;
            $today   = current_time('Y-m-d');

            /* Si el registro es de un día anterior, el contador se reseteó */
            if ($date !== $today) {
                $count = 0;
            }

            return new WP_REST_Response([
                'ok'          => true,
                'used'        => $count,
                'limit'       => (int) $limit,
                'remaining'   => max(0, (int) $limit - $count),
                'date'        => $today,
                'resetAt'     => $today . ' 00:00:00',
            ], 200);
        } catch (\Throwable $e) {
            error_log('[WhatsappUserAPI] dailyUsage error: ' . $e->getMessage());
            return new WP_REST_Response([
                'ok'      => false,
                'message' => 'Error al obtener consumo diario.',
                'code'    => 'daily_usage_error',
            ], 500);
        }
    }
}

/* Register automatically */
WhatsappUserApiController::register();

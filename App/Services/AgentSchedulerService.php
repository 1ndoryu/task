<?php

namespace App\Services;

class AgentSchedulerService
{
    public const CRON_HOOK = 'glory_agent_process_due_actions';

    public static function register(): void
    {
        add_action('init', [self::class, 'ensureScheduled']);
        add_action(self::CRON_HOOK, [self::class, 'processDueActions']);
    }

    public static function ensureScheduled(): void
    {
        if (!wp_next_scheduled(self::CRON_HOOK)) {
            wp_schedule_event(time() + 60, 'hourly', self::CRON_HOOK);
        }
    }

    public static function processDueActions(): void
    {
        try {
            (new AgentActionService())->procesarProgramadas(function (array $accion) {
                $tipo = (string)($accion['tipo'] ?? '');
                $payload = is_array($accion['payload'] ?? null) ? $accion['payload'] : [];

                if ($tipo === 'reminder_notify') {
                    $titulo = sanitize_text_field((string)($payload['titulo'] ?? 'Recordatorio del agente'));
                    $mensaje = sanitize_textarea_field((string)($payload['mensaje'] ?? 'Tienes un recordatorio pendiente.'));
                    $resultado = (new NotificacionesService())->crear((int)$accion['user_id'], NotificacionesService::TIPO_MENSAJE_CHAT, $titulo, $mensaje, [
                        'source' => 'agent_reminder',
                        'accionId' => (int)$accion['id'],
                    ]);
                    if (empty($resultado['exito'])) {
                        throw new \RuntimeException((string)($resultado['mensaje'] ?? 'No se pudo crear la notificación.'));
                    }
                    return ['provider' => 'local-notification', 'notification' => $resultado['notificacion'] ?? null];
                }

                if ($tipo === 'whatsapp_send_text') {
                    return (new WacliService())->enviarTexto(
                        isset($payload['to']) ? (string)$payload['to'] : null,
                        (string)($payload['message'] ?? '')
                    );
                }

                return ['provider' => 'local', 'message' => 'Tipo programado sin ejecutor específico.'];
            });
            (new AgentProactiveService())->analizarAdmins(false);
        } catch (\Throwable $e) {
            error_log('[AgentSchedulerService] Error procesando acciones programadas: ' . $e->getMessage());
        }
    }
}

AgentSchedulerService::register();

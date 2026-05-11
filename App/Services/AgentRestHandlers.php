<?php

namespace App\Services;

class AgentRestHandlers
{
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

    public static function listarMensajesChat(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $sessionId = sanitize_text_field((string)($request->get_param('sessionId') ?? 'default'));
            $limit = (int)($request->get_param('limit') ?? 80);
            $mensajes = (new AgentChatService())->listarMensajes(get_current_user_id(), $sessionId, $limit);
            return self::ok(['mensajes' => $mensajes]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_chat_list_error', 500);
        }
    }

    public static function guardarMensajeChat(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json = $request->get_json_params();
            $json = is_array($json) ? $json : [];
            (new AgentRateLimitService())->assertAllowed(get_current_user_id(), 'chat_persist', 180, HOUR_IN_SECONDS);
            $mensaje = (new AgentChatService())->guardarMensaje(
                get_current_user_id(),
                sanitize_text_field((string)($json['sessionId'] ?? 'default')),
                sanitize_text_field((string)($json['rol'] ?? 'usuario')),
                (string)($json['contenido'] ?? ''),
                is_array($json['acciones'] ?? null) ? $json['acciones'] : null,
                isset($json['tokens']) ? (int)$json['tokens'] : 0
            );
            return self::ok(['mensaje' => $mensaje], 201);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_chat_save_error', 500);
        }
    }

    public static function limpiarMensajesChat(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $sessionId = sanitize_text_field((string)($request->get_param('sessionId') ?? 'default'));
            return self::ok(['deleted' => (new AgentChatService())->limpiarSesion(get_current_user_id(), $sessionId)]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_chat_clear_error', 500);
        }
    }

    public static function buscarResearch(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json = $request->get_json_params();
            $json = is_array($json) ? $json : [];
            $resultado = (new AgentResearchService())->buscar(
                get_current_user_id(),
                trim((string)($json['query'] ?? '')),
                isset($json['limit']) ? (int)$json['limit'] : 10
            );
            return self::ok($resultado);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_research_error', 500);
        }
    }

    public static function proponerWhatsapp(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json = self::json($request);
            $message = trim((string)($json['message'] ?? ''));
            $to = isset($json['to']) ? sanitize_text_field((string)$json['to']) : null;
            if ($message === '') {
                return self::error('El mensaje es obligatorio.', 'whatsapp_message_required', 400);
            }

            $wacli = new WacliService();
            $recipient = $wacli->resolverDestinatario($to, true);
            $accion = (new AgentActionService())->crearPropuesta(get_current_user_id(), 'whatsapp_send_text', 'Enviar WhatsApp', [
                'provider' => 'wacli',
                'to' => $recipient,
                'toMasked' => self::mask($recipient),
                'message' => $message,
            ], true);

            return self::ok(['accion' => $accion], 201);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'whatsapp_proposal_error', 500);
        }
    }

    public static function proponerGithub(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json = self::json($request);
            $titulo = trim((string)($json['title'] ?? $json['titulo'] ?? ''));
            $descripcion = trim((string)($json['description'] ?? $json['descripcion'] ?? ''));
            $tipo = sanitize_text_field((string)($json['kind'] ?? $json['tipo'] ?? 'issue'));
            if ($titulo === '' || $descripcion === '') {
                return self::error('Título y descripción son obligatorios para preparar GitHub.', 'github_payload_required', 400);
            }

            $accion = (new AgentActionService())->crearPropuesta(get_current_user_id(), 'github_draft', 'Preparar GitHub', [
                'kind' => in_array($tipo, ['issue', 'pull_request', 'comment', 'assign'], true) ? $tipo : 'issue',
                'title' => $titulo,
                'description' => $descripcion,
                'repo' => sanitize_text_field((string)($json['repo'] ?? '1ndoryu/glorytemplate')),
            ], true);

            return self::ok(['accion' => $accion], 201);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'github_proposal_error', 500);
        }
    }

    public static function proponerRecordatorio(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json = self::json($request);
            $titulo = trim((string)($json['title'] ?? $json['titulo'] ?? 'Recordatorio del agente'));
            $mensaje = trim((string)($json['message'] ?? $json['mensaje'] ?? ''));
            $fecha = trim((string)($json['scheduledAt'] ?? $json['fecha'] ?? ''));
            if ($mensaje === '' || $fecha === '') {
                return self::error('Mensaje y fecha son obligatorios para programar recordatorio.', 'reminder_payload_required', 400);
            }

            $accion = (new AgentActionService())->crearProgramada(get_current_user_id(), 'reminder_notify', $titulo, [
                'titulo' => $titulo,
                'mensaje' => $mensaje,
            ], $fecha, true);

            return self::ok(['accion' => $accion], 201);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'reminder_proposal_error', 500);
        }
    }

    public static function analizarActivo(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json = $request->get_json_params();
            $force = is_array($json) && filter_var($json['force'] ?? false, FILTER_VALIDATE_BOOLEAN);
            return self::ok((new AgentProactiveService())->analizarUsuario(get_current_user_id(), $force));
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_analyze_error', 500);
        }
    }

    public static function ejecutarScheduler(): \WP_REST_Response
    {
        try {
            AgentSchedulerService::processDueActions();
            return self::ok(['processed' => true]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_scheduler_error', 500);
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
            if ($accion['tipo'] === 'reminder_notify') {
                return self::ok(['accion' => $service->aprobarProgramada($id, get_current_user_id())]);
            }

            return self::ok(['accion' => $service->aprobarYEjecutar($id, get_current_user_id(), [self::class, 'ejecutarAccionAprobada'])]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_action_approve_error', 500);
        }
    }

    public static function ejecutarAccionAprobada(array $accionActual): array
    {
        $payload = is_array($accionActual['payload'] ?? null) ? $accionActual['payload'] : [];
        return match ((string)($accionActual['tipo'] ?? '')) {
            'whatsapp_send_text' => (new WacliService())->enviarTexto(isset($payload['to']) ? (string)$payload['to'] : null, (string)($payload['message'] ?? '')),
            'github_draft' => ['provider' => 'github-local-draft', 'message' => 'Draft preparado localmente. Revisa el contenido antes de abrir issue/PR real.', 'draft' => $payload],
            'agent_suggestion' => ['provider' => 'local-agent', 'message' => 'Sugerencia aceptada. Úsala como contexto para el siguiente mensaje del chat.', 'suggestion' => $payload],
            default => throw new \RuntimeException('Tipo de acción no soportado todavía.'),
        };
    }

    private static function json(\WP_REST_Request $request): array
    {
        $json = $request->get_json_params();
        return is_array($json) ? $json : [];
    }

    private static function ok(array $data, int $code = 200): \WP_REST_Response
    {
        return new \WP_REST_Response(['success' => true, 'data' => $data, 'meta' => ['userId' => get_current_user_id(), 'timestamp' => current_time('c')]], $code);
    }

    private static function error(string $message, string $code, int $status): \WP_REST_Response
    {
        return new \WP_REST_Response(['success' => false, 'error' => ['code' => $code, 'message' => $message]], $status);
    }

    private static function mask(string $value): string
    {
        $value = trim($value);
        $length = strlen($value);
        return $length <= 6 ? str_repeat('*', $length) : substr($value, 0, 3) . str_repeat('*', max(0, $length - 6)) . substr($value, -3);
    }
}

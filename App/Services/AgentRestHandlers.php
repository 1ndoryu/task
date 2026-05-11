<?php
/* sentinel-disable-file limite-lineas
 * Justificación: controlador REST con métodos de handlers, helpers de parseo de output
 * y validación HMAC. Dividir requeriría extraer AgentOutputParser + HmacValidator separados;
 * pendiente como tarea futura. */

namespace App\Services;

use App\Services\Agent\OpencodeJobService;

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

    /* [106A] Actualiza acciones de un mensaje de chat (PATCH). Permite que el frontend
     * persista el estado de confirmación/rechazo de acciones tras el remount del panel. */
    public static function actualizarAccionesChat(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $id = (int)$request->get_param('id');
            $json = self::json($request);
            if (!isset($json['acciones']) || !is_array($json['acciones'])) {
                return self::error('El campo acciones es obligatorio y debe ser un array.', 'agent_chat_update_invalid', 400);
            }
            $mensaje = (new AgentChatService())->actualizarAcciones($id, get_current_user_id(), $json['acciones']);
            return self::ok(['mensaje' => $mensaje]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_chat_update_error', 500);
        }
    }

    /* [107A] type='local' (default) o type='web' (Tavily+Serper). */
    public static function buscarResearch(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json  = $request->get_json_params();
            $json  = is_array($json) ? $json : [];
            $type  = in_array(($json['type'] ?? 'local'), ['local', 'web'], true) ? $json['type'] : 'local';
            $limit = isset($json['limit']) ? (int)$json['limit'] : 10;
            $resultado = (new AgentResearchService(null, $type))->buscar(
                get_current_user_id(),
                trim((string)($json['query'] ?? '')),
                $limit,
                $type
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
            if ($accion['tipo'] === 'opencode_job') {
                return self::ok(['accion' => (new OpencodeJobService())->aprobarParaRunner($id, get_current_user_id())]);
            }

            return self::ok(['accion' => $service->aprobarYEjecutar($id, get_current_user_id(), [self::class, 'ejecutarAccionAprobada'])]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'agent_action_approve_error', 500);
        }
    }

    public static function listarOpencodeJobs(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!self::validarOpencodeRunner($request)) {
            return self::error('Firma del runner inválida.', 'opencode_runner_unauthorized', 401);
        }

        try {
            $limit = (int)($request->get_param('limit') ?? 5);
            $jobs = (new OpencodeJobService())->listarPendientes($limit);
            return self::ok(['jobs' => $jobs]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'opencode_jobs_error', 500);
        }
    }

    public static function reclamarOpencodeJob(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!self::validarOpencodeRunner($request)) {
            return self::error('Firma del runner inválida.', 'opencode_runner_unauthorized', 401);
        }

        try {
            $id = (int)$request->get_param('id');
            $job = (new OpencodeJobService())->reclamar($id);
            if (!$job) {
                return self::error('Job no disponible para reclamar.', 'opencode_job_not_claimable', 409);
            }
            return self::ok(['job' => $job]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'opencode_job_claim_error', 500);
        }
    }

    public static function reportarOpencodeJob(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!self::validarOpencodeRunner($request)) {
            return self::error('Firma del runner inválida.', 'opencode_runner_unauthorized', 401);
        }

        try {
            $id = (int)$request->get_param('id');
            $json = self::json($request);
            $exito = filter_var($json['success'] ?? $json['exito'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $resultado = is_array($json['result'] ?? null) ? $json['result'] : ['message' => (string)($json['message'] ?? '')];
            $mensaje = sanitize_text_field((string)($json['message'] ?? ($exito ? 'OpenCode finalizo correctamente.' : 'OpenCode reporto fallo.')));

            $job = (new OpencodeJobService())->reportarResultado($id, $exito, $resultado, $mensaje);
            if (!$job) {
                return self::error('Job no disponible para reportar resultado.', 'opencode_job_not_reportable', 409);
            }
            /* [115A-15] Notificar por WhatsApp al terminar.
             * Usa marcadores === RESUMEN PARA WHATSAPP === si el agente los definió;
             * si no, toma las últimas líneas limpias. ANSI strips siempre.
             * Permisos rechazados por OpenCode se listan al final para visibilidad. */
            try {
                $output = trim((string)($resultado['output'] ?? ''));
                $prompt = self::extraerPromptPreview((string)($job['payload']['prompt'] ?? ''));
                $sessionIdCodigo = trim((string)($resultado['session_id'] ?? $job['payload']['session_id'] ?? ''));
                $resumen = trim((string)($resultado['whatsapp_summary'] ?? ''));
                if ($resumen === '' && $output !== '') {
                    $resumen = self::extraerResumenWhatsApp($output);
                }
                $rechazados = $output !== '' ? self::extraerPermisosRechazados($output) : [];
                if ($exito) {
                    $waMsg = "\u{2705} *OpenCode termin\u{00F3}*" . ($prompt !== '' ? "\n_{$prompt}_" : '') . ($resumen !== '' ? "\n\n{$resumen}" : '');
                } else {
                    $waMsg = "\u{274C} *OpenCode fall\u{00F3}*" . ($prompt !== '' ? "\n_{$prompt}_" : '') . "\n{$mensaje}" . ($resumen !== '' ? "\n\n{$resumen}" : '');
                }
                if ($sessionIdCodigo !== '') {
                    $waMsg .= "\n\n\u{1F511} _Sesi\u{00F3}n: {$sessionIdCodigo}_";
                }
                if (!empty($rechazados)) {
                    $waMsg .= "\n\n\u{26A0}\uFE0F *Permisos rechazados:*";
                    foreach ($rechazados as $cmd) {
                        $waMsg .= "\n\u{2022} `{$cmd}`";
                    }
                    $waMsg .= "\n\nResponde *PERMITIR <comando>* para agregarlo a opencode.jsonc.";
                }
                (new WacliService())->enviarTexto(null, $waMsg);
            } catch (\Throwable) { /* no bloquear si WhatsApp falla */ }
            return self::ok(['job' => $job]);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'opencode_job_result_error', 500);
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

    /* [115A-15] Limpia secuencias de escape ANSI del output del terminal.
     * Cubre SGR (\x1b[...m), así como ESC solos. */
    private static function limpiarAnsi(string $text): string
    {
        return (string) preg_replace('/\x1b\[[0-9;]*[mGKHF]|\x1b[\\]|\x0f|\x0e/', '', $text);
    }

    /* [115A-15] Extrae el resumen para WhatsApp del output de OpenCode.
     * Si el agente definió marcadores explícitos los usa; si no, devuelve
     * las últimas 25 líneas no-vacías tras limpiar ANSI.
     * Gotcha: el agente a veces envuelve el bloque en backtick code fences.
     * Se intenta primero sin strips y luego con strips para cubrir ambos casos. */
    private static function extraerResumenWhatsApp(string $output): string
    {
        $limpio = self::limpiarAnsi($output);
        if (preg_match('/=== RESUMEN PARA WHATSAPP ===(.*?)=== FIN RESUMEN ===/s', $limpio, $m)) {
            return trim($m[1]);
        }
        /* Fallback: eliminar backtick code fences y reintentar */
        $sinFences = (string) preg_replace('/^```[^\n]*\n?/m', '', $limpio);
        $sinFences = str_replace('```', '', $sinFences);
        if (preg_match('/=== RESUMEN PARA WHATSAPP ===(.*?)=== FIN RESUMEN ===/s', $sinFences, $m)) {
            return trim($m[1]);
        }
        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $limpio)),
            static fn(string $l): bool => $l !== ''
        ));
        $tail = array_slice($lines, -25);
        return implode("\n", $tail);
    }

    /* [115A-15] Extrae el mensaje original del usuario del prompt completo.
     * El prompt construido por el runner empieza con "=== TAREA A EJECUTAR ==="
     * seguido del mensaje del usuario hasta "=== FIN DE TAREA ===". */
    private static function extraerPromptPreview(string $fullPrompt): string
    {
        if (preg_match('/=== TAREA A EJECUTAR ===(.*?)=== FIN DE TAREA ===/s', $fullPrompt, $m)) {
            return mb_substr(trim($m[1]), 0, 120);
        }
        return mb_substr($fullPrompt, 0, 80);
    }

    /* [115A-15] Extrae los comandos bash que OpenCode rechazó por permisos.
     * OpenCode emite: "permission requested: bash (COMMAND); auto-rejecting"
     * o similar. Se desduplicam los comandos encontrados. */
    private static function extraerPermisosRechazados(string $output): array
    {
        $clean = self::limpiarAnsi($output);
        $comandos = [];
        preg_match_all('/permission requested:\s+bash\s+\(([^)]+)\)/i', $clean, $matches);
        foreach ($matches[1] as $cmd) {
            $cmd = trim($cmd);
            if ($cmd !== '' && !in_array($cmd, $comandos, true)) {
                $comandos[] = $cmd;
            }
        }
        return $comandos;
    }

    /* [115A-13] Autenticacion HMAC para runner local de OpenCode.
     * Firma: sha256=HMAC(secret, timestamp + "\n" + METHOD + "\n" + route + "\n" + body).
     * Route debe ser el route WP REST, por ejemplo /glory/v1/agent/opencode/jobs. */
    private static function validarOpencodeRunner(\WP_REST_Request $request): bool
    {
        $secret = EnvService::get('OPENCODE_RUNNER_SECRET');
        if ($secret === '') {
            error_log('[OpenCodeRunner] OPENCODE_RUNNER_SECRET no configurado.');
            return false;
        }

        $timestamp = (string)($request->get_header('X-OpenCode-Timestamp') ?? '');
        $firma = (string)($request->get_header('X-OpenCode-Signature') ?? '');
        if ($timestamp === '' || $firma === '') {
            return false;
        }

        $ts = (int)$timestamp;
        if ($ts <= 0 || abs(time() - $ts) > 300) {
            return false;
        }

        $body = $request->get_body();
        $base = $timestamp . "\n" . strtoupper($request->get_method()) . "\n" . $request->get_route() . "\n" . $body;
        $esperada = 'sha256=' . hash_hmac('sha256', $base, $secret);
        return hash_equals($esperada, $firma);
    }

    private static function mask(string $value): string
    {
        $value = trim($value);
        $length = strlen($value);
        return $length <= 6 ? str_repeat('*', $length) : substr($value, 0, 3) . str_repeat('*', max(0, $length - 6)) . substr($value, -3);
    }

    /* [109B] Webhook de wacli sync --webhook. Auth via HMAC-SHA256.
     * wacli envía NDJSON: una línea JSON por evento.
     * Responde 200 rápido; procesamiento puede ser lento (LLM call). */
    public static function whatsappWebhook(\WP_REST_Request $request): \WP_REST_Response
    {
        $body      = $request->get_body();
        $firma     = (string)($request->get_header('X-Wacli-Signature') ?? '');
        $service   = new WhatsAppWebhookService();

        if (!$service->validarFirma($body, $firma)) {
            return new \WP_REST_Response(['error' => 'Firma inválida'], 401);
        }

        /* NDJSON: procesar cada línea */
        foreach (explode("\n", trim($body)) as $linea) {
            $linea = trim($linea);
            if ($linea === '') {
                continue;
            }
            $evento = json_decode($linea, true);
            if (is_array($evento)) {
                $service->procesarEvento($evento);
            }
        }

        return new \WP_REST_Response(['ok' => true], 200);
    }

    /* [109A] Procesa un mensaje de chat desde el servidor (para canales server-side).
     * Alternativa autenticada al flujo React-LLM para testing e integraciones. */
    public static function procesarChatServerSide(\WP_REST_Request $request): \WP_REST_Response
    {
        try {
            $json      = self::json($request);
            $mensaje   = trim((string)($json['mensaje'] ?? $json['message'] ?? ''));
            $sessionId = sanitize_text_field((string)($json['sessionId'] ?? 'default'));
            $canal     = in_array($json['canal'] ?? 'app', ['app', 'whatsapp'], true) ? $json['canal'] : 'app';

            if ($mensaje === '') {
                return self::error('El campo mensaje es obligatorio.', 'chat_message_required', 400);
            }

            (new AgentRateLimitService())->assertAllowed(get_current_user_id(), 'chat_process', 20, HOUR_IN_SECONDS);

            $resultado = (new AgentChatProcessor())->procesar(get_current_user_id(), $sessionId, $mensaje, $canal);
            return self::ok($resultado, 200);
        } catch (\Throwable $e) {
            return self::error($e->getMessage(), 'chat_process_error', 500);
        }
    }
}


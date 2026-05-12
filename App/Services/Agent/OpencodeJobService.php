<?php

namespace App\Services\Agent;

use App\Database\Schema;

/* [115A-13] Cola externa para runner local OpenCode.
 * Gotcha: no usa cookie WP; la frontera de seguridad es HMAC en AgentRestHandlers.
 * Pendiente: cuando OpenCode real este instalado, agregar prueba end-to-end con job aprobado. */
class OpencodeJobService
{
    private const TIPO = 'opencode_job';
    private const MAX_JSON_LENGTH = 1048576;

    private string $tabla;

    public function __construct()
    {
        global $wpdb;
        $this->tabla = $wpdb->prefix . 'glory_agent_actions';
        Schema::ensureTableExists('agent_actions');
    }

    public function listarActivos(int $limit = 5): array
    {
        global $wpdb;
        $limit = max(1, min(10, $limit));
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->tabla} WHERE tipo = %s AND estado IN ('pendiente', 'ejecutando') ORDER BY id DESC LIMIT %d",
                self::TIPO,
                $limit
            ),
            ARRAY_A
        );
        return array_map([$this, 'normalizarFila'], is_array($rows) ? $rows : []);
    }

    public function listarPendientes(int $limit = 10): array
    {
        global $wpdb;

        $limit = max(1, min(20, $limit));
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->tabla} WHERE tipo = %s AND estado = %s ORDER BY id ASC LIMIT %d",
                self::TIPO,
                'pendiente',
                $limit
            ),
            ARRAY_A
        );

        return array_map([$this, 'normalizarFila'], is_array($rows) ? $rows : []);
    }

    public function aprobarParaRunner(int $id, int $adminId): array
    {
        global $wpdb;

        $accion = $this->obtener($id);
        if (!$accion) {
            throw new \RuntimeException('Acción del agente no encontrada.');
        }
        if ((int)$accion['user_id'] !== $adminId) {
            throw new \RuntimeException('La acción pertenece a otro usuario.');
        }
        if ($accion['tipo'] !== self::TIPO || !in_array($accion['estado'], ['requiere_aprobacion', 'fallido'], true)) {
            throw new \RuntimeException('La acción no está en un estado aprobable para runner.');
        }

        $logs = $this->agregarLog($accion['logs'] ?? [], 'runner_aprobado', 'Solicitud OpenCode aprobada para runner local.');
        $actualizado = $wpdb->update(
            $this->tabla,
            [
                'estado' => 'pendiente',
                'aprobado_por' => $adminId,
                'fecha_aprobacion' => current_time('mysql'),
                'logs' => $this->codificarJson($logs),
            ],
            ['id' => $id],
            ['%s', '%d', '%s', '%s'],
            ['%d']
        );

        if ($actualizado === false) {
            throw new \RuntimeException('No se pudo aprobar la acción para runner externo.');
        }

        return $this->obtener($id) ?? [];
    }

    public function reclamar(int $id): ?array
    {
        global $wpdb;

        $accion = $this->obtener($id);
        if (!$accion || $accion['tipo'] !== self::TIPO || $accion['estado'] !== 'pendiente') {
            return null;
        }

        $logs = $this->agregarLog($accion['logs'] ?? [], 'runner_reclamado', 'Runner local reclamo la solicitud OpenCode.');
        $actualizado = $wpdb->update(
            $this->tabla,
            ['estado' => 'ejecutando', 'logs' => $this->codificarJson($logs)],
            ['id' => $id, 'estado' => 'pendiente', 'tipo' => self::TIPO],
            ['%s', '%s'],
            ['%d', '%s', '%s']
        );

        return ($actualizado === false || $actualizado === 0) ? null : $this->obtener($id);
    }

    public function reportarResultado(int $id, bool $exito, array $resultado, string $mensaje): ?array
    {
        global $wpdb;

        $accion = $this->obtener($id);
        if (!$accion || $accion['tipo'] !== self::TIPO || !in_array($accion['estado'], ['ejecutando', 'pendiente'], true)) {
            return null;
        }

        $logs = $this->agregarLog($accion['logs'] ?? [], $exito ? 'runner_completado' : 'runner_fallido', $mensaje);
        $actualizado = $wpdb->update(
            $this->tabla,
            [
                'estado' => $exito ? 'completado' : 'fallido',
                'resultado' => $this->codificarJson($resultado),
                'logs' => $this->codificarJson($logs),
                'fecha_ejecucion' => current_time('mysql'),
            ],
            ['id' => $id, 'tipo' => self::TIPO],
            ['%s', '%s', '%s', '%s'],
            ['%d', '%s']
        );

        if ($actualizado === false) {
            throw new \RuntimeException('No se pudo guardar el resultado externo de la acción.');
        }

        return $this->obtener($id);
    }

    private function obtener(int $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->tabla} WHERE id = %d", $id), ARRAY_A);
        return is_array($row) ? $this->normalizarFila($row) : null;
    }

    /* Alias publico de obtener() para uso externo (handlers REST, etc.) */
    public function obtenerPublico(int $id): ?array
    {
        return $this->obtener($id);
    }

    private function normalizarFila(array $row): array
    {
        $payload = $this->decodificarJson((string)($row['payload'] ?? '{}'), []);
        $resultado = $this->decodificarJson((string)($row['resultado'] ?? 'null'), null);
        $logs = $this->decodificarJson((string)($row['logs'] ?? '[]'), []);

        return [
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'correlation_id' => $row['correlation_id'] ?? null,
            'tipo' => (string)$row['tipo'],
            'titulo' => (string)$row['titulo'],
            'estado' => (string)$row['estado'],
            'requiere_aprobacion' => (bool)$row['requiere_aprobacion'],
            'payload' => is_array($payload) ? $payload : [],
            'resultado' => $resultado,
            'logs' => is_array($logs) ? $logs : [],
            'aprobado_por' => isset($row['aprobado_por']) ? (int)$row['aprobado_por'] : null,
            'fecha_programada' => $row['fecha_programada'] ?? null,
            'fecha_creacion' => $row['fecha_creacion'] ?? null,
            'fecha_aprobacion' => $row['fecha_aprobacion'] ?? null,
            'fecha_ejecucion' => $row['fecha_ejecucion'] ?? null,
        ];
    }

    private function codificarJson(mixed $value): string
    {
        $json = wp_json_encode($value, JSON_UNESCAPED_UNICODE);
        if (!is_string($json) || json_last_error() !== JSON_ERROR_NONE || strlen($json) > self::MAX_JSON_LENGTH) {
            throw new \RuntimeException('No se pudo codificar el JSON del job OpenCode.');
        }
        return $json;
    }

    private function decodificarJson(string $json, mixed $fallback): mixed
    {
        $decoded = json_decode($json, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $fallback;
    }

    /* [115A-cont] Crea job de continuacion reutilizando la sesion OpenCode del job anterior.
     * Gotcha: OpenCode 1.14.48 no siempre imprime el ID en stdout; el runner lo resuelve
     * con `opencode session list` y lo guarda en resultado.session_id. */
    public function crearContinuacion(int $jobAnteriorId, int $userId, string $prompt): array
    {
        global $wpdb;

        $jobAnterior = $this->obtener($jobAnteriorId);
        if (!$jobAnterior) {
            throw new \RuntimeException("Job anterior #{$jobAnteriorId} no encontrado.");
        }
        if ((int)$jobAnterior['user_id'] !== $userId) {
            throw new \RuntimeException('El job anterior pertenece a otro usuario.');
        }

        /* [115A-16c] Si el usuario pide continuar la misma sesion, debemos pasar el ID real
         * al runner para que OpenCode reciba --session <id>. previous_output queda como
         * respaldo legible si la sesion local expiro o no fue capturada por jobs antiguos. */
        $sessionId      = sanitize_text_field((string)($jobAnterior['resultado']['session_id'] ?? $jobAnterior['payload']['session_id'] ?? ''));
        /* [fix-resumen-contexto] Usar whatsapp_summary como contexto previo: es limpio y
         * estructurado vs el output crudo (lleno de ANSI/logs). Con --session el historial
         * completo ya vive en OpenCode; el summary es solo un recordatorio compacto. */
        $summary        = (string)($jobAnterior['resultado']['whatsapp_summary'] ?? '');
        $previousOutput = $summary !== '' ? $summary : mb_substr((string)($jobAnterior['resultado']['output'] ?? ''), -800);
        /* [125A-1] Siempre tomar el allowlist actualizado (el usuario puede haberlo ampliado
         * justo antes de pedir la continuacion, p. ej. via actualizar_opencode_allowlist). */
        $extraAllow = array_values(array_filter((array)get_option('glory_opencode_extra_allow', [])));
        $payload        = array_merge($jobAnterior['payload'], [
            'prompt'            => sanitize_textarea_field($prompt),
            'session_id'        => $sessionId,
            'previous_output'   => $previousOutput,
            'continua_job_id'   => $jobAnteriorId,
            'extra_permissions' => $extraAllow,
        ]);

        $titulo   = 'OpenCode (cont. #' . $jobAnteriorId . '): ' . mb_substr(str_replace(["\r", "\n"], ' ', $prompt), 0, 60);
        $inserted = $wpdb->insert(
            $this->tabla,
            [
                'user_id'             => $userId,
                'tipo'                => self::TIPO,
                'titulo'              => $titulo,
                'estado'              => 'pendiente',
                'requiere_aprobacion' => 0,
                'payload'             => $this->codificarJson($payload),
                'fecha_creacion'      => current_time('mysql'),
            ],
            ['%d', '%s', '%s', '%s', '%d', '%s', '%s']
        );

        if (!$inserted) {
            throw new \RuntimeException('No se pudo crear el job de continuación OpenCode.');
        }

        return $this->obtener((int)$wpdb->insert_id) ?? [];
    }

    /* [fix-cancelar] Cancela un job pendiente o en ejecución. El runner detecta este estado
     * en su polling periódico y mata el proceso hijo. */
    public function cancelar(int $id): ?array
    {
        global $wpdb;
        $accion = $this->obtener($id);
        if (!$accion || $accion['tipo'] !== self::TIPO || !in_array($accion['estado'], ['pendiente', 'ejecutando'], true)) {
            return null;
        }
        $logs = $this->agregarLog($accion['logs'] ?? [], 'cancelado', 'Job cancelado por el usuario.');
        $actualizado = $wpdb->update(
            $this->tabla,
            ['estado' => 'cancelado', 'logs' => $this->codificarJson($logs)],
            ['id' => $id, 'tipo' => self::TIPO],
            ['%s', '%s'],
            ['%d', '%s']
        );
        return $actualizado !== false ? $this->obtener($id) : null;
    }

    /* [fix-notify-session] Guarda el session_id en los logs del job cuando OpenCode
     * lo emite al inicio. El handler envía WA con el ID para que el usuario pueda
     * continuar la sesión si algo falla antes del resultado final. */
    public function guardarSesionEnLogs(int $id, string $sessionId): ?array
    {
        global $wpdb;
        $accion = $this->obtener($id);
        if (!$accion || $accion['tipo'] !== self::TIPO) {
            return null;
        }
        $logs = $this->agregarLog($accion['logs'] ?? [], 'session_iniciada', "Session ID: {$sessionId}");
        $actualizado = $wpdb->update(
            $this->tabla,
            ['logs' => $this->codificarJson($logs)],
            ['id' => $id, 'tipo' => self::TIPO],
            ['%s'],
            ['%d', '%s']
        );
        return $actualizado !== false ? $this->obtener($id) : null;
    }

    /* [115A-cont] Jobs completados/fallidos en las ultimas N horas — expone session_id al chatbot. */
    public function listarRecientes(int $horas = 4, int $limit = 3): array
    {
        global $wpdb;

        $limit = max(1, min(10, $limit));
        $desde = date('Y-m-d H:i:s', time() - ($horas * 3600));
        $rows  = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->tabla} WHERE tipo = %s AND estado IN ('completado', 'fallido') AND fecha_ejecucion >= %s ORDER BY id DESC LIMIT %d",
                self::TIPO,
                $desde,
                $limit
            ),
            ARRAY_A
        );
        return array_map([$this, 'normalizarFila'], is_array($rows) ? $rows : []);
    }

    private function agregarLog(array $logs, string $evento, string $mensaje): array
    {
        $logs[] = ['evento' => $evento, 'mensaje' => sanitize_text_field($mensaje), 'fecha' => current_time('mysql')];
        return array_slice($logs, -50);
    }
}
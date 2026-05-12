<?php

namespace App\Services;

use App\Database\Schema;

class AgentActionService
{
    private const MAX_JSON_LENGTH = 1048576;

    private string $tabla;

    public function __construct()
    {
        global $wpdb;
        $this->tabla = $wpdb->prefix . 'glory_agent_actions';
        Schema::ensureTableExists('agent_actions');
    }

    public function crearPropuesta(int $userId, string $tipo, string $titulo, array $payload, bool $requiereAprobacion = true): array
    {
        return $this->crearAccion($userId, $tipo, $titulo, $payload, $requiereAprobacion, null);
    }

    public function crearProgramada(int $userId, string $tipo, string $titulo, array $payload, string $fechaProgramada, bool $requiereAprobacion = true): array
    {
        $channel = (string)($payload['channel'] ?? 'app');
        $timezone = UserTimeService::resolveTimezoneName($userId, $channel, $payload['timezone'] ?? null);
        $payload['timezone'] = $timezone;
        $fecha = $this->parseFechaProgramada($fechaProgramada, $timezone);
        if ($fecha->getTimestamp() < (time() - 60)) {
            throw new \InvalidArgumentException('Fecha programada inválida para la acción del agente.');
        }

        return $this->crearAccion($userId, $tipo, $titulo, $payload, $requiereAprobacion, $this->formatFechaProgramada($fecha, $timezone));
    }

    public function procesarProgramadas(callable $executor, int $limit = 500): int
    {
        global $wpdb;

        $limit = max(1, min(500, $limit));
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->tabla} WHERE estado = %s AND fecha_programada IS NOT NULL ORDER BY fecha_programada ASC LIMIT %d",
                'pendiente',
                $limit
            ),
            ARRAY_A
        );

        $procesadas = 0;
        foreach (is_array($rows) ? $rows : [] as $row) {
            $accion = $this->normalizarFila($row);
            if (!$this->accionEstaVencida($accion)) {
                continue;
            }
            try {
                $this->ejecutarAccion((int)$accion['id'], $executor, null);
                $procesadas++;
            } catch (\Throwable $e) {
                error_log('[AgentActionService] Acción programada falló id=' . (int)$accion['id'] . ': ' . $e->getMessage());
            }
        }

        return $procesadas;
    }

    private function crearAccion(int $userId, string $tipo, string $titulo, array $payload, bool $requiereAprobacion, ?string $fechaProgramada): array
    {
        global $wpdb;

        $estado = $requiereAprobacion ? 'requiere_aprobacion' : 'pendiente';
        $correlationId = $this->crearCorrelationId();
        $payloadJson = $this->codificarJson($payload);
        $logsJson = $this->codificarJson([$this->crearLog('creada', 'Acción registrada por el agente.')]);
        $insertado = $wpdb->insert(
            $this->tabla,
            [
                'user_id' => $userId,
                'correlation_id' => $correlationId,
                'tipo' => $tipo,
                'titulo' => $titulo,
                'estado' => $estado,
                'requiere_aprobacion' => $requiereAprobacion ? 1 : 0,
                'payload' => $payloadJson,
                'logs' => $logsJson,
                'fecha_programada' => $fechaProgramada,
                'fecha_creacion' => current_time('mysql'),
            ],
            ['%d', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s']
        );

        if (!$insertado) {
            throw new \RuntimeException('No se pudo registrar la propuesta del agente.');
        }

        return $this->obtener((int)$wpdb->insert_id) ?? [];
    }

    public function listar(int $userId, ?string $estado = null, int $limit = 50): array
    {
        global $wpdb;

        $limit = max(1, min(100, $limit));
        if ($estado !== null && $estado !== '') {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$this->tabla} WHERE user_id = %d AND estado = %s ORDER BY id DESC LIMIT %d",
                    $userId,
                    $estado,
                    $limit
                ),
                ARRAY_A
            );
        } else {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$this->tabla} WHERE user_id = %d ORDER BY id DESC LIMIT %d",
                    $userId,
                    $limit
                ),
                ARRAY_A
            );
        }

        return array_map([$this, 'normalizarFila'], is_array($rows) ? $rows : []);
    }

    public function obtener(int $id): ?array
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$this->tabla} WHERE id = %d", $id),
            ARRAY_A
        );

        return is_array($row) ? $this->normalizarFila($row) : null;
    }

    public function aprobarYEjecutar(int $id, int $adminId, callable $executor): array
    {
        global $wpdb;

        $accion = $this->obtener($id);
        if (!$accion) {
            throw new \RuntimeException('Acción del agente no encontrada.');
        }

        if ((int)$accion['user_id'] !== $adminId) {
            throw new \RuntimeException('La acción pertenece a otro usuario.');
        }

        if ($accion['estado'] === 'completado') {
            return $accion;
        }

        if (!in_array($accion['estado'], ['requiere_aprobacion', 'pendiente', 'fallido'], true)) {
            throw new \RuntimeException('La acción no está en un estado aprobable.');
        }

        return $this->ejecutarAccion($id, $executor, $adminId);
    }

    /* [115A-4] Cancela un recordatorio/acción programada del usuario. */
    public function cancelar(int $id, int $userId): bool
    {
        global $wpdb;
        $accion = $this->obtener($id);
        if (!$accion || (int)$accion['user_id'] !== $userId) {
            return false;
        }
        if (in_array($accion['estado'], ['completado', 'cancelado'], true)) {
            return false; // ya finalizado
        }
        return $wpdb->update(
            $this->tabla,
            ['estado' => 'cancelado'],
            ['id' => $id],
            ['%s'],
            ['%d']
        ) !== false;
    }

    /* [115A-4] Edita la fecha y/o payload de un recordatorio pendiente.
     * $cambios puede incluir: 'fecha_programada' (string ISO8601), 'titulo' (string),
     * 'payload_merge' (array que se fusiona con el payload existente). */
    public function editarProgramada(int $id, int $userId, array $cambios): ?array
    {
        global $wpdb;
        $accion = $this->obtener($id);
        if (!$accion || (int)$accion['user_id'] !== $userId) {
            return null;
        }
        if (!in_array($accion['estado'], ['pendiente', 'requiere_aprobacion'], true)) {
            return null;
        }

        $payload = array_merge((array)($accion['payload'] ?? []), is_array($cambios['payload_merge'] ?? null) ? $cambios['payload_merge'] : []);
        $guardarPayload = !empty($cambios['payload_merge']) && is_array($cambios['payload_merge']);
        if (!isset($payload['timezone'])) {
            $payload['timezone'] = UserTimeService::resolveTimezoneName($userId, (string)($payload['channel'] ?? 'app'));
            $guardarPayload = true;
        }

        if (isset($cambios['fecha_programada'])) {
            $timezone = UserTimeService::actionTimezoneName($payload, $userId, (string)($payload['channel'] ?? 'app'));
            $fecha = $this->parseFechaProgramada((string)$cambios['fecha_programada'], $timezone);
            $_ok = $wpdb->update($this->tabla, ['fecha_programada' => $this->formatFechaProgramada($fecha, $timezone)], ['id' => $id], ['%s'], ['%d']);
        }

        if (!empty($cambios['titulo'])) {
            $_ok = $wpdb->update($this->tabla, ['titulo' => sanitize_text_field((string)$cambios['titulo'])], ['id' => $id], ['%s'], ['%d']);
        }

        if ($guardarPayload) {
            $_ok = $wpdb->update($this->tabla, ['payload' => $this->codificarJson($payload)], ['id' => $id], ['%s'], ['%d']);
        }

        return $this->obtener($id);
    }

    private function parseFechaProgramada(string $fechaProgramada, string $timezone): \DateTimeImmutable
    {
        try {
            return new \DateTimeImmutable($fechaProgramada, new \DateTimeZone($timezone));
        } catch (\Throwable) {
            throw new \InvalidArgumentException('Fecha programada inválida para la acción del agente.');
        }
    }

    private function formatFechaProgramada(\DateTimeImmutable $fecha, string $timezone): string
    {
        return $fecha->setTimezone(new \DateTimeZone($timezone))->format('Y-m-d H:i:s');
    }

    public function aprobarProgramada(int $id, int $adminId): array
    {
        global $wpdb;

        $accion = $this->obtener($id);
        if (!$accion) {
            throw new \RuntimeException('Acción del agente no encontrada.');
        }
        if ((int)$accion['user_id'] !== $adminId) {
            throw new \RuntimeException('La acción pertenece a otro usuario.');
        }
        if (empty($accion['fecha_programada'])) {
            throw new \RuntimeException('La acción no tiene fecha programada.');
        }

        $logs = $this->agregarLog($accion['logs'] ?? [], 'programada_aprobada', 'La acción quedó aprobada y pendiente de su fecha programada.');
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
            throw new \RuntimeException('No se pudo aprobar la acción programada.');
        }

        return $this->obtener($id) ?? [];
    }

    private function ejecutarAccion(int $id, callable $executor, ?int $adminId): array
    {
        global $wpdb;

        $accion = $this->obtener($id);
        if (!$accion) {
            throw new \RuntimeException('Acción del agente no encontrada.');
        }

        $logs = $this->agregarLog($accion['logs'] ?? [], 'ejecutando', 'La acción pasó a ejecución.');

        $actualizado = $wpdb->update(
            $this->tabla,
            [
                'estado' => 'ejecutando',
                'aprobado_por' => $adminId ?: ($accion['aprobado_por'] ?? null),
                'fecha_aprobacion' => $adminId ? current_time('mysql') : ($accion['fecha_aprobacion'] ?? null),
                'logs' => $this->codificarJson($logs),
            ],
            ['id' => $id],
            ['%s', '%d', '%s', '%s'],
            ['%d']
        );
        if ($actualizado === false) {
            throw new \RuntimeException('No se pudo marcar la acción del agente como ejecutando.');
        }

        try {
            $resultado = $executor($this->obtener($id));
            $resultadoJson = $this->codificarJson($resultado);
            $logs = $this->agregarLog($logs, 'completada', 'La acción terminó correctamente.');
            $actualizado = $wpdb->update(
                $this->tabla,
                [
                    'estado' => 'completado',
                    'resultado' => $resultadoJson,
                    'logs' => $this->codificarJson($logs),
                    'fecha_ejecucion' => current_time('mysql'),
                ],
                ['id' => $id],
                ['%s', '%s', '%s', '%s'],
                ['%d']
            );
            if ($actualizado === false) {
                throw new \RuntimeException('No se pudo guardar el resultado de la acción del agente.');
            }
        } catch (\Throwable $e) {
            $errorJson = $this->codificarJson(['error' => $e->getMessage()]);
            $logs = $this->agregarLog($logs, 'fallida', $e->getMessage());
            $actualizado = $wpdb->update(
                $this->tabla,
                [
                    'estado' => 'fallido',
                    'resultado' => $errorJson,
                    'logs' => $this->codificarJson($logs),
                    'fecha_ejecucion' => current_time('mysql'),
                ],
                ['id' => $id],
                ['%s', '%s', '%s', '%s'],
                ['%d']
            );
            if ($actualizado === false) {
                error_log('[AgentActionService] No se pudo guardar el fallo de la acción ' . $id . ': ' . $e->getMessage());
            }
            throw $e;
        }

        return $this->obtener($id) ?? [];
    }

    private function normalizarFila(array $row): array
    {
        $payload = $this->decodificarJson((string)($row['payload'] ?? '{}'), []);
        $resultado = $this->decodificarJson((string)($row['resultado'] ?? 'null'), null);
        $logs = $this->decodificarJson((string)($row['logs'] ?? '[]'), []);
        $userId = (int)$row['user_id'];
        $channel = is_array($payload) ? (string)($payload['channel'] ?? 'app') : 'app';
        $sourceTimezone = UserTimeService::actionTimezoneName(is_array($payload) ? $payload : [], $userId, $channel);
        $displayTimezone = UserTimeService::resolveTimezoneName($userId, $channel);
        $fechaProgramada = $row['fecha_programada'] ?? null;
        $fechaProgramadaUsuario = null;
        if (is_string($fechaProgramada) && $fechaProgramada !== '') {
            try {
                $fechaProgramadaUsuario = (new \DateTimeImmutable($fechaProgramada, new \DateTimeZone($sourceTimezone)))
                    ->setTimezone(new \DateTimeZone($displayTimezone))
                    ->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                $fechaProgramadaUsuario = $fechaProgramada;
            }
        }

        return [
            'id' => (int)$row['id'],
            'user_id' => $userId,
            'correlation_id' => $row['correlation_id'] ?? null,
            'tipo' => (string)$row['tipo'],
            'titulo' => (string)$row['titulo'],
            'estado' => (string)$row['estado'],
            'requiere_aprobacion' => (bool)$row['requiere_aprobacion'],
            'payload' => is_array($payload) ? $payload : [],
            'resultado' => $resultado,
            'logs' => is_array($logs) ? $logs : [],
            'aprobado_por' => isset($row['aprobado_por']) ? (int)$row['aprobado_por'] : null,
            'fecha_programada' => $fechaProgramada,
            'fecha_programada_usuario' => $fechaProgramadaUsuario,
            'fecha_programada_timezone' => $displayTimezone,
            'fecha_programada_source_timezone' => $sourceTimezone,
            'fecha_creacion' => $row['fecha_creacion'] ?? null,
            'fecha_aprobacion' => $row['fecha_aprobacion'] ?? null,
            'fecha_ejecucion' => $row['fecha_ejecucion'] ?? null,
        ];
    }

    private function accionEstaVencida(array $accion): bool
    {
        $fecha = $accion['fecha_programada'] ?? null;
        if (!is_string($fecha) || $fecha === '') {
            return false;
        }

        try {
            $timezone = (string)($accion['fecha_programada_source_timezone'] ?? UserTimeService::resolveTimezoneName());
            $programada = new \DateTimeImmutable($fecha, new \DateTimeZone($timezone));
            return $programada->getTimestamp() <= time();
        } catch (\Throwable $e) {
            error_log('[AgentActionService] Fecha programada inválida id=' . (int)($accion['id'] ?? 0) . ': ' . $e->getMessage());
            return false;
        }
    }

    private function codificarJson(mixed $value): string
    {
        $json = wp_json_encode($value, JSON_UNESCAPED_UNICODE);
        if (!is_string($json) || json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('No se pudo codificar el JSON de la acción del agente.');
        }
        if (strlen($json) > self::MAX_JSON_LENGTH) {
            throw new \RuntimeException('El JSON de la acción del agente supera el límite permitido.');
        }
        return $json;
    }

    private function decodificarJson(string $json, mixed $fallback): mixed
    {
        $decoded = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('[AgentActionService] JSON corrupto en acción del agente: ' . json_last_error_msg());
            return $fallback;
        }
        return $decoded;
    }

    private function crearCorrelationId(): string
    {
        return 'agent_' . bin2hex(random_bytes(8));
    }

    private function crearLog(string $evento, string $mensaje): array
    {
        return [
            'evento' => $evento,
            'mensaje' => sanitize_text_field($mensaje),
            'fecha' => current_time('mysql'),
        ];
    }

    private function agregarLog(array $logs, string $evento, string $mensaje): array
    {
        $logs[] = $this->crearLog($evento, $mensaje);
        return array_slice($logs, -50);
    }
}

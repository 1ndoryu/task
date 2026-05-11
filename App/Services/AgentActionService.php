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
        global $wpdb;

        $estado = $requiereAprobacion ? 'requiere_aprobacion' : 'pendiente';
        $payloadJson = $this->codificarJson($payload);
        $insertado = $wpdb->insert(
            $this->tabla,
            [
                'user_id' => $userId,
                'tipo' => $tipo,
                'titulo' => $titulo,
                'estado' => $estado,
                'requiere_aprobacion' => $requiereAprobacion ? 1 : 0,
                'payload' => $payloadJson,
                'fecha_creacion' => current_time('mysql'),
            ],
            ['%d', '%s', '%s', '%s', '%d', '%s', '%s']
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

        $actualizado = $wpdb->update(
            $this->tabla,
            [
                'estado' => 'ejecutando',
                'aprobado_por' => $adminId,
                'fecha_aprobacion' => current_time('mysql'),
            ],
            ['id' => $id],
            ['%s', '%d', '%s'],
            ['%d']
        );
        if ($actualizado === false) {
            throw new \RuntimeException('No se pudo marcar la acción del agente como ejecutando.');
        }

        try {
            $resultado = $executor($this->obtener($id));
            $resultadoJson = $this->codificarJson($resultado);
            $actualizado = $wpdb->update(
                $this->tabla,
                [
                    'estado' => 'completado',
                    'resultado' => $resultadoJson,
                    'fecha_ejecucion' => current_time('mysql'),
                ],
                ['id' => $id],
                ['%s', '%s', '%s'],
                ['%d']
            );
            if ($actualizado === false) {
                throw new \RuntimeException('No se pudo guardar el resultado de la acción del agente.');
            }
        } catch (\Throwable $e) {
            $errorJson = $this->codificarJson(['error' => $e->getMessage()]);
            $actualizado = $wpdb->update(
                $this->tabla,
                [
                    'estado' => 'fallido',
                    'resultado' => $errorJson,
                    'fecha_ejecucion' => current_time('mysql'),
                ],
                ['id' => $id],
                ['%s', '%s', '%s'],
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

        return [
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'tipo' => (string)$row['tipo'],
            'titulo' => (string)$row['titulo'],
            'estado' => (string)$row['estado'],
            'requiere_aprobacion' => (bool)$row['requiere_aprobacion'],
            'payload' => is_array($payload) ? $payload : [],
            'resultado' => $resultado,
            'aprobado_por' => isset($row['aprobado_por']) ? (int)$row['aprobado_por'] : null,
            'fecha_creacion' => $row['fecha_creacion'] ?? null,
            'fecha_aprobacion' => $row['fecha_aprobacion'] ?? null,
            'fecha_ejecucion' => $row['fecha_ejecucion'] ?? null,
        ];
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
}

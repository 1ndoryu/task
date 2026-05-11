<?php

namespace App\Services;

use App\Database\Schema;

class AgentChatService
{
    private const MAX_CONTENT_LENGTH = 20000;
    private const MAX_ACTIONS_LENGTH = 1048576;

    private string $tabla;

    public function __construct()
    {
        $this->tabla = Schema::getTableName('agent_chat_messages');
        Schema::ensureTableExists('agent_chat_messages');
    }

    public function guardarMensaje(int $userId, string $sessionId, string $rol, string $contenido, ?array $acciones = null, int $tokens = 0): array
    {
        global $wpdb;

        $sessionId = $this->normalizarSessionId($sessionId);
        $rol = $this->normalizarRol($rol);
        $contenido = trim(wp_strip_all_tags($contenido));
        if ($contenido === '' || strlen($contenido) > self::MAX_CONTENT_LENGTH) {
            throw new \InvalidArgumentException('Mensaje del agente vacío o demasiado largo.');
        }

        $accionesJson = $acciones !== null ? $this->codificarJson($acciones, self::MAX_ACTIONS_LENGTH) : null;
        $insertado = $wpdb->insert(
            $this->tabla,
            [
                'user_id' => $userId,
                'session_id' => $sessionId,
                'rol' => $rol,
                'contenido' => $contenido,
                'acciones' => $accionesJson,
                'tokens' => max(0, $tokens),
                'fecha_creacion' => current_time('mysql'),
            ],
            ['%d', '%s', '%s', '%s', '%s', '%d', '%s']
        );

        if (!$insertado) {
            throw new \RuntimeException('No se pudo guardar el mensaje del agente.');
        }

        return $this->obtener((int)$wpdb->insert_id) ?? [];
    }

    public function listarMensajes(int $userId, string $sessionId, int $limit = 80): array
    {
        global $wpdb;

        $sessionId = $this->normalizarSessionId($sessionId);
        $limit = max(1, min(120, $limit));
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->tabla} WHERE user_id = %d AND session_id = %s ORDER BY id DESC LIMIT %d",
                $userId,
                $sessionId,
                $limit
            ),
            ARRAY_A
        );

        $mensajes = array_map([$this, 'normalizarFila'], is_array($rows) ? $rows : []);
        return array_reverse($mensajes);
    }

    public function limpiarSesion(int $userId, string $sessionId): int
    {
        global $wpdb;

        $deleted = $wpdb->delete(
            $this->tabla,
            ['user_id' => $userId, 'session_id' => $this->normalizarSessionId($sessionId)],
            ['%d', '%s']
        );

        if ($deleted === false) {
            throw new \RuntimeException('No se pudo limpiar la sesión del agente.');
        }

        return (int)$deleted;
    }

    private function obtener(int $id): ?array
    {
        global $wpdb;

        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->tabla} WHERE id = %d", $id), ARRAY_A);
        return is_array($row) ? $this->normalizarFila($row) : null;
    }

    private function normalizarFila(array $row): array
    {
        $acciones = $row['acciones'] !== null ? json_decode((string)$row['acciones'], true) : null;
        if ($row['acciones'] !== null && json_last_error() !== JSON_ERROR_NONE) {
            error_log('[AgentChatService] JSON de acciones corrupto: ' . json_last_error_msg());
            $acciones = null;
        }

        return [
            'id' => (int)$row['id'],
            'sessionId' => (string)$row['session_id'],
            'rol' => (string)$row['rol'],
            'contenido' => (string)$row['contenido'],
            'acciones' => is_array($acciones) ? $acciones : null,
            'tokens' => (int)$row['tokens'],
            'fechaCreacion' => $row['fecha_creacion'] ?? null,
        ];
    }

    private function normalizarRol(string $rol): string
    {
        $rol = strtolower(trim($rol));
        if (!in_array($rol, ['usuario', 'asistente', 'sistema'], true)) {
            throw new \InvalidArgumentException('Rol de mensaje del agente inválido.');
        }
        return $rol;
    }

    private function normalizarSessionId(string $sessionId): string
    {
        $sessionId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $sessionId) ?: '';
        if ($sessionId === '' || strlen($sessionId) > 80) {
            throw new \InvalidArgumentException('Sesión del agente inválida.');
        }
        return $sessionId;
    }

    private function codificarJson(array $value, int $maxLength): string
    {
        $json = wp_json_encode($value, JSON_UNESCAPED_UNICODE);
        if (!is_string($json) || json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('No se pudo codificar JSON del chat del agente.');
        }
        if (strlen($json) > $maxLength) {
            throw new \RuntimeException('JSON del chat del agente demasiado grande.');
        }
        return $json;
    }
}

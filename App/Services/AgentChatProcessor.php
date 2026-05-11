<?php

namespace App\Services;

use App\Repository\TareasRepository;
use App\Repository\HabitosRepository;

/* [109A+109B] Motor PHP para procesar mensajes del chatbot desde cualquier canal (app, whatsapp).
 * Usa LLMProviderService + MemPalaceService + AgentChatService.
 * El frontend React sigue manejando su propio flujo LLM; este procesador es para canales server-side.
 * Canal 'whatsapp': responde directamente via WacliService sin aprobación para acciones básicas.
 * Canal 'app': crea propuestas aprobables (comportamiento idéntico al frontend).
 * Gotcha: crear_habito/eliminar_habito no se ejecutan directamente — se crean como propuestas.
 */
class AgentChatProcessor
{
    private const MAX_HISTORIAL      = 20;
    private const MAX_CONTEXT_TAREAS = 30;
    private const PROVEEDOR_DEFAULT  = 'groq';
    private const MODELO_DEFAULT     = 'llama-3.3-70b-versatile';

    private AgentChatService $chat;
    private MemPalaceService  $mempalace;

    public function __construct()
    {
        $this->chat      = new AgentChatService();
        $this->mempalace = new MemPalaceService();
    }

    /**
     * Procesa un mensaje del usuario y retorna la respuesta.
     * @param int    $userId     WP user ID
     * @param string $sessionId  ID de sesión ('default', 'whatsapp_NUMERO', etc.)
     * @param string $mensaje    Mensaje del usuario
     * @param string $canal      'app' | 'whatsapp'
     * @return array{respuesta: string, acciones: array, ejecutadas: array}
     */
    public function procesar(int $userId, string $sessionId, string $mensaje, string $canal = 'app'): array
    {
        $historial  = $this->chat->listarMensajes($userId, $sessionId, self::MAX_HISTORIAL);
        $contexto   = $this->buildContexto($userId);
        $memorias   = $this->mempalace->search($mensaje);
        $systemMsg  = $this->buildSystemPrompt($contexto, $memorias, $canal);

        /* Construir messages para el LLM */
        $messages = [['role' => 'system', 'content' => $systemMsg]];
        foreach ($historial as $m) {
            $rol = $m['rol'] === 'usuario' ? 'user' : 'assistant';
            $messages[] = ['role' => $rol, 'content' => $m['contenido']];
        }
        $messages[] = ['role' => 'user', 'content' => $mensaje];

        /* Llamar al LLM */
        $llmResult = (new LLMProviderService())->enviarChat(
            $messages,
            self::PROVEEDOR_DEFAULT,
            self::MODELO_DEFAULT,
            ['temperature' => 0.7, 'maxTokens' => 1000]
        );
        $rawContent = (string)($llmResult['content'] ?? $llmResult['message'] ?? '');
        $parsed     = $this->parsear($rawContent);

        /* Ejecutar acciones */
        $ejecutadas = $this->ejecutarAcciones($userId, $canal, $parsed['acciones']);

        /* Persistir mensajes */
        $this->chat->guardarMensaje($userId, $sessionId, 'usuario', $mensaje, null, 0);
        $this->chat->guardarMensaje($userId, $sessionId, 'asistente', $parsed['respuesta'], $parsed['acciones'], (int)($llmResult['tokens'] ?? 0));

        /* Guardar memorias en MemPalace en background (no bloquea la respuesta) */
        $this->guardarMemoria($userId, $mensaje, $parsed['respuesta'], $canal);

        return [
            'respuesta' => $parsed['respuesta'],
            'acciones'  => $parsed['acciones'],
            'ejecutadas' => $ejecutadas,
        ];
    }

    /* --- System prompt ------------------------------------------------------ */

    private function buildSystemPrompt(string $contexto, string $memorias, string $canal): string
    {
        $instruccionCanal = $canal === 'whatsapp'
            ? "\nEstás respondiendo por WHATSAPP. Sé conciso, sin markdown, sin listas largas. Máximo 3 oraciones por mensaje."
            : '';

        $bloqueMemoria = $memorias !== ''
            ? "\n\n## Memorias relevantes del usuario\n{$memorias}"
            : '';

        return "Eres un asistente de productividad integrado en un dashboard personal. Ayudas al usuario a planificar su día, crear tareas y gestionar su productividad.{$instruccionCanal}

RESPONDE SIEMPRE en formato JSON con esta estructura exacta:
{\"respuesta\": \"tu mensaje al usuario en español\", \"acciones\": []}

ACCIONES DISPONIBLES:
- {\"tipo\": \"crear_tarea\", \"parametros\": {\"texto\": \"nombre\", \"prioridad\": \"alta|media|baja\", \"urgencia\": \"urgente|normal|chill\"}}
- {\"tipo\": \"completar_tarea\", \"parametros\": {\"id\": 123}}
- {\"tipo\": \"editar_tarea\", \"parametros\": {\"id\": 123, \"texto\": \"nuevo nombre\"}}
- {\"tipo\": \"programar_recordatorio\", \"parametros\": {\"titulo\": \"...\", \"mensaje\": \"...\", \"fecha\": \"ISO8601\", \"recurrence_minutes\": 60, \"channel\": \"whatsapp\"}}
- {\"tipo\": \"proponer_whatsapp\", \"parametros\": {\"mensaje\": \"texto\", \"to\": \"numero opcional\"}}

REGLAS:
- Si no hay acciones, envía \"acciones\": [].
- No inventes IDs. Solo usa IDs del contexto.
- NUNCA uses eliminar sin que el usuario lo pida explícitamente.
- Responde siempre en español.
- programar_recordatorio con channel=whatsapp enviará el mensaje por WhatsApp en la fecha indicada.
- Si recurrence_minutes > 0 el recordatorio se repetirá con ese intervalo.{$bloqueMemoria}

{$contexto}";
    }

    /* --- Contexto de tareas y hábitos -------------------------------------- */

    private function buildContexto(int $userId): string
    {
        try {
            $tareas  = (new TareasRepository($userId))->getAll();
            $habitos = (new HabitosRepository($userId))->getAll();
        } catch (\Throwable) {
            return '';
        }

        $pendientes = array_slice(array_filter($tareas, fn($t) => empty($t['completado'])), 0, self::MAX_CONTEXT_TAREAS);
        $ctx = "## Tareas pendientes\n";
        if (empty($pendientes)) {
            $ctx .= "No hay tareas pendientes.\n";
        } else {
            foreach ($pendientes as $t) {
                $det = implode(', ', array_filter([
                    !empty($t['prioridad']) ? "prioridad:{$t['prioridad']}" : '',
                    (!empty($t['urgencia']) && $t['urgencia'] !== 'normal') ? "urgencia:{$t['urgencia']}" : '',
                ]));
                $ctx .= "- [id:{$t['id']}] {$t['texto']}" . ($det ? " ({$det})" : '') . "\n";
            }
        }

        $hoy = date('Y-m-d');
        $ctx .= "\n## Hábitos activos\n";
        $habitosActivos = array_filter($habitos, fn($h) => empty($h['pausado']));
        foreach ($habitosActivos as $h) {
            $hecho = in_array($hoy, (array)($h['historialCompletados'] ?? []), true) ? '✓' : '○';
            $ctx .= "- [id:{$h['id']}] {$hecho} {$h['nombre']} (racha:{$h['racha']})\n";
        }

        return $ctx;
    }

    /* --- Parseo respuesta LLM ---------------------------------------------- */

    private function parsear(string $contenido): array
    {
        /* Limpiar think blocks (DeepSeek, etc.) */
        $limpio = preg_replace('/<think>[\s\S]*?<\/think>/', '', $contenido);
        $limpio = trim((string)$limpio);

        /* Intentar JSON directo */
        $decoded = json_decode($limpio, true);
        if (is_array($decoded) && isset($decoded['respuesta'])) {
            return ['respuesta' => (string)$decoded['respuesta'], 'acciones' => (array)($decoded['acciones'] ?? [])];
        }

        /* Extraer JSON de code block */
        if (preg_match('/```(?:json)?\s*([\s\S]+?)```/', $limpio, $m)) {
            $decoded = json_decode(trim($m[1]), true);
            if (is_array($decoded) && isset($decoded['respuesta'])) {
                return ['respuesta' => (string)$decoded['respuesta'], 'acciones' => (array)($decoded['acciones'] ?? [])];
            }
        }

        /* Fallback: devolver el texto como respuesta sin acciones */
        return ['respuesta' => $limpio, 'acciones' => []];
    }

    /* --- Ejecutores de acciones -------------------------------------------- */

    private function ejecutarAcciones(int $userId, string $canal, array $acciones): array
    {
        $ejecutadas = [];
        foreach ($acciones as $accion) {
            $tipo  = (string)($accion['tipo'] ?? '');
            $param = (array)($accion['parametros'] ?? []);
            try {
                $ejecutadas[] = $this->ejecutarAccion($userId, $canal, $tipo, $param);
            } catch (\Throwable $e) {
                $ejecutadas[] = ['tipo' => $tipo, 'exito' => false, 'error' => $e->getMessage()];
            }
        }
        return $ejecutadas;
    }

    private function ejecutarAccion(int $userId, string $canal, string $tipo, array $param): array
    {
        switch ($tipo) {
            case 'crear_tarea':
                $repo = new TareasRepository($userId);
                $tareas = $repo->getAll();
                $maxId = max(0, ...array_column($tareas, 'id'));
                $nueva = [
                    'id' => $maxId + 1,
                    'texto' => sanitize_text_field((string)($param['texto'] ?? '')),
                    'completado' => false,
                    'prioridad' => $param['prioridad'] ?? null,
                    'urgencia' => $param['urgencia'] ?? 'normal',
                    'fechaCreacion' => current_time('c'),
                ];
                $tareas[] = $nueva;
                $repo->saveAll($tareas);
                return ['tipo' => $tipo, 'exito' => true, 'id' => $nueva['id']];

            case 'completar_tarea':
                $id = (int)($param['id'] ?? 0);
                $repo = new TareasRepository($userId);
                $tareas = $repo->getAll();
                foreach ($tareas as &$t) {
                    if ((int)$t['id'] === $id) {
                        $t['completado'] = true;
                        $t['fechaCompletado'] = current_time('c');
                        break;
                    }
                }
                unset($t);
                $repo->saveAll($tareas);
                return ['tipo' => $tipo, 'exito' => true, 'id' => $id];

            case 'editar_tarea':
                $id = (int)($param['id'] ?? 0);
                $repo = new TareasRepository($userId);
                $tareas = $repo->getAll();
                foreach ($tareas as &$t) {
                    if ((int)$t['id'] === $id) {
                        foreach (['texto', 'prioridad', 'urgencia'] as $campo) {
                            if (isset($param[$campo])) {
                                $t[$campo] = sanitize_text_field((string)$param[$campo]);
                            }
                        }
                        break;
                    }
                }
                unset($t);
                $repo->saveAll($tareas);
                return ['tipo' => $tipo, 'exito' => true, 'id' => $id];

            case 'programar_recordatorio':
                /* Soporta recurrence_minutes y channel en payload */
                $titulo   = sanitize_text_field((string)($param['titulo'] ?? 'Recordatorio'));
                $mensajeR = sanitize_textarea_field((string)($param['mensaje'] ?? ''));
                $fecha    = (string)($param['fecha'] ?? '');
                $payload  = [
                    'titulo'             => $titulo,
                    'mensaje'            => $mensajeR,
                    'channel'            => (string)($param['channel'] ?? ($canal === 'whatsapp' ? 'whatsapp' : 'app')),
                    'recurrence_minutes' => max(0, (int)($param['recurrence_minutes'] ?? 0)),
                ];
                (new AgentActionService())->crearProgramada(
                    $userId,
                    $payload['channel'] === 'whatsapp' ? 'whatsapp_send_text' : 'reminder_notify',
                    $titulo,
                    $payload,
                    $fecha,
                    false // no requiere aprobación: fue pedido por el usuario directamente
                );
                return ['tipo' => $tipo, 'exito' => true];

            case 'proponer_whatsapp':
                $msg = sanitize_textarea_field((string)($param['mensaje'] ?? ''));
                if ($canal === 'whatsapp' && $msg !== '') {
                    /* Desde WhatsApp: enviar directamente (usuario ya aprobó implícitamente) */
                    (new WacliService())->enviarTexto($param['to'] ?? null, $msg);
                    return ['tipo' => $tipo, 'exito' => true, 'enviado' => true];
                }
                /* Desde app: crear propuesta aprobable */
                (new AgentActionService())->crearPropuesta($userId, 'whatsapp_send_text', 'Enviar WhatsApp', [
                    'message' => $msg,
                    'to'      => $param['to'] ?? null,
                ]);
                return ['tipo' => $tipo, 'exito' => true, 'pendiente_aprobacion' => true];

            default:
                return ['tipo' => $tipo, 'exito' => false, 'error' => 'Tipo de acción no soportado en canal server-side'];
        }
    }

    /* --- Memoria ------------------------------------------------------------ */

    private function guardarMemoria(int $userId, string $userMsg, string $assistantMsg, string $canal): void
    {
        if (!$this->mempalace->disponible()) {
            return;
        }
        /* Solo guardar si el mensaje tiene sustancia (más de 20 caracteres) */
        if (strlen($userMsg) < 20 && strlen($assistantMsg) < 20) {
            return;
        }
        $resumen = "Usuario (canal:{$canal}): {$userMsg}\nAsistente: {$assistantMsg}";
        $this->mempalace->remember($resumen, 'chat');
    }
}

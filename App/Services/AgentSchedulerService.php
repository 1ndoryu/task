<?php

namespace App\Services;

use App\Repository\HabitosRepository;
use App\Database\Schema;

/* [109B] Scheduler del agente con soporte de recordatorios recurrentes y sub-hourly.
 * Se registra el schedule 'every_5_minutes' para granularidad de 5 min en recordatorios.
 * La recurrencia se gestiona via payload.recurrence_minutes: al ejecutar una acción recurrente
 * se crea automáticamente la siguiente instancia.
 * Gotcha: WP-Cron necesita visitantes para dispararse; en producción se recomienda
 *         un cron real del sistema: * /5 * * * * curl -s https://task.nakomi.studio/wp-cron.php
 */
class AgentSchedulerService
{
    public const CRON_HOOK = 'glory_agent_process_due_actions';

    public static function register(): void
    {
        add_action('init', [self::class, 'ensureScheduled']);
        add_filter('cron_schedules', [self::class, 'addCronSchedules']);
        add_action(self::CRON_HOOK, [self::class, 'processDueActions']);
    }

    /** Registra schedules sub-hourly para recordatorios frecuentes. */
    public static function addCronSchedules(array $schedules): array
    {
        $schedules['every_5_minutes'] = [
            'interval' => 5 * MINUTE_IN_SECONDS,
            'display'  => 'Cada 5 minutos',
        ];
        $schedules['every_30_minutes'] = [
            'interval' => 30 * MINUTE_IN_SECONDS,
            'display'  => 'Cada 30 minutos',
        ];
        return $schedules;
    }

    public static function ensureScheduled(): void
    {
        $next = wp_next_scheduled(self::CRON_HOOK);

        /* [fix-schedule-interval] Si el hook ya existe pero con un intervalo distinto a
         * every_5_minutes (ej: quedó registrado como 'hourly' de una versión anterior),
         * des-registrarlo y volver a agendar con el intervalo correcto.
         * Gotcha: wp_get_schedule() devuelve false si el hook no existe, o el nombre
         * del schedule si existe — comparamos solo el string. */
        $scheduleActual = $next !== false ? wp_get_schedule(self::CRON_HOOK) : null;
        if ($next !== false && $scheduleActual === 'every_5_minutes') {
            return; // Ya está correctamente registrado
        }

        if ($next !== false) {
            /* Des-registrar el evento con intervalo incorrecto antes de recrear */
            wp_unschedule_event($next, self::CRON_HOOK);
        }

        wp_schedule_event(time() + 30, 'every_5_minutes', self::CRON_HOOK);
    }

    public static function processDueActions(): void
    {
        try {
            (new AgentActionService())->procesarProgramadas(function (array $accion) {
                $tipo    = (string)($accion['tipo'] ?? '');
                $payload = is_array($accion['payload'] ?? null) ? $accion['payload'] : [];
                $userId  = (int)$accion['user_id'];

                $resultado = self::ejecutarTipoAccion($tipo, $payload, $userId);

                /* [109B] Manejar recurrencia: si payload tiene recurrence_minutes > 0,
                 * crear siguiente instancia programada tras la ejecución exitosa. */
                $recurrenciaMin = (int)($payload['recurrence_minutes'] ?? 0);
                if ($recurrenciaMin > 0 && $userId > 0) {
                    self::programarSiguienteRecurrencia($userId, $tipo, $payload, $recurrenciaMin);
                }

                return $resultado;
            });
            /* [Fase-6] Analizar todos los usuarios con WhatsApp activo, no solo admins */
            (new AgentProactiveService())->analizarTodos(false);
        } catch (\Throwable $e) {
            error_log('[AgentSchedulerService] Error procesando acciones programadas: ' . $e->getMessage());
        }
    }

    /* --- Helpers privados --------------------------------------------------- */

    private static function ejecutarTipoAccion(string $tipo, array $payload, int $userId): array
    {
        if ($tipo === 'reminder_notify') {
            $titulo  = sanitize_text_field((string)($payload['titulo'] ?? 'Recordatorio del agente'));
            $mensaje = sanitize_textarea_field((string)($payload['mensaje'] ?? 'Tienes un recordatorio pendiente.'));
            $channel = (string)($payload['channel'] ?? 'app');
            $recordatorio = self::resolverRecordatorioDinamico($payload, $titulo, $mensaje, $userId);
            if (!empty($recordatorio['omitir'])) {
                return ['provider' => 'local-notification', 'skipped' => true, 'reason' => $recordatorio['razon'] ?? 'dynamic_reminder_without_target'];
            }
            $titulo  = (string)($recordatorio['titulo'] ?? $titulo);
            $mensaje = (string)($recordatorio['mensaje'] ?? $mensaje);

            /* [fix-personalizar-todos] Personalizar el mensaje via LLM para todos los canales.
             * Aplica tanto a recordatorios de hábitos como a recordatorios de una sola vez
             * (ej: "comprar pollo"). Fallback al texto resuelto si la llamada LLM falla. */
            $mensajeEnviado = $userId > 0
                ? self::generarMensajePersonalizado($userId, $mensaje)
                : $mensaje;

            /* Notificación en app siempre */
            $resultado = (new NotificacionesService())->crear($userId, NotificacionesService::TIPO_MENSAJE_CHAT, $titulo, $mensajeEnviado, [
                'source' => 'agent_reminder',
            ]);
            if (empty($resultado['exito'])) {
                throw new \RuntimeException((string)($resultado['mensaje'] ?? 'No se pudo crear la notificación.'));
            }

            /* Si el canal es WhatsApp, también enviar por WhatsApp */
            if ($channel === 'whatsapp') {
                try {
                    (new WacliService())->enviarTexto(null, "⏰ {$titulo}: {$mensajeEnviado}");
                } catch (\Throwable $e) {
                    error_log('[AgentSchedulerService] No se pudo enviar recordatorio por WhatsApp: ' . $e->getMessage());
                }
            }

            return ['provider' => 'local-notification', 'notification' => $resultado['notificacion'] ?? null];
        }

        if ($tipo === 'whatsapp_send_text') {
            return (new WacliService())->enviarTexto(
                isset($payload['to']) ? (string)$payload['to'] : null,
                (string)($payload['message'] ?? '')
            );
        }

        /* [115A-11] agent_invoke: el scheduler llama a AgentChatProcessor con un mensaje natural.
         * Permite programar recordatorios complejos con lógica de agente (ej: "crea la tarea X
         * si no existe"). El agente evaluará el mensaje y ejecutará las acciones que considere.
         * payload: { message: string, channel?: string, session?: string } */
        if ($tipo === 'agent_invoke') {
            $msg     = sanitize_textarea_field((string)($payload['message'] ?? ''));
            $channel = (string)($payload['channel'] ?? 'app');
            $session = (string)($payload['session'] ?? 'agent_scheduled');
            if ($msg === '' || $userId === 0) {
                return ['provider' => 'agent_invoke', 'ok' => false, 'error' => 'Mensaje o userId vacío'];
            }
            $resultado = (new \App\Services\AgentChatProcessor())->procesar($userId, $session, $msg, $channel);
            return ['provider' => 'agent_invoke', 'ok' => true, 'respuesta' => $resultado['respuesta'] ?? ''];
        }

        /* [115A-11] crear_tarea_si_no_existe como tipo directo del scheduler (sin LLM overhead).
         * Solo crea la tarea si no hay ninguna activa (no completada) con el mismo nombre. */
        if ($tipo === 'crear_tarea_si_no_existe') {
            $texto = sanitize_text_field((string)($payload['texto'] ?? ''));
            if ($texto === '' || $userId === 0) {
                return ['provider' => 'local', 'ok' => false, 'error' => 'Texto o userId vacío'];
            }
            $repo   = new \App\Repository\TareasRepository($userId);
            $tareas = $repo->getAll();
            foreach ($tareas as $t) {
                if (empty($t['completado']) && mb_strtolower(trim($t['texto'])) === mb_strtolower(trim($texto))) {
                    return ['provider' => 'local', 'ok' => true, 'creada' => false, 'razon' => 'Ya existe tarea activa'];
                }
            }
            $maxId = empty($tareas) ? 0 : max(0, ...array_column($tareas, 'id'));
            $nueva = [
                'id'           => $maxId + 1,
                'texto'        => $texto,
                'completado'   => false,
                'prioridad'    => $payload['prioridad'] ?? null,
                'urgencia'     => $payload['urgencia'] ?? 'normal',
                'fechaCreacion' => current_time('c'),
            ];
            $tareas[] = $nueva;
            $_ok = $repo->saveAll($tareas);
            return ['provider' => 'local', 'ok' => true, 'creada' => true, 'id' => $nueva['id']];
        }

        return ['provider' => 'local', 'message' => 'Tipo programado sin ejecutor específico.'];
    }

    /* [115A-15] Recordatorios de hábitos se resuelven al ejecutarse, no al crearse.
     * Gotcha: el texto guardado por el LLM puede ser genérico; el hábito prioritario cambia
     * con el estado del día, así que se consulta HabitosRepository justo antes de notificar. */
    private static function resolverRecordatorioDinamico(array $payload, string $titulo, string $mensaje, int $userId): array
    {
        if (!self::esRecordatorioHabitoPendiente($payload, $titulo, $mensaje) || $userId <= 0) {
            return ['titulo' => $titulo, 'mensaje' => $mensaje];
        }

        $habito = self::obtenerHabitoPendientePrioritario($userId);
        if ($habito === null) {
            return ['omitir' => true, 'razon' => 'no_pending_habits'];
        }

        $nombre = sanitize_text_field((string)($habito['nombre'] ?? 'hábito sin nombre'));
        $importancia = self::etiquetaImportancia((string)($habito['importancia'] ?? ''));
        $detalleImportancia = $importancia !== '' ? " ({$importancia})" : '';

        return [
            'titulo' => 'Hábito pendiente',
            'mensaje' => "{$nombre}{$detalleImportancia}",
        ];
    }

    private static function esRecordatorioHabitoPendiente(array $payload, string $titulo, string $mensaje): bool
    {
        $tipoDinamico = self::normalizarTexto((string)($payload['dynamic_type'] ?? $payload['tipo_dinamico'] ?? ''));
        if (in_array($tipoDinamico, ['habit_pending', 'habito_pendiente'], true)) {
            return true;
        }

        $texto = self::normalizarTexto($titulo . ' ' . $mensaje);
        return str_contains($texto, 'habito pendiente') || str_contains($texto, 'habitos pendientes');
    }

    /* [fix-personalizar-todos] Genera un recordatorio cálido y personalizado via LLM para
     * cualquier tipo de recordatorio (hábito, one-shot, etc.).
     * Recibe el asunto/descripción ya resuelto y lo convierte en mensaje natural.
     * Fallback al texto recibido si la llamada LLM falla. */
    private static function generarMensajePersonalizado(int $userId, string $asunto): string
    {
        if ($asunto === '') {
            return $asunto;
        }
        $fallback = $asunto;

        try {
            $maestro   = (string)(get_user_meta($userId, 'glory_chatbot_master_context', true));
            /* [Fase-6] Leer de user_meta con fallback a WP option global */
            $proveedor = (string)(get_user_meta($userId, 'glory_chatbot_proveedor', true) ?: get_option('glory_chatbot_proveedor') ?: 'groq');
            $modelo    = (string)(get_user_meta($userId, 'glory_chatbot_modelo', true)    ?: get_option('glory_chatbot_modelo')    ?: 'llama-3.3-70b-versatile');

            global $wpdb;
            $tabla = Schema::getTableName('agent_chat_messages');
            $rows  = $wpdb->get_results($wpdb->prepare(
                "SELECT rol, contenido FROM {$tabla} WHERE user_id = %d ORDER BY id DESC LIMIT 8",
                $userId
            ), ARRAY_A);
            $mensajesRecientes = '';
            if (!empty($rows)) {
                $rows  = array_reverse($rows);
                $partes = array_map(fn(array $r): string =>
                    ucfirst((string)($r['rol'] ?? '')) . ': ' . mb_substr((string)($r['contenido'] ?? ''), 0, 200),
                    $rows
                );
                $mensajesRecientes = implode("\n", $partes);
            }

            $system  = 'Eres el asistente personal del usuario. Tu tarea es convertir un asunto de recordatorio en un mensaje breve, cálido y natural (1-2 oraciones). No expliques nada, no añadas frases genéricas de bot. Responde SOLO con el texto del mensaje para enviar al usuario.';
            $userMsg = "Contexto del usuario:\n{$maestro}\n\nÚltimos mensajes del chat:\n{$mensajesRecientes}\n\nAsunto del recordatorio: {$asunto}\n\nEscribe el mensaje del recordatorio:";

            $llmResult = (new LLMProviderService())->enviarChat(
                [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user',   'content' => $userMsg],
                ],
                $proveedor,
                $modelo,
                ['temperature' => 0.7, 'maxTokens' => 300]
            );
            $generado = trim((string)($llmResult['contenido'] ?? $llmResult['content'] ?? $llmResult['message'] ?? ''));
            return $generado !== '' ? $generado : $fallback;
        } catch (\Throwable $e) {
            error_log('[AgentSchedulerService] No se pudo generar recordatorio personalizado: ' . $e->getMessage());
            return $fallback;
        }
    }

    private static function obtenerHabitoPendientePrioritario(int $userId): ?array
    {
        try {
            $hoy = current_time('Y-m-d');
            $habitos = (new HabitosRepository($userId))->getAll();
            /* [fix-completadoHoy] Tambien verificar el flag completadoHoy del frontend
             * (consistente con AgentProactiveService) ademas del check por fecha. */
            $pendientes = array_values(array_filter($habitos, function (array $habito) use ($hoy): bool {
                return empty($habito['pausado'])
                    && empty($habito['completadoHoy'])
                    && !self::habitoCompletadoEnFecha($habito, $hoy);
            }));

            if (empty($pendientes)) {
                return null;
            }

            usort($pendientes, function (array $a, array $b): int {
                $pesoA = self::pesoImportancia((string)($a['importancia'] ?? ''));
                $pesoB = self::pesoImportancia((string)($b['importancia'] ?? ''));
                if ($pesoA !== $pesoB) {
                    return $pesoB <=> $pesoA;
                }
                return ((int)($a['id'] ?? 0)) <=> ((int)($b['id'] ?? 0));
            });

            return $pendientes[0];
        } catch (\Throwable $e) {
            error_log('[AgentSchedulerService] No se pudo resolver hábito pendiente prioritario: ' . $e->getMessage());
            return null;
        }
    }

    private static function habitoCompletadoEnFecha(array $habito, string $fecha): bool
    {
        if (($habito['ultimoCompletado'] ?? '') === $fecha) {
            return true;
        }
        return in_array($fecha, (array)($habito['historialCompletados'] ?? []), true);
    }

    private static function pesoImportancia(string $importancia): int
    {
        return [
            'muy_alta' => 5,
            'alta' => 4,
            'media' => 3,
            'baja' => 2,
            'muy_baja' => 1,
        ][self::normalizarImportancia($importancia)] ?? 0;
    }

    private static function etiquetaImportancia(string $importancia): string
    {
        return [
            'muy_alta' => 'importancia muy alta',
            'alta' => 'importancia alta',
            'media' => 'importancia media',
            'baja' => 'importancia baja',
            'muy_baja' => 'importancia muy baja',
        ][self::normalizarImportancia($importancia)] ?? '';
    }

    private static function normalizarImportancia(string $importancia): string
    {
        return str_replace(' ', '_', self::normalizarTexto($importancia));
    }

    private static function normalizarTexto(string $texto): string
    {
        $texto = mb_strtolower(trim($texto));
        return strtr($texto, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
    }

    private static function programarSiguienteRecurrencia(int $userId, string $tipo, array $payload, int $minutosIntervalo): void
    {
        try {
            /* [125A-5] Bug fix: date() usaba time() (UTC) pero procesarProgramadas() compara con
             * current_time('mysql') (hora local del sitio). Para sitios con gmt_offset negativo
             * (ej. UTC-4 Venezuela), la recurrencia se retrasaba por el valor del offset.
             * Fix: usar current_time('timestamp') que ya incluye el gmt_offset, equivalente a
             * time() + gmt_offset*3600. Así la fecha almacenada y la query usan la misma zona. */
            $fechaSiguiente = date('Y-m-d H:i:s', current_time('timestamp') + ($minutosIntervalo * MINUTE_IN_SECONDS));
            $_created = (new AgentActionService())->crearProgramada(
                $userId,
                $tipo,
                (string)($payload['titulo'] ?? 'Recordatorio recurrente'),
                $payload,
                $fechaSiguiente,
                false // sin aprobación — ya fue aprobada al crearla
            );
        } catch (\Throwable $e) {
            error_log('[AgentSchedulerService] No se pudo programar recurrencia: ' . $e->getMessage());
        }
    }
}

AgentSchedulerService::register();


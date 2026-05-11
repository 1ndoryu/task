<?php
/* sentinel-disable-file limite-lineas
 * Justificación: motor central del agente con ~30 action cases en ejecutarAccion()
 * — equivalente a un REST controller con muchas rutas. Dividir requirería extraer
 * AgentActionExecutor con toda la inyección de dependencias; pendiente como tarea separada. */

namespace App\Services;

use App\Repository\TareasRepository;
use App\Repository\HabitosRepository;
use App\Repository\NotasRepository;

/* [109A+109B] Motor PHP para procesar mensajes del chatbot desde cualquier canal (app, whatsapp).
 * Usa LLMProviderService + MemPalaceService + AgentChatService.
 * El frontend React sigue manejando su propio flujo LLM; este procesador es para canales server-side.
 * Canal 'whatsapp': responde directamente via WacliService sin aprobación para acciones básicas.
 * Canal 'app': crea propuestas aprobables (comportamiento idéntico al frontend).
 * Gotcha: crear_habito/eliminar_habito no se ejecutan directamente — se crean como propuestas.
 */
class AgentChatProcessor
{
    private const MAX_HISTORIAL            = 20;    // mensajes recientes que van al LLM
    private const MAX_CONTEXT_TAREAS      = 30;
    private const MAX_CONTEXT_NOTAS       = 10;    // notas que se incluyen en el contexto
    private const MAX_CONTEXT_RECORDAT    = 15;    // recordatorios activos en contexto
    /* [115A-1] Compactación por tamaño de contexto (chars totales del historial).
     * Threshold configurable via WP option glory_chatbot_compaction_chars (default 8000).
     * COMPACTION_KEEP_CHARS: chars del historial reciente que se conservan tras compactar.
     * Proveedor/modelo leídos de WP options glory_chatbot_proveedor / glory_chatbot_modelo. */
    private const COMPACTION_KEEP_CHARS    = 4000;  // chars de historial reciente a conservar
    /* [115A-3] Contexto maestro: texto persistente por usuario, modificable por el agente.
     * Si supera MASTER_CONTEXT_MAX_CHARS (~9000 tokens), se compacta automáticamente. */
    private const MASTER_CONTEXT_MAX_CHARS = 36000; // ~9000 tokens → compactar contexto maestro

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
    /**
     * Procesa un mensaje del usuario y retorna la respuesta.
     * @param int        $userId     WP user ID
     * @param string     $sessionId  ID de sesión ('default', 'whatsapp_NUMERO', etc.)
     * @param string     $mensaje    Mensaje del usuario (o texto de transcripción de audio)
     * @param string     $canal      'app' | 'whatsapp'
     * @param array|null $media      Opcional: ['mimeType' => string, 'base64' => string] para visión
     * @return array{respuesta: string, acciones: array, ejecutadas: array}
     */
    public function procesar(int $userId, string $sessionId, string $mensaje, string $canal = 'app', ?array $media = null): array
    {
        $historial       = $this->chat->listarMensajes($userId, $sessionId, self::MAX_HISTORIAL);
        $contexto        = $this->buildContexto($userId);
        $memorias        = $this->mempalace->search($mensaje !== '' ? $mensaje : 'imagen recibida', $userId);
        $contextoMaestro = $this->getMasterContext($userId);
        $systemMsg       = $this->buildSystemPrompt($contexto, $memorias, $canal, $contextoMaestro);

        /* Construir messages para el LLM */
        $messages = [['role' => 'system', 'content' => $systemMsg]];
        foreach ($historial as $m) {
            $rol = $m['rol'] === 'usuario' ? 'user' : 'assistant';
            $messages[] = ['role' => $rol, 'content' => $m['contenido']];
        }

        /* [115A-5] Si hay imagen, usar content array multimodal para visión */
        $esImagen = $media !== null && str_starts_with((string)($media['mimeType'] ?? ''), 'image/') && !empty($media['base64']);
        if ($esImagen) {
            $textoUsuario = $mensaje !== '' ? $mensaje : 'El usuario envió esta imagen.';
            $messages[] = ['role' => 'user', 'content' => [
                ['type' => 'text', 'text' => $textoUsuario],
                ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $media['mimeType'] . ';base64,' . $media['base64']]],
            ]];
        } else {
            $messages[] = ['role' => 'user', 'content' => $mensaje];
        }

        /* Llamar al LLM con proveedor/modelo configurados (no hardcodeados).
         * Para visión forzamos un modelo multimodal de Groq. */
        $llm = $this->resolverConfigLLM();
        if ($esImagen) {
            $llm = ['proveedor' => 'groq', 'modelo' => 'meta-llama/llama-4-scout-17b-16e-instruct'];
        }
        $llmResult = (new LLMProviderService())->enviarChat(
            $messages,
            $llm['proveedor'],
            $llm['modelo'],
            ['temperature' => 0.7, 'maxTokens' => 1000]
        );
        $rawContent = (string)($llmResult['contenido'] ?? $llmResult['content'] ?? $llmResult['message'] ?? '');
        $parsed     = $this->parsear($rawContent);

        /* Ejecutar acciones (con retry) */
        $ejecutadas = $this->ejecutarAcciones($userId, $canal, $parsed['acciones']);

        /* [116A-1] Segunda llamada al LLM cuando alguna acción de consulta retornó datos.
         * Sin esto el modelo responde antes de ver los datos y dice "no puedo acceder".
         * Solo aplica a acciones que devuelven datos; las de mutación no necesitan 2da llamada. */
        $accionesConsulta = ['leer_nota', 'leer_notas', 'buscar_nota', 'listar_tareas', 'listar_recordatorios', 'buscar_memoria'];
        $hayDatosConsulta = false;
        foreach ($ejecutadas as $ej) {
            if (in_array($ej['tipo'] ?? '', $accionesConsulta, true) && ($ej['exito'] ?? false)) {
                $hayDatosConsulta = true;
                break;
            }
        }
        if ($hayDatosConsulta) {
            $messages[] = ['role' => 'assistant', 'content' => $rawContent];
            $lineasResultados = [];
            foreach ($ejecutadas as $ej) {
                if ($ej['exito'] ?? false) {
                    $lineasResultados[] = ($ej['tipo'] ?? 'accion') . ' → ' . json_encode($ej, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }
            }
            $messages[] = ['role' => 'user', 'content' => "[RESULTADOS DE HERRAMIENTAS]\n" . implode("\n", $lineasResultados) . "\n\nAhora responde al usuario usando estos datos."];
            $llmResult2  = (new LLMProviderService())->enviarChat($messages, $llm['proveedor'], $llm['modelo'], ['temperature' => 0.7, 'maxTokens' => 1000]);
            $rawContent2 = (string)($llmResult2['contenido'] ?? $llmResult2['content'] ?? $llmResult2['message'] ?? '');
            $parsed2     = $this->parsear($rawContent2);
            if ($parsed2['respuesta'] !== '') {
                $parsed['respuesta'] = $parsed2['respuesta'];
            }
        }

        $parsed['respuesta'] = $this->anotarFallosEnRespuesta($parsed['respuesta'], $ejecutadas);

        /* Persistir mensajes */
        $_ok = $this->chat->guardarMensaje($userId, $sessionId, 'usuario', $mensaje, null, 0);
        $_ok = $this->chat->guardarMensaje($userId, $sessionId, 'asistente', $parsed['respuesta'], $parsed['acciones'], (int)($llmResult['tokensComplecion'] ?? $llmResult['tokens'] ?? 0));

        /* Guardar memorias en MemPalace en background (no bloquea la respuesta) */
        $_ok = $this->guardarMemoria($userId, $mensaje, $parsed['respuesta'], $canal, $sessionId);

        /* Compactar historial si la sesión creció demasiado */
        $this->compactarHistorialSiNecesario($userId, $sessionId);

        return [
            'respuesta' => $parsed['respuesta'],
            'acciones'  => $parsed['acciones'],
            'ejecutadas' => $ejecutadas,
        ];
    }

    /* --- System prompt ------------------------------------------------------ */

    /* [115A-1+115A-3] buildSystemPrompt recibe contextoMaestro (texto persistente del usuario).
     * El contexto maestro se inyecta antes del contexto de tareas/hábitos/notas. */
    private function buildSystemPrompt(string $contexto, string $memorias, string $canal, string $contextoMaestro = ''): string
    {
        $instruccionCanal = $canal === 'whatsapp'
            ? "\nEstás respondiendo por WHATSAPP. Sé conciso, sin markdown, sin listas largas. Máximo 3 oraciones por mensaje."
            : '';

        $bloqueMaestro = $contextoMaestro !== ''
            ? "\n\n## Contexto personal (permanente — recuerda esto siempre)\n{$contextoMaestro}\n"
            : '';

        /* [115A-8] Las memorias ya vienen filtradas semánticamente por MemPalace (top-5 relevantes
         * al mensaje actual). No es un volcado completo — es búsqueda vectorial por relevancia.
         * guardar_memoria solo se usa para hechos NUEVOS que el usuario menciona y que no están
         * en las memorias recuperadas. No repetir lo que ya está en el bloque de memorias. */
        $bloqueMemoria = $memorias !== ''
            ? "\n\n## Memorias relevantes (filtradas por similitud al mensaje actual)\n{$memorias}\n\nEstas memorias ya están filtradas por relevancia. Úsalas para personalizar tu respuesta. Si el usuario menciona algo NUEVO e importante que no está aquí, usa guardar_memoria."
            : "\n\nTienes un sistema de memoria semántica persistente. Si el usuario menciona algo importante y nuevo (nombre real, preferencias de vida, datos personales, metas duraderas), guárdalo con guardar_memoria."
        ;

        return "Eres un asistente de productividad integrado en un dashboard personal. Ayudas al usuario a planificar su día, crear tareas y gestionar su productividad.{$instruccionCanal}

RESPONDE SIEMPRE en formato JSON con esta estructura exacta:
{\"respuesta\": \"tu mensaje al usuario en español\", \"acciones\": []}

ACCIONES DISPONIBLES:
- {\"tipo\": \"crear_tarea\", \"parametros\": {\"texto\": \"nombre\", \"prioridad\": \"alta|media|baja\", \"urgencia\": \"urgente|normal|chill\"}}
- {\"tipo\": \"completar_tarea\", \"parametros\": {\"id\": 123}}
- {\"tipo\": \"editar_tarea\", \"parametros\": {\"id\": 123, \"texto\": \"nuevo nombre\"}}
- {\"tipo\": \"programar_recordatorio\", \"parametros\": {\"titulo\": \"...\", \"mensaje\": \"...\", \"fecha\": \"ISO8601\", \"recurrence_minutes\": 60, \"channel\": \"whatsapp\"}}
- {\"tipo\": \"listar_recordatorios\", \"parametros\": {}}
- {\"tipo\": \"editar_recordatorio\", \"parametros\": {\"id\": 123, \"fecha\": \"ISO8601\", \"titulo\": \"nuevo titulo\", \"mensaje\": \"nuevo mensaje\"}}
- {\"tipo\": \"eliminar_recordatorio\", \"parametros\": {\"id\": 123}}
- {\"tipo\": \"completar_habito\", \"parametros\": {\"id\": 123}}
- {\"tipo\": \"completar_subhabito\", \"parametros\": {\"id\": 123, \"subId\": 0}}
- {\"tipo\": \"leer_notas\", \"parametros\": {\"limite\": 10}}
- {\"tipo\": \"leer_nota\", \"parametros\": {\"id\": 38}} — lee el contenido COMPLETO de una nota por su ID. El contexto SOLO muestra títulos, no el contenido. SIEMPRE usa esta acción cuando el usuario pida ver, leer o preguntar sobre el contenido de una nota.
- {\"tipo\": \"crear_nota\", \"parametros\": {\"titulo\": \"...\", \"contenido\": \"...\"}}
- {\"tipo\": \"editar_nota\", \"parametros\": {\"id\": 123, \"contenido\": \"...\", \"titulo\": \"opcional\"}}
- {\"tipo\": \"buscar_nota\", \"parametros\": {\"termino\": \"...\"}}
- {\"tipo\": \"proponer_whatsapp\", \"parametros\": {\"mensaje\": \"texto\", \"to\": \"numero opcional\"}}
- {\"tipo\": \"guardar_memoria\", \"parametros\": {\"contenido\": \"hecho a recordar\", \"categoria\": \"preferencias|hechos|metas|whatsapp\"}}
- {\"tipo\": \"crear_tarea_si_no_existe\", \"parametros\": {\"texto\": \"nombre\", \"prioridad\": \"alta|media|baja\", \"urgencia\": \"urgente|normal|chill\"}}
- {\"tipo\": \"actualizar_contexto_maestro\", \"parametros\": {\"texto\": \"contexto completo actualizado\"}}
- {\"tipo\": \"solicitar_opencode\", \"parametros\": {\"proyecto\": \"glorytemplate\", \"agente\": \"whatsapp-code\", \"prompt\": \"cambio de codigo solicitado\", \"commit\": true, \"deploy\": false, \"branch\": \"glory-react-logic\"}}

REGLAS:
- NOTAS — REGLA CRÍTICA: Las notas en el contexto muestran SOLO el título. Para ver el contenido de una nota SIEMPRE debes llamar leer_nota con el ID. NUNCA digas \"no puedo acceder al contenido\" — siempre puedes, usando leer_nota. Si el usuario pide ver, leer o preguntar sobre una nota: llama leer_nota con su ID y responde con \"déjame leer esa nota\" o similar, luego recibirás el contenido.
- Puedes incluir MÚLTIPLES acciones en el array y se ejecutan todas. Úsalas en paralelo cuando sea necesario (ej: crear tarea + guardar memoria + programar recordatorio en una sola respuesta).
- Si no hay acciones, envía \"acciones\": [].
- No inventes IDs. Solo usa IDs del contexto.
- NUNCA uses eliminar/completar sin que el usuario lo pida explícitamente.
- Responde siempre en español.
- programar_recordatorio con channel=whatsapp enviará el mensaje por WhatsApp. Si recurrence_minutes > 0, se repetirá con ese intervalo.
- Los recordatorios activos ya están listados en el contexto con sus IDs — úsalos para editar o eliminar.
- guardar_memoria: solo para información nueva y valiosa (nombre, preferencias, metas) que no esté ya en las memorias recuperadas.
- crear_tarea_si_no_existe: úsala en recordatorios automáticos o cuando quieras asegurarte de no duplicar. Solo crea si no hay tarea activa (no completada) con ese nombre exacto.
- actualizar_contexto_maestro: DEBES llamarla proactivamente (sin que el usuario lo pida) cuando detectes información duradera importante: nombre real, horarios de trabajo, rutinas fijas, preferencias de vida, instrucciones permanentes, cambios de situación personal. Escribe el contexto maestro COMPLETO actualizado, no solo la parte nueva. Esto es lo que persiste entre todas las sesiones — mantenlo útil y conciso.
- solicitar_opencode: úsala cuando el usuario pida cambios de código, investigación técnica, leer roadmap o archivos, commit, push, PR o deploy. El proyecto siempre es \"glorytemplate\" salvo que el usuario especifique otro. La rama por defecto es \"glory-react-logic\"; inclúyela siempre en branch. No incluyas modelo: se usa el configurado. Cuando llega por WhatsApp, el runner ejecuta sin aprobación adicional; NO le digas al usuario que necesita aprobar algo. Solo incluye deploy=true si el usuario lo pide explícitamente.{$bloqueMemoria}{$bloqueMaestro}

{$contexto}";
    }

    /* --- Contexto de tareas y hábitos -------------------------------------- */

    /* [115A-6] buildContexto incluye sub-hábitos, notas recientes (títulos) y recordatorios programados. */
    private function buildContexto(int $userId): string
    {
        try {
            $tareas  = (new TareasRepository($userId))->getAll();
            $habitos = (new HabitosRepository($userId))->getAll();
            $notas   = (new NotasRepository($userId))->listar(self::MAX_CONTEXT_NOTAS);
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
        $habitosActivos = array_values(array_filter($habitos, fn($h) => empty($h['pausado'])));

        /* [115A-habit-order] Ordenar: pendientes hoy primero, dentro de cada grupo por importancia desc.
         * Pesos: muy_alta=5, alta=4, media=3, baja=2, muy_baja=1, sin valor=0. */
        $pesosImp = ['muy_alta' => 5, 'alta' => 4, 'media' => 3, 'baja' => 2, 'muy_baja' => 1];
        usort($habitosActivos, function (array $a, array $b) use ($hoy, $pesosImp) {
            $aHecho = in_array($hoy, (array)($a['historialCompletados'] ?? []), true);
            $bHecho = in_array($hoy, (array)($b['historialCompletados'] ?? []), true);
            if ($aHecho !== $bHecho) {
                return $aHecho ? 1 : -1; /* incompletos primero */
            }
            $pa = $pesosImp[$a['importancia'] ?? ''] ?? 0;
            $pb = $pesosImp[$b['importancia'] ?? ''] ?? 0;
            return $pb <=> $pa; /* mayor importancia primero */
        });

        foreach ($habitosActivos as $h) {
            $hecho = in_array($hoy, (array)($h['historialCompletados'] ?? []), true) ? '✓' : '○';
            $imp   = (string)($h['importancia'] ?? '');
            $det   = array_values(array_filter([
                $imp !== '' ? "importancia:{$imp}" : '',
                (int)($h['racha'] ?? 0) > 0 ? "racha:{$h['racha']}" : '',
                (!empty($h['ventanaOportunidad']['habilitada']))
                    ? sprintf('ventana:%02d:%02d-%02d:%02d',
                        (int)($h['ventanaOportunidad']['horaInicio'] ?? 0),
                        (int)($h['ventanaOportunidad']['minutoInicio'] ?? 0),
                        (int)($h['ventanaOportunidad']['horaFin'] ?? 0),
                        (int)($h['ventanaOportunidad']['minutoFin'] ?? 0))
                    : '',
            ]));
            $ctx .= '- [id:' . $h['id'] . "] {$hecho} {$h['nombre']}" . (!empty($det) ? ' (' . implode(', ', $det) . ')' : '') . "\n";
            /* Sub-hábitos (con índice para la acción completar_subhabito) */
            if (!empty($h['subhabitos']) && is_array($h['subhabitos'])) {
                foreach ($h['subhabitos'] as $idx => $sh) {
                    $shHecho  = !empty($sh['completadoHoy']) ? '✓' : '○';
                    $shNombre = (string)($sh['nombre'] ?? $sh['texto'] ?? "sub-{$idx}");
                    $ctx .= "  - [sub:{$idx}] {$shHecho} " . mb_substr($shNombre, 0, 50) . "\n";
                }
            }
        }

        /* Notas recientes — título + preview de contenido (primeros 300 chars).
         * Incluir contenido evita que el modelo diga "no puedo acceder" sin llamar leer_nota.
         * Para el contenido completo de una nota larga, el modelo puede usar leer_nota. */
        if (!empty($notas)) {
            $ctx .= "\n## Notas recientes\n";
            foreach ($notas as $nota) {
                $titulo    = $nota['titulo'] !== '' ? $nota['titulo'] : '(sin título)';
                $contenido = (string)($nota['contenido'] ?? '');
                $preview   = mb_strlen($contenido) > 300
                    ? mb_substr($contenido, 0, 300) . '… [usa leer_nota id:' . $nota['id'] . ' para ver completa]'
                    : $contenido;
                $ctx .= "- [id:{$nota['id']}] " . mb_substr($titulo, 0, 60) . "\n";
                if ($preview !== '') {
                    $ctx .= "  Contenido: " . str_replace("\n", ' ', $preview) . "\n";
                }
            }
        }

        /* Recordatorios programados activos */
        try {
            $recordatorios = (new AgentActionService())->listar($userId, 'pendiente', self::MAX_CONTEXT_RECORDAT);
            $conFecha = array_values(array_filter($recordatorios, fn($r) => !empty($r['fecha_programada'])));
            if (!empty($conFecha)) {
                $ctx .= "\n## Recordatorios programados\n";
                foreach ($conFecha as $r) {
                    $recurrencia = !empty($r['payload']['recurrence_minutes'])
                        ? " (cada {$r['payload']['recurrence_minutes']}min)" : '';
                    $ctx .= "- [id:{$r['id']}] {$r['titulo']}{$recurrencia} — {$r['fecha_programada']}\n";
                }
            }
        } catch (\Throwable) {
            /* No bloquear si AgentActionService falla */
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

    /* [115A-9] Retry hasta 3 intentos con backoff 200/400ms para errores transitorios.
     * Los errores lógicos (ID inexistente, validación) fallan rápido sin reintentar.
     * Los fallos persistentes se anotan en la respuesta para que el usuario los vea. */
    private function ejecutarAcciones(int $userId, string $canal, array $acciones): array
    {
        $ejecutadas = [];
        foreach ($acciones as $accion) {
            $tipo  = (string)($accion['tipo'] ?? '');
            $param = (array)($accion['parametros'] ?? []);
            $resultado   = null;
            $ultimoError = '';
            for ($intento = 1; $intento <= 3; $intento++) {
                try {
                    $resultado = $this->ejecutarAccion($userId, $canal, $tipo, $param);
                    break; // éxito — salir del loop
                } catch (\LogicException $e) {
                    /* Error lógico (validación, ID no encontrado) — no reintentar */
                    $ultimoError = $e->getMessage();
                    break;
                } catch (\Throwable $e) {
                    $ultimoError = $e->getMessage();
                    error_log("[AgentChatProcessor] Acción {$tipo} intento {$intento}/3 falló: {$ultimoError}");
                    if ($intento < 3) {
                        usleep(200000 * $intento); // 200ms, 400ms
                    }
                }
            }
            if ($resultado === null) {
                $resultado = ['tipo' => $tipo, 'exito' => false, 'error' => $ultimoError, 'intentos' => 3];
            }
            $ejecutadas[] = $resultado;
        }
        return $ejecutadas;
    }

    /* [115A-9] Si alguna acción falló tras 3 intentos, anota el motivo en el texto de respuesta. */
    private function anotarFallosEnRespuesta(string $respuesta, array $ejecutadas): string
    {
        $fallos = array_filter($ejecutadas, fn($e) => !($e['exito'] ?? false) && isset($e['intentos']));
        if (empty($fallos)) {
            return $respuesta;
        }
        $detalle = implode('\n', array_map(
            fn($f) => '• ' . ($f['tipo'] ?? '?') . ': ' . ($f['error'] ?? 'error desconocido'),
            array_values($fallos)
        ));
        return $respuesta . "\n\n⚠️ Algunas acciones no pudieron completarse tras 3 intentos:\n{$detalle}";
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
                $_ok = $repo->saveAll($tareas);
                return ['tipo' => $tipo, 'exito' => true, 'id' => $nueva['id']];

            /* [115A-11] Solo crea la tarea si no hay una activa (no completada) con el mismo nombre.
             * Ideal para recordatorios recurrentes o acciones de scheduler que no deben duplicar. */
            case 'crear_tarea_si_no_existe':
                $textoBuscar = sanitize_text_field((string)($param['texto'] ?? ''));
                if ($textoBuscar === '') {
                    throw new \LogicException('crear_tarea_si_no_existe requiere parámetro texto.');
                }
                $repo   = new TareasRepository($userId);
                $tareas = $repo->getAll();
                foreach ($tareas as $t) {
                    if (empty($t['completado']) && mb_strtolower(trim($t['texto'])) === mb_strtolower(trim($textoBuscar))) {
                        return ['tipo' => $tipo, 'exito' => true, 'creada' => false, 'razon' => 'Ya existe tarea activa con ese nombre'];
                    }
                }
                $maxId  = empty($tareas) ? 0 : max(0, ...array_column($tareas, 'id'));
                $nueva  = [
                    'id'           => $maxId + 1,
                    'texto'        => $textoBuscar,
                    'completado'   => false,
                    'prioridad'    => $param['prioridad'] ?? null,
                    'urgencia'     => $param['urgencia'] ?? 'normal',
                    'fechaCreacion' => current_time('c'),
                ];
                $tareas[] = $nueva;
                $_ok = $repo->saveAll($tareas);
                return ['tipo' => $tipo, 'exito' => true, 'creada' => true, 'id' => $nueva['id']];

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
                $_ok = $repo->saveAll($tareas);
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
                $_ok = $repo->saveAll($tareas);
                return ['tipo' => $tipo, 'exito' => true, 'id' => $id];

            case 'programar_recordatorio':
                /* Soporta recurrence_minutes y channel en payload */
                $titulo   = sanitize_text_field((string)($param['titulo'] ?? 'Recordatorio'));
                $mensajeR = sanitize_textarea_field((string)($param['mensaje'] ?? ''));
                $fecha    = (string)($param['fecha'] ?? '');
                /* [116A-3] El LLM puede no generar fecha (ej: "cada 30 minutos"), o generarla
                 * en pasado (la genera durante su thinking). Normalizar ambas al momento actual
                 * para que el scheduler con recurrence_minutes se encargue de la recurrencia. */
                $tsFecha = $fecha !== '' ? strtotime($fecha) : false;
                if ($tsFecha === false || $tsFecha < (time() - 60)) {
                    $fecha = current_time('mysql');
                }
                $payload  = [
                    'titulo'             => $titulo,
                    'mensaje'            => $mensajeR,
                    'channel'            => (string)($param['channel'] ?? ($canal === 'whatsapp' ? 'whatsapp' : 'app')),
                    'recurrence_minutes' => max(0, (int)($param['recurrence_minutes'] ?? 0)),
                ];
                $_created = (new AgentActionService())->crearProgramada(
                    $userId,
                    'reminder_notify',
                    $titulo,
                    $payload,
                    $fecha,
                    false // no requiere aprobación: fue pedido por el usuario directamente
                );
                return ['tipo' => $tipo, 'exito' => true];

            case 'proponer_whatsapp':
                $msg = sanitize_textarea_field((string)($param['mensaje'] ?? ''));
                if ($canal === 'whatsapp' && $msg !== '') {
                    /* Desde WhatsApp: solo se puede responder al propio sessionId.
                     * Prohibido enviar a números arbitrarios desde canal whatsapp
                     * para evitar que el LLM use el bot como herramienta de spam. */
                    $toParam = isset($param['to']) ? trim((string)$param['to']) : '';
                    if ($toParam !== '') {
                        /* Validar que el destino sea el mismo número de la sesión */
                        $sessionNum = preg_replace('/[^0-9]/', '', $sessionId);
                        $toNum      = preg_replace('/[^0-9]/', '', $toParam);
                        if ($sessionNum !== $toNum) {
                            return ['tipo' => $tipo, 'exito' => false, 'error' => 'Destino externo no permitido desde canal whatsapp'];
                        }
                    }
                    (new WacliService())->enviarTexto($toParam !== '' ? $toParam : null, $msg);
                    return ['tipo' => $tipo, 'exito' => true, 'enviado' => true];
                }
                /* Desde app: crear propuesta aprobable */
                $_created = (new AgentActionService())->crearPropuesta($userId, 'whatsapp_send_text', 'Enviar WhatsApp', [
                    'message' => $msg,
                    'to'      => $param['to'] ?? null,
                ]);
                return ['tipo' => $tipo, 'exito' => true, 'pendiente_aprobacion' => true];

            case 'guardar_memoria':
                $contenido = sanitize_textarea_field((string)($param['contenido'] ?? ''));
                $categoria = sanitize_key((string)($param['categoria'] ?? 'hechos'));
                /* Categorías permitidas — evita que el LLM invente wings arbitrarios */
                $categoriasValidas = ['preferencias', 'hechos', 'metas', 'whatsapp', 'chat'];
                if (!in_array($categoria, $categoriasValidas, true)) {
                    $categoria = 'hechos';
                }
                if ($contenido !== '' && $this->mempalace->disponible()) {
                    $guardado = $this->mempalace->remember($contenido, $categoria, $userId);
                    return ['tipo' => $tipo, 'exito' => $guardado];
                }
                return ['tipo' => $tipo, 'exito' => false, 'error' => 'MemPalace no disponible o contenido vacío'];

            /* [115A-6] Acciones de hábitos ----------------------------------- */
            case 'completar_habito':
                $id    = (int)($param['id'] ?? 0);
                $repo  = new HabitosRepository($userId);
                $habitos = $repo->getAll();
                $hoy   = date('Y-m-d');
                foreach ($habitos as &$h) {
                    if ((int)$h['id'] === $id) {
                        $hist = (array)($h['historialCompletados'] ?? []);
                        if (!in_array($hoy, $hist, true)) {
                            $hist[] = $hoy;
                            $h['historialCompletados'] = $hist;
                            /* Incrementar racha si el día anterior también fue completado */
                            $ayer = date('Y-m-d', strtotime('-1 day'));
                            if (in_array($ayer, (array)($h['historialCompletados'] ?? []), true) || (int)($h['racha'] ?? 0) === 0) {
                                $h['racha'] = (int)($h['racha'] ?? 0) + 1;
                            }
                        }
                        break;
                    }
                }
                unset($h);
                $_ok = $repo->saveAll($habitos);
                return ['tipo' => $tipo, 'exito' => true, 'id' => $id];

            case 'completar_subhabito':
                $id    = (int)($param['id'] ?? 0);
                $subId = (int)($param['subId'] ?? 0);
                $repo  = new HabitosRepository($userId);
                $habitos = $repo->getAll();
                foreach ($habitos as &$h) {
                    if ((int)$h['id'] === $id && isset($h['subhabitos'][$subId])) {
                        $h['subhabitos'][$subId]['completadoHoy'] = true;
                        break;
                    }
                }
                unset($h);
                $_ok = $repo->saveAll($habitos);
                return ['tipo' => $tipo, 'exito' => true, 'id' => $id, 'subId' => $subId];

            /* [115A-6] Acciones de notas ------------------------------------- */
            case 'leer_notas':
                $limite = min(20, max(1, (int)($param['limite'] ?? 10)));
                $notas  = (new NotasRepository($userId))->listar($limite);
                return ['tipo' => $tipo, 'exito' => true, 'notas' => $notas];

            /* [115A-6+116A-1] leer_nota: acción singular para leer contenido COMPLETO de una nota
             * por su ID. El contexto solo muestra títulos; esta acción permite al LLM obtener
             * el contenido completo cuando el usuario pregunta sobre una nota específica. */
            case 'leer_nota':
                $notaId = (int)($param['id'] ?? 0);
                if ($notaId <= 0) {
                    return ['tipo' => $tipo, 'exito' => false, 'error' => 'ID de nota inválido'];
                }
                $nota = (new NotasRepository($userId))->obtener($notaId);
                if ($nota === null) {
                    return ['tipo' => $tipo, 'exito' => false, 'error' => 'Nota no encontrada'];
                }
                /* Devolver contenido completo para que el LLM pueda leerlo */
                return [
                    'tipo' => $tipo,
                    'exito' => true,
                    'id' => $nota['id'],
                    'titulo' => $nota['titulo'],
                    'contenido' => $nota['contenido'],
                    'fecha' => $nota['fechaModificacion'] ?? $nota['fechaCreacion'] ?? null
                ];

            case 'crear_nota':
                $titulo    = sanitize_text_field((string)($param['titulo'] ?? ''));
                $contenido = sanitize_textarea_field((string)($param['contenido'] ?? ''));
                $nueva     = (new NotasRepository($userId))->guardar($contenido, $titulo !== '' ? $titulo : null);
                return ['tipo' => $tipo, 'exito' => $nueva !== null, 'id' => $nueva['id'] ?? null];

            case 'editar_nota':
                $id        = (int)($param['id'] ?? 0);
                $contenido = sanitize_textarea_field((string)($param['contenido'] ?? ''));
                $titulo    = isset($param['titulo']) ? sanitize_text_field((string)$param['titulo']) : null;
                $ok = (new NotasRepository($userId))->actualizar($id, $contenido, $titulo);
                return ['tipo' => $tipo, 'exito' => $ok, 'id' => $id];

            case 'buscar_nota':
                $termino    = sanitize_text_field((string)($param['termino'] ?? ''));
                $resultados = (new NotasRepository($userId))->buscar($termino, 10);
                return ['tipo' => $tipo, 'exito' => true, 'resultados' => $resultados];

            /* [115A-4] Gestión de recordatorios ------------------------------ */
            case 'listar_recordatorios':
                $lista    = (new AgentActionService())->listar($userId, 'pendiente', 20);
                $conFecha = array_values(array_filter($lista, fn($r) => !empty($r['fecha_programada'])));
                return ['tipo' => $tipo, 'exito' => true, 'recordatorios' => $conFecha];

            case 'editar_recordatorio':
                $id     = (int)($param['id'] ?? 0);
                $cambios = [];
                if (!empty($param['fecha']))   $cambios['fecha_programada'] = (string)$param['fecha'];
                if (!empty($param['titulo']))  $cambios['titulo']           = (string)$param['titulo'];
                if (!empty($param['mensaje'])) $cambios['payload_merge']    = ['mensaje' => sanitize_textarea_field((string)$param['mensaje'])];
                $actualizado = (new AgentActionService())->editarProgramada($id, $userId, $cambios);
                return ['tipo' => $tipo, 'exito' => $actualizado !== null, 'id' => $id];

            case 'eliminar_recordatorio':
                $id = (int)($param['id'] ?? 0);
                $ok = (new AgentActionService())->cancelar($id, $userId);
                return ['tipo' => $tipo, 'exito' => $ok, 'id' => $id];

            /* [115A-3] Contexto maestro -------------------------------------- */
            case 'actualizar_contexto_maestro':
                $texto = sanitize_textarea_field((string)($param['texto'] ?? ''));
                $_ok = $this->updateMasterContext($userId, $texto);
                return ['tipo' => $tipo, 'exito' => true];

            /* [115A-13] Solicitudes de codigo remotas: crear propuesta aprobable, no ejecutar.
             * Gotcha: WhatsApp vive en produccion, pero OpenCode corre en la PC local del usuario.
             * Por eso solo persistimos job; el runner local lo reclamara con HMAC tras aprobacion. */
            case 'solicitar_opencode':
                $prompt = sanitize_textarea_field((string)($param['prompt'] ?? $param['mensaje'] ?? ''));
                if ($prompt === '') {
                    throw new \LogicException('solicitar_opencode requiere parámetro prompt.');
                }

                $proyecto  = sanitize_key((string)($param['proyecto'] ?? 'glorytemplate')) ?: 'glorytemplate';
                $agente    = sanitize_key((string)($param['agente'] ?? 'whatsapp-code')) ?: 'whatsapp-code';
                $branch    = sanitize_text_field((string)($param['branch'] ?? 'glory-react-logic')) ?: 'glory-react-logic';
                $commit    = filter_var($param['commit'] ?? false, FILTER_VALIDATE_BOOLEAN);
                $deploy    = filter_var($param['deploy'] ?? false, FILTER_VALIDATE_BOOLEAN);
                $titulo    = 'OpenCode: ' . mb_substr(str_replace(["\r", "\n"], ' ', $prompt), 0, 80);

                /* [115A-15] WhatsApp ya autentico al usuario via HMAC: sin doble aprobacion.
                 * Otros canales (web, CLI) requieren aprobacion manual. */
                $requiereAprobacion = ($canal !== 'whatsapp');

                $accion = (new AgentActionService())->crearPropuesta($userId, 'opencode_job', $titulo, [
                    'project' => $proyecto,
                    'agent'   => $agente,
                    'branch'  => $branch,
                    'prompt'  => $prompt,
                    'commit'  => $commit,
                    'deploy'  => $deploy,
                    'source'  => $canal,
                ], $requiereAprobacion);

                return [
                    'tipo'               => $tipo,
                    'exito'              => true,
                    'pendiente_aprobacion' => $requiereAprobacion,
                    'accion_id'          => $accion['id'] ?? null,
                ];

            default:
                return ['tipo' => $tipo, 'exito' => false, 'error' => 'Tipo de acción no soportado en canal server-side'];
        }
    }

    /* --- Memoria ------------------------------------------------------------ */

    private function guardarMemoria(int $userId, string $userMsg, string $assistantMsg, string $canal, string $sessionId): void
    {
        if (!$this->mempalace->disponible()) {
            return;
        }
        /* Solo guardar intercambios con sustancia mínima para no saturar el palace.
         * Los hechos explícitos se guardan via acción guardar_memoria (ver ejecutarAccion). */
        if (strlen($userMsg) < 40 || strlen($assistantMsg) < 20) {
            return;
        }
        $resumen = "Usuario (canal:{$canal}): {$userMsg}\nAsistente: {$assistantMsg}";
        $this->mempalace->remember($resumen, 'chat', $userId);
    }

    /* --- Compactación de historial ----------------------------------------- */

    /* [115A-1] Compacta el historial cuando el total de chars supera el threshold configurable.
     * En lugar de contar mensajes, mide el tamaño real del contexto. Conserva los últimos
     * COMPACTION_KEEP_CHARS chars. Usa el modelo configurado (no hardcodeado). */
    private function compactarHistorialSiNecesario(int $userId, string $sessionId): void
    {
        global $wpdb;
        $tabla = \App\Database\Schema::getTableName('agent_chat_messages');

        /* Cargar todos los mensajes ordenados para calcular tamaño total */
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT id, rol, contenido FROM {$tabla}
             WHERE user_id = %d AND session_id = %s
             ORDER BY id ASC",
            $userId, $sessionId
        ), ARRAY_A);

        if (empty($rows)) {
            return;
        }

        $totalChars = array_sum(array_map(fn($r) => strlen((string)$r['contenido']), $rows));
        $threshold  = $this->compactionCharsThreshold();

        if ($totalChars <= $threshold) {
            return;
        }

        /* Determinar qué mensajes conservar: acumular desde el final hasta COMPACTION_KEEP_CHARS */
        $rowsReverse = array_reverse($rows);
        $keptChars   = 0;
        $keepIds     = [];
        foreach ($rowsReverse as $r) {
            $keptChars += strlen((string)$r['contenido']);
            if ($keptChars > self::COMPACTION_KEEP_CHARS) {
                break;
            }
            $keepIds[] = $r['id'];
        }

        /* IDs a compactar: los que no están en keepIds y no son 'sistema' */
        $idsACompactar = array_values(array_map(
            fn($r) => (int)$r['id'],
            array_filter($rows, fn($r) => !in_array($r['id'], $keepIds, true) && $r['rol'] !== 'sistema')
        ));

        if (empty($idsACompactar)) {
            return;
        }

        /* Recuperar texto de los mensajes a compactar */
        $placeholders = implode(',', array_fill(0, count($idsACompactar), '%d'));
        $toCompact    = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT rol, contenido FROM {$tabla} WHERE id IN ({$placeholders}) ORDER BY id ASC",
                ...$idsACompactar
            ),
            ARRAY_A
        );

        if (empty($toCompact)) {
            return;
        }

        $bloque = implode("\n", array_map(
            fn($r) => ($r['rol'] === 'usuario' ? 'U' : 'A') . ': ' . $r['contenido'],
            $toCompact
        ));

        /* Resumir con el modelo configurado */
        $llm       = $this->resolverConfigLLM();
        $llmResult = (new LLMProviderService())->enviarChat(
            [
                ['role' => 'system', 'content' => 'Eres un asistente que resume conversaciones. Resume en 3-5 oraciones los puntos clave de esta conversación, en tercera persona, para ser usados como contexto futuro. Incluye: decisiones tomadas, datos personales mencionados, tareas creadas. Sé conciso.'],
                ['role' => 'user',   'content' => $bloque],
            ],
            $llm['proveedor'],
            $llm['modelo'],
            ['temperature' => 0.3, 'maxTokens' => 300]
        );

        $resumen = trim((string)($llmResult['contenido'] ?? $llmResult['content'] ?? $llmResult['message'] ?? ''));
        if ($resumen === '') {
            return;
        }

        /* Borrar los mensajes compactados */
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$tabla} WHERE id IN ({$placeholders})",
                ...$idsACompactar
            )
        );

        /* Insertar el bloque resumen como mensaje 'sistema' al inicio del historial */
        $_ok = $this->chat->guardarMensaje(
            $userId,
            $sessionId,
            'sistema',
            '[Resumen de conversación anterior] ' . $resumen,
            null,
            0
        );
    }

    /* --- Configuración LLM ------------------------------------------------- */

    /* [115A-1] Lee proveedor y modelo desde WP options.
     * Se configuran desde el panel "Asistente IA" sincronizando al servidor.
     * Fallback: groq + llama-3.3-70b-versatile */
    private function resolverConfigLLM(): array
    {
        $proveedor = (string)(get_option('glory_chatbot_proveedor') ?: 'groq');
        $modelo    = (string)(get_option('glory_chatbot_modelo')    ?: 'llama-3.3-70b-versatile');
        return ['proveedor' => $proveedor, 'modelo' => $modelo];
    }

    private function compactionCharsThreshold(): int
    {
        return max(2000, (int)(get_option('glory_chatbot_compaction_chars') ?: 8000));
    }

    /* --- Contexto maestro -------------------------------------------------- */

    /* [115A-3] Lee el contexto maestro del usuario (texto persistente en user_meta). */
    private function getMasterContext(int $userId): string
    {
        $val = get_user_meta($userId, 'glory_chatbot_master_context', true);
        return is_string($val) ? $val : '';
    }

    /* Actualiza el contexto maestro. Si supera MASTER_CONTEXT_MAX_CHARS, lo compacta primero. */
    private function updateMasterContext(int $userId, string $texto): void
    {
        if (strlen($texto) > self::MASTER_CONTEXT_MAX_CHARS) {
            $this->compactarContextoMaestro($userId, $texto);
            return; // compactarContextoMaestro guarda el resultado
        }
        update_user_meta($userId, 'glory_chatbot_master_context', $texto);
    }

    private function compactarContextoMaestro(int $userId, string $texto): void
    {
        $llm       = $this->resolverConfigLLM();
        $llmResult = (new LLMProviderService())->enviarChat(
            [
                ['role' => 'system', 'content' => 'Resume el siguiente contexto personal del usuario en máximo 2000 caracteres, conservando todos los datos importantes: preferencias, instrucciones permanentes, datos personales, metas. Sé conciso pero completo.'],
                ['role' => 'user',   'content' => $texto],
            ],
            $llm['proveedor'],
            $llm['modelo'],
            ['temperature' => 0.2, 'maxTokens' => 600]
        );
        $resumen = trim((string)($llmResult['contenido'] ?? $llmResult['content'] ?? $llmResult['message'] ?? ''));
        if ($resumen !== '') {
            update_user_meta($userId, 'glory_chatbot_master_context', $resumen);
        }
    }
}

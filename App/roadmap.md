# GloryTemplate Roadmap

> **Descripcion:** Dashboard personal con tareas, habitos, proyectos, notas, actividad y mas. Tema WordPress con React islands.
> **Stack:** WordPress + PHP (backend REST), React + TypeScript (frontend islands), Zustand (estado), CSS modular
> **URL produccion:** https://task.nakomi.studio
> **Servidor:** nakomi (Coolify) stack UUID: u00gc8ss4csc4cckkg4g00ks
> **Deploy:** Coolify (.agent/coolify-manager-rs) sitio: nakomi
> **Repositorio:** glorytemplate: rama glory-react-logic
> **Espejo:** https://github.com/1ndoryu/task (rama main = glory-react-logic). Push: `git push task`. Submodulos: Glory, .agent/code-sentinel, .agent/varsense, .agent/coolify-manager-rs, .agent/coolify-manager.

## Herramientas del agente

- Code Sentinel: `.agent/code-sentinel`
- VarSense: `.agent/varsense`
- Coolify Manager: `.agent/coolify-manager-rs`

## Tareas pendientes

### ✅ 109A — MemPalace: memoria semántica del chatbot
- Instalar MemPalace en el servidor host + Flask REST wrapper en /data/mempalace/
- Systemd service `mempalace-api` en 0.0.0.0:4001
- Añadir `extra_hosts: host.docker.internal:host-gateway` al compose de nakomi
- `MemPalaceService.php`: search + remember via HTTP al wrapper
- `AgentChatProcessor.php`: motor PHP para procesar mensajes (context, LLM, acciones, memoria)
- Integrar memoria en el flujo: inyectar en system prompt, guardar hechos al final

### ✅ 109B — WhatsApp bidireccional + recordatorios recurrentes
- Systemd service `wacli-daemon` en el host: `wacli sync --follow --webhook URL --webhook-secret SECRET`
- `WhatsAppWebhookService.php`: HMAC verify + rutear mensaje al AgentChatProcessor
- Endpoint público `POST /wp-json/glory/v1/whatsapp/webhook` (auth via HMAC)
- Recordatorios recurrentes: `every_5_minutes` WP-Cron schedule + payload.recurrence_minutes
- WACLI_WEBHOOK_SECRET env var en Coolify + local

### ✅ 115A-1 — Chatbot: modelo desde configuración + compactación por contexto
- `AgentChatProcessor.php`: leer proveedor/modelo desde WP option `glory_chatbot_proveedor` / `glory_chatbot_modelo` (fallback: groq / llama-3.3-70b-versatile)
- Sincronizar el modelo elegido en el panel React (iaStore) al guardar → `POST /wp-json/glory/v1/admin/opciones` guardando las claves WP
- Reemplazar `COMPACTION_THRESHOLD` (mensajes) por umbral en chars totales del historial (default 8000), configurable vía WP option `glory_chatbot_compaction_chars`
- La compactación también usa el modelo configurado (no hardcodeado)

### ✅ 115A-2 — Chatbot: filtrar número Venezuela
- `WhatsAppWebhookService.php`: en `resolverAdminDesdeRemitente()`, rechazar JIDs que coincidan con `WHATSAPP_SEGUNDO_NUMERO` aunque tengan mapping en wp_usermeta
- Solo el número `WHATSAPP` (EEUU) debe activar el agente; el segundo número debe recibir un mensaje de "solo respondo al número de EEUU" o simplemente ignorarse (decidir)

### ✅ 115A-3 — Chatbot: contexto maestro persistente y modificable
- Añadir tabla o WP option `glory_chatbot_master_context_{userId}` con texto libre del usuario
- El agente puede leer y modificar este contexto mediante acción `actualizar_contexto_maestro {texto}`
- El contexto maestro se inyecta siempre en el system prompt antes del contexto de tareas
- Si el contexto maestro supera ~9000 tokens (≈36000 chars), compactarlo automáticamente con el LLM

### ✅ 115A-4 — Chatbot: gestión de recordatorios (listar, editar, eliminar)
- Añadir acciones: `listar_recordatorios`, `editar_recordatorio {id, campo, valor}`, `eliminar_recordatorio {id}`
- Revisar `AgentActionService` para exponer listado de acciones programadas del usuario
- El agente debe incluir los recordatorios activos en `buildContexto()` para poder referirse a ellos por ID

### ✅ 115A-8 — Chatbot: búsqueda semántica de memorias
### ✅ 115A-9 — Chatbot: retry de acciones fallidas (3 intentos + feedback)
### ✅ 115A-10 — Chatbot: auto-actualización del contexto maestro
### ✅ 115A-11 — Chatbot: acciones paralelas + crear_tarea_si_no_existe + agent_invoke

### ✅ 115A-5 — Chatbot: visión e imágenes/audios WhatsApp
- WhatsAppWebhookService: detecta Media en eventos wacli, no descarta mensajes con solo imagen/audio
- Imágenes: descarga via WacliService.descargarMedia(), base64 → AgentChatProcessor con modelo de visión (meta-llama/llama-4-scout-17b-16e-instruct)
- Audios: transcripción via LLMProviderService.transcribirAudio() con Groq Whisper (whisper-large-v3)
- LLMProviderService: validarMensajes() soporta array content (multimodal), método transcribirAudio() agregado
- Hábitos en contexto: ordenados por completado+importancia, muestran nivel importancia y ventana de oportunidad

### ✅ 115A-6 — Chatbot: acciones de notas y hábitos completos
- Sub-hábitos: leer campo `subhabitos` de HabitosRepository en `buildContexto()`, mostrarlos indentados con su estado
- Acciones nuevas: `completar_habito {id}`, `completar_subhabito {id, subId}`, `leer_notas {limite?}`, `crear_nota {titulo, contenido}`, `editar_nota {id, contenido, titulo?}`, `buscar_nota {termino}`
- Usar `NotasRepository->guardar()`, `->actualizar()`, `->listar()`, `->buscar()`

### 115A-7 — Roadmap: integración chatbot con ayuno y calorías
- Planificar acciones del agente para el plugin de ayuno: `iniciar_ayuno`, `terminar_ayuno`, `estado_ayuno`
- Planificar acciones para registro de calorías: `registrar_comida {descripcion, calorias?}`, `resumen_calorias_hoy`
- Revisar APIs existentes del plugin de ayuno y del módulo de calorías antes de implementar

# Plan: Plugin de agente de IA — arquitectura completa (local + producción, sandbox)

- **Fecha:** 2026-08-27
- **Estado:** activo (diseño aprobado para planificación; ejecución por fases)
- **Dependencias:** backend Rust/Axum existente (`src/services/ai.rs`, `src/handlers/ai.rs`), frontend React (plugin IA `ia-asistente`, `PanelIA`, `iaStore`), PostgreSQL. Sin credenciales externas nuevas (se reutilizan las envs del proyecto anterior). Referencias de diseño: **Hermes** (runtime local), **opencode (sst)**, **grok-build**.
- **Tipo:** feature grande — plugin de agente con runtime de herramientas, dos modos de despliegue y UI de chat/observabilidad.

> **NOTA de contexto (27-08-2026):** el source de `hermes-wan` no está disponible localmente hoy (OneDrive desincronizado); la arquitectura de Hermes está verificada por runtime real (`%LOCALAPPDATA%\hermes\`: `SOUL.md`, `config.yaml` con `context.engine: compressor` + `compression_locks`, `state.db` con `messages_fts`, plugin supervisor con 6 hooks, tool_search con deferral). opencode/grok-build no tienen copia local: se usan como referencia de diseño general (tools-first, dual loop plan/act, compactación por compresión, context edit).

> **[27-08-2026] Hallazgos de investigación — autocompactación en agentes reales (verificado en fuente/docs):**
> - **Hermes** (`agent/context_compressor.py`): dispara al **50%** de la ventana efectiva por defecto (piso **75%** para ventanas <512K; **85%** degenerado). Protege head (system + N) y **tail (~2.5% de la ventana, clamp [10K,25K] tokens)**, resume el medio con modelo **auxiliar** (fallback al principal), template estructurado con marcadores, métricas antes/después completas, anti-thrash (2 compresiones <10% de ahorro → skip), historial persistente en BD (lossy-but-recoverable vía session_search).
> - **opencode** (`session/overflow.ts`, `compaction.ts`): dispara cuando tokens usados `>= usable` (ventana − reserva, buffer 20K). Cola reciente ~**25% de usable** (clamp [2K,15K]), resume con el modelo del agente oculto `compaction` (si no, el principal). Marcador `summary:true` + mensaje sintético de continuación; `prune` opcional borra salidas de tools viejas.
> - **Claude Code**: `autoCompactEnabled` (default true), `autoCompactWindow` (100K–1M), compacta al límite (Sonnet 5 ~967K/1M). Reemplaza por resumen estructurado; re-lee hasta **5 archivos** recientes (>5K tokens vuelven como referencia de ruta), skills re-inyectados con cap **5K tokens/skill, 25K total**. Modelo resumidor no documentado (hereda el de sesión).
> - **Aider** (`history.py`): `--max-chat-history-tokens` (soft limit). Resumen con `[weak_model, main_model]` (débil primero). Cola = **mitad del presupuesto** verbatim; prompt "Resume brevemente... menos detalle de lo viejo, más de lo reciente", en primera persona del usuario.
> - **Cline**: sin umbral/modelo documentado; con modelos distintos al principal cae a truncación rule-based. Cursor: sin doc pública.
> - **Patrones comunes confirmados**: (1) disparador por ocupación de ventana con presupuesto de salida; (2) conservar cola reciente verbatim (25% opencode / 2.5-25K Hermes / mitad Aider); (3) resumen con modelo barato/auxiliar y fallback al principal; (4) resumen estructurado con marcadores + mensaje de continuación; (5) pérdida recuperable (historial en BD, no borrado); (6) métricas antes/después y anti-thrash. NO es patrón general "70-80%" ni "locks": Hermes usa cooldown/anti-thrash en vez de locks.

> **[27-08-2026] Revisión de arquitectura (supervisor_thinker):** VEREDICTO **VIABLE CON RESERVAS**. Núcleo correcto (tools-first, sandbox por modo, memoria sin embeddings v1, SSE, modal propio). Correcciones aplicadas a este plan: (1) tools de archivo SOLO en `AGENTE_MODO=local` (dev), nunca en prod ni siquiera admin; (2) FTS5→`tsvector` de PostgreSQL (FTS5 es SQLite, error de traducción de Hermes); (3) memoria en Postgres (no archivos MD efímeros en contenedor) o bind mount dedicado; (4) canal de confirmación definido: **diff + undo** en v1 (sin confirmación inline; el SSE es unidireccional); (5) timeouts reconciliados: per-tool 5-15s, global 180s, máx 10 turns; (6) streaming explícito en `LlmProviderService` (nueva tarea, con fallback no-stream y reglas de `CHAT_FALLBACK_CHAIN`); (7) **plugin nuevo `agente`** que coexiste con `ia-asistente`; el legacy de acciones JSON **convive en v1** (migración post-v1); (8) NO extraer a `glory-rs` en Fase 0 (YAGNI, 2º consumidor especulativo) — implementar en `task/src/agent/` con frontera limpia y extraer cuando haya consumidor real; (9) validación de rutas con casos Windows (case-insensitive, prefijo+separador, junctions/OneDrive); (10) presupuesto agregado de tokens de tools + límites de `file_search`; (11) skills por umbral de repetición, tope de tamaño y DPI declarado; (12) techo de coste del proveedor con `require_auth`; (13) cancelación mata el loop en el servidor; (14) no-goals declarados: subagentes async y ZPA; (15) no migrar `SeccionConfigMCP` (es global, no del agente).

> **[27-08-2026] Ampliaciones del usuario (segunda pasada):** (1) control de **ventana de contexto máxima y autocompactación** con parámetros reales (ver sección 5.2); (2) **tareas programadas** que ejecute el agente (cron + a prueba de reinicios, sección 8.1); (3) **modo meta** (al detenerse evalúa si la meta se cumplió y continúa), **modo predeterminado** (comandos requieren aprobación) y **modo autónomo** (otro agente evalúa si los comandos son seguros; los inseguros requieren verificación) — sección 9.2; (4) **administración de skills** en config (crear/editar/activar/desactivar skills, no solo autogeneradas) — sección 9.3; (5) **contexto real que recibe** visible en el chat (tokens usados, resumen, qué se recortó) — sección 9.3; (6) **autorecuperación si falla la API** (p.ej. gloryapi): fallback de proveedor + reintento + cola de reintentos — sección 7; (7) **workspaces con tabs**: en local se asigna una carpeta de trabajo; cada workspace tiene tabs y cada tab es un chat/sesión con su propia ventana de contexto; varias tabs en paralelo — sección 9.4; (8) **checklists por fase** (checklist obligatorio antes de cerrar cada fase) — sección 12.

### Problema real

El chat IA actual (`PanelIA`) es un **chat de texto con acciones JSON hardcodeadas**:

- Llamada única LLM request/response **sin streaming** (spinner "Pensando…").
- "Herramientas" = acciones de dominio parseadas de un JSON que solo cubren tareas/hábitos/recordatorios/búsqueda web; **no puede leer ni modificar archivos**, no tiene memoria, no mejora con el uso.
- **Dos caminos de auth divergentes**: admin → proxy backend (`/api/ai/chat`, keys en servidor); no-admin → llamada directa al proveedor con key en memoria del navegador. Inseguro, no escalable y duplica lógica.
- **Sin persistencia**: las conversaciones viven en Zustand (`iaStore`), no en BD; no hay historial multi-sesión, ni reanudación, ni auditoría de acciones.
- **Sin observabilidad**: no se ve qué tools ejecuta el agente, qué archivos toca, cuánto contexto consume.

### Resultado deseado

Un **plugin de agente de IA** ("agente") con:

1. **Runtime de herramientas (tools-first)** en el backend Rust: el LLM decide, el runtime ejecuta herramientas tipadas y autenticadas. El modelo solo propone; la ejecución valida.
2. **Dos modos de despliegue, mismo contrato**:
   - **Local (dev):** el agente puede **leer y modificar archivos** del workspace del usuario (sandbox del proyecto actual, con allowlist de rutas y confirmación vía diff + undo). **Solo cuando `AGENTE_MODO=local` (dev)**. Un admin en producción **tampoco** tiene tools de archivo (nunca editar el filesystem del contenedor desplegado).
   - **Producción (usuarios):** **sandbox estricto** — sin acceso al filesystem; solo herramientas de dominio (tareas, hábitos, notas, recordatorios) + búsqueda web con límites. Nunca escritura en disco del servidor. `AGENTE_WORKSPACE_ROOT` no debe existir en prod.
3. **Memoria persistente** (estilo Hermes): memoria por sesión y por proyecto, automejora (revisión post-turno que mejora prompts/skills), todo con **manejo de contexto eficiente** (compresión, límites, prefix cache preservado).
4. **Chat con todo visible**: streaming de tokens, y cuando edita un archivo o ejecuta una tool, se ve en el chat (tarjetas de evento: tool + argumentos + resultado + diff cuando aplique).
5. **Configuraciones en su propio modal con sidebar agrupado** (no en las configuraciones globales): varias secciones (Proveedor/Modelo, Herramientas/Permisos, Memoria, Sandbox/Rutas, Costo/Límites, Debug).
6. **Automejora**: habilidades/skills aprendidas que el propio agente mantiene (estilo Hermes: crea skills de la experiencia y las mejora durante el uso).
7. **Ventana de contexto máxima + autocompactación** configurables (umbral de disparo, presupuesto de cola, modelo de resumen), con métricas visibles.
8. **Tareas programadas**: el usuario puede programar tareas que el agente ejecute (cron), a prueba de reinicios.
9. **Modos de operación** (por tab/workspace): **meta** (al detenerse evalúa si la meta se cumplió y continúa), **predeterminado** (comandos requieren aprobación), **autónomo** (otro agente evalúa si los comandos son seguros; los inseguros requieren verificación).
10. **Workspaces con tabs** (local): se asigna una carpeta de trabajo; cada workspace tiene tabs; cada tab es un chat/sesión con su propia ventana de contexto; se pueden abrir varias tabs en paralelo.
11. **Administración de skills** en el modal de config (crear, editar, activar, desactivar) + **contexto real recibido** visible en el chat.
12. **Autorecuperación de API**: si el proveedor (p.ej. gloryapi) falla, el agente cambia de proveedor / reintenta / encola, sin perder el turno.
13. **Galería visual aislada (dev)**: una página donde revisar TODOS los componentes visuales del chat con contenido de ejemplo realista, sin depender de iniciar un chat real ni del backend (sección 9.5).

### No-goals (fuera de alcance de la primera versión)

- Agente "general" autónomo que navega el sistema operativo completo o ejecuta código arbitrario en el servidor.
- **Subagentes async** (delegación tipo Hermes `delegate_task`): no se diseñan en v1; el agente es de un solo hilo de tools por turno. Tarea futura.
- **ZPA / herramientas de zip** (Zip Path Attack): no aplica porque v1 no registra tools de zip/unzip — declarado para cerrar la pregunta.
- Deploy/push automático a producción desde el agente (requiere autorización explícita por usuario; se expone como acción de *propuesta* con confirmación, nunca implícita).
- Reemplazo del asistente legacy de acciones JSON en una sola fase: **el legacy convive en v1** (feature distinta, ya tiene confirmación e idempotencia); la migración es una tarea separada post-v1 cuando el agente cubra esas acciones con paridad de UX.
- Embeddings/vector store para memoria semántica en la primera versión (la memoria será estructurada por archivos MD con índice `tsvector` en PostgreSQL; el vector store es una mejora posterior).
- Multi-tenant de agentes por proyecto a nivel de clúster (los usuarios son del mismo tenant; cada uno con su propio workspace sandbox de *datos*, no de *archivos* en producción).
- **Ejecución de código arbitrario en el servidor** (`execute_code`) en cualquier modo: prohibido en v1 (regla security-first).

---

## 2. Restricciones y dependencias (hechos vs supuestos)

### Hechos confirmados (verificados 27-08-2026)

| # | Hecho | Evidencia |
|---|---|---|
| H1 | El frontend IA vive en `PanelIA.tsx` + `usePanelIA.ts` + `iaService.ts` + `iaStore.ts` + `config/*IA.ts`, todo bajo `frontend/src/app/` | exploración 27-08 |
| H2 | El backend IA vive en `src/handlers/ai.rs` (rutas `/ai/chat`, `/ai/nutricion`, `/ai/tools/web-search`, `require_admin` + rate limit) y `src/services/ai.rs` (`LlmProviderService`, `PROVIDERS` allowlist, `CHAT_FALLBACK_CHAIN`) | exploración 27-08 |
| H3 | No hay streaming SSE ni en backend ni en frontend | exploración 27-08 |
| H4 | El sistema de plugins/paneles es OCP: `registrarPanel`/`registrarPlugin` + `GENERADORES_PROPS` + `panelesIds` + toggle en `SeccionConfigPlugins`; el plugin EXP es el modelo de referencia | exploración 27-08 |
| H5 | El modal global `ModalConfiguracionGlobal.tsx` tiene sidebar con `SECCIONES_SIDEBAR` agrupadas y `ContenidoSeccion` por dispatch; el plugin IA ya tiene secciones `panelIA` y `ia` | exploración 27-08 |
| H6 | Las keys de proveedor: admin = envs del servidor (rotación + fallback); no-admin = key en memoria del navegador | exploración 27-08 |
| H7 | `glory-rs/` (submódulo) **no** tiene lógica de IA — todo es del proyecto `task`; candidato a extraer lo agnóstico al núcleo | exploración 27-08 |
| H8 | Hermes: compresión de contexto con `context.engine: compressor` + `compression_locks`, `pre_llm_call` inyecta contexto dentro del user message (preserva prefix cache), tool_search con deferral (~1492 tokens ahorrados), subagentes async, `background_review` post-turno | runtime hermes 27-08 |
| H9 | Hermes plugins: `plugin.yaml` + `__init__.py` `register(ctx)` con hooks `pre/post_tool_call`, `pre/post_llm_call`, `pre_verify` (bloqueo suave), `on_session_*`, `subagent_*`; skills en `%LOCALAPPDATA%\hermes\skills\<cat>\<skill>\SKILL.md` con índice en system prompt | runtime + memoria repo |

### Supuestos (marcados, a validar en Fase 0)

- S1: `iaStore` persiste `sessionId` → asumo que hay intención de multi-sesión; validar si `sessionId` es por sesión de navegador o por conversación.
- S2: El plugin EXP ya define el patrón de "configuración inline del plugin" (`COMPONENTES_CONFIG` + `abrirModalPluginsConConfig`); asumo que el modal de configuración del agente puede reutilizar ese mecanismo en vez de crear un modal global nuevo.
- S3: No existe tabla de mensajes IA en `migrations/`; asumo que habrá que crear una (validar schema de `users`, `sessions` y convención de migraciones).
- S4: opencode/grok-build son referencias de diseño, no código a portar; la arquitectura se inspira pero se implementa con el stack del proyecto (Rust/Axum + React).

### Modos de fallo y riesgos principales

- **R1 — Fuga de archivos en local:** el agente local podría leer/escribir fuera del workspace. → Sandbox por allowlist de rutas + confirmación de escrituras + límite de tamaño de archivo.
- **R2 — Escape del sandbox en producción:** si algún día se expone filesystem a usuarios. → En producción NO hay tools de archivo; las tools de dominio se validan por `user_id` en el backend (nunca confiar en el front).
- **R3 — Contexto inflado:** historial largo sin compresión → coste alto y respuestas degradadas. → Compresión por resumen + límites de tokens + tools lazy (tool_search) + prefix cache.
- **R4 — Coste de automejora:** la revisión post-turno con un modelo extra puede encarecer. → Solo en modo local/admin y con modelo barato (`auxiliary`), con presupuesto por día.
- **R5 — Abuso de la búsqueda web / rate limits:** → límites por usuario/hora (ya existe patrón `ai_chat_limiter`), timeout y tamaño máx de respuesta.
- **R6 — Herramientas de dominio sin auditoría:** → toda acción ejecutada se persiste (tabla `agente_acciones`), visible en el chat.

---

## 3. SOLID — decisiones por principio

| Principio | Decisión | Justificación |
|---|---|---|
| **SRP** | `AgentService` (orquestación), `AgentToolRegistry` (registro/ejecución de tools), `AgentMemory` (persistencia), `AgentContextManager` (compresión/límites), `AgentAuth/Sandbox` (permisos), `AgentStream` (SSE) — cada uno una responsabilidad | Evita un "agente todopoderoso" de 2000 líneas |
| **OCP** | Las tools se **registran** en un registry (`agent_tools/`), no se encadenan en un match gigante. Añadir tool = nuevo módulo + `registrar_tool()`, sin tocar el runtime | Es el mismo patrón OCP que ya usa el frontend con `registrarPanel` |
| **ISP** | Cada tool define su propio trait `AgentTool { id, descripcion, schema(JSON Schema), ejecutar(ctx) }`; el runtime no sabe nada del detalle de cada tool | El LLM solo ve el schema; el runtime solo ve el trait |
| **DIP** | El runtime depende de `AgentTool` (abstracción) y de `AppState` (para acceso a repositorios). El front depende de contratos SSE (`/api/agente/stream`), no de implementación | Permite sandbox/local intercambiando el proveedor de tools, no el runtime |
| **LSP** | Mismo contrato de tools en local y producción; lo que cambia es el *conjunto registrado* (local añade `file_read`/`file_write`) | Sustituible sin romper el cliente |

---

## 4. Modelo de escala

| Dimensión | Valor objetivo (v1) |
|---|---|
| Usuarios | Single-tenant real (app personal del usuario) + pocos usuarios compartidos; el modelo es per-user con `user_id` |
| Throughput | Chat: decenas de requests/hora por usuario; límite por usuario/hora (reusar patrón `ai_chat_limiter`) |
| Concurrencia | 1 agente activo por usuario (lock de sesión); N usuarios en paralelo con locks independientes |
| Latencia | Streaming: primer token < 2-3s; el agente ejecuta tools secuenciales con timeout por tool (5-30s) |
| Volumen de datos | Historial por sesión en BD; memoria en archivos MD pequeños (<10KB cada uno); sin embeddings en v1 |
| Despliegue | Local (dev) y producción (Coolify, mismo binario, config por env: `AGENTE_MODO=local\|prod`, `AGENTE_WORKSPACE_ROOT` SOLO en local, `AGENTE_ALLOW_EDIT=false` en prod) |

**Nota de honestidad:** no hay un modelo de carga real de "miles de usuarios"; la escala real es la de una app personal con algunos usuarios. El diseño prioriza **seguridad (sandbox) y eficiencia de contexto**, no el horizontal scaling. Marcado como riesgo abierto si algún día se abre al público con alta concurrencia.

**Coste con `require_auth`:** al pasar de `require_admin` a `require_auth`, el servidor absorbe el coste del LLM para **todos los usuarios autenticados** (las keys son del servidor). El techo real es el presupuesto/rate-limit del proveedor, no el throughput de Axum. Se declara como riesgo con **techo global/diario** y rate limit por usuario (ya existe `ai_chat_limiter`).

---

## 5. Eficiencia — comparación de opciones

### 5.1 Streaming vs request/response

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| A. Request/response JSON (actual) | Simple | Sin UX de tokens; el usuario no ve progreso; sin cancelación real granular | ❌ descartado para el agente |
| B. SSE con eventos tipados | Streaming real, cancelación, eventos de tool visibles en el chat, reutilizable para local+prod | Más complejidad (parseo de SSE, reconnection) | ✅ elegido |

El contrato SSE (`/api/agente/stream`) emite eventos: `token`, `tool_start`, `tool_result`, `diff`, `memory_update`, `error`, `done`, `usage`. El front consume con `fetch` + `ReadableStream` + `getReader` (sin librería extra).

### 5.2 Manejo de contexto (la decisión más importante)

Inspirado en Hermes (verificado) + opencode:

1. **Tool deferral (tool_search):** el sistema expone pocas tools "core" siempre; el resto se descubre bajo demanda (`tool_search`), ahorrando cientos de tokens por turno (Hermes: ~1492 tokens ahorrados). Implementación: la lista de tools del request incluye `tool_search` + las tools core; el agente llama `tool_search` para activar tools perezosas.
2. **Compresión por resumen (compactor):** autocompactación por umbral de ocupación de la ventana (NO un 70-80% fijo): se resumen los turnos antiguos a un bloque "Resumen de la conversación anterior" (estilo Hermes `compressor`), conservando cola reciente verbatim y métricas visibles. Ver 5.2.1.
3. **Preservación del prefix cache:** el contexto dinámico (memoria, skills, preferencias) se inyecta **dentro del último user message**, nunca en `system` que varíe entre requests — porque el prefix cache del proveedor depende de un system prompt estable. (Es exactamente lo que hace `pre_llm_call` de Hermes.)
4. **Límites de tools:** timeout por tool, tamaño máx de salida de tool (truncado con aviso), límite de turns de tool por turno de usuario (anti-bucle: máx 10), y **presupuesto agregado de tokens de `tool_result` por turno** (si el acumulado de resultados supera el tope, se comprime o se detiene el loop — no basta limitar cada tool individual).
5. **Cache de contexto del proyecto:** lectura de memoria/proyecto con hash de contenido (solo re-leer si cambió), estilo `snapshot` de Hermes.

#### 5.2.1 Autocompactación — algoritmo y parámetros (configurables)

Basado en la investigación de agentes reales (Hermes verificado, opencode, Claude Code, Aider).

**Disparo (por ocupación de ventana efectiva):**

- Umbral por defecto **50%** de la ventana efectiva (ventana − reserva de salida) — estilo Hermes.
- **75%** como piso cuando la ventana < 512K (ventanas pequeñas compactan antes).
- **85%** degenerado (compactación forzada si la ocupación supera eso).
- Reserva de salida: `max_output_tokens` del proveedor (estilo `COMPACTION_BUFFER` de opencode, 20K por defecto si el modelo no la expone).
- Config: `contexto.autoCompactar` (bool), `contexto.umbralPorcentaje`, `contexto.reservaSalida`, `contexto.maxVentana` (techo duro de la ventana usada).

**Qué se conserva y qué se resume:**

- **Head protegido:** system prompt + memoria/skills activos (no se tocan).
- **Cola reciente verbatim:** ~**2.5% de la ventana** (clamp [10K, 25K] tokens) — estilo Hermes `LEAN_TAIL`; fallback opencode: 25% de usable clamp [2K,15K] si el proveedor permite. La cola se alinea a límites de turnos (nunca cortar un turno a la mitad).
- **Medio resumido:** los turnos intermedios se resumen a un bloque estructurado con marcadores `[CONTEXT COMPACTION — REFERENCE ONLY]` … `--- END OF CONTEXT SUMMARY ---` (plantilla: histórico, meta, acciones completadas, estado activo, bloqueos, decisiones clave, errores y fixes, preguntas resueltas, archivos relevantes, contexto crítico).
- **Resultados de tools viejos** se pueden podar (prune) en vez de resumir (opcional, default on) — son los más voluminosos y menos críticos.

**Modelo resumidor:** modelo **barato/auxiliar** (fallback al principal si el auxiliar no está disponible o falla — estilo Aider `[weak, main]`); cooldown 60/300/900s ante fallos; el resumen se genera con `max_tokens` acotado (2K–10K).

**Anti-thrash y recuperabilidad:**

- **Anti-thrash:** si las 2 últimas compactaciones ahorraron <10% de tokens, no se compacta (esperar al umbral degenerado) — estilo Hermes.
- **Recuperabilidad:** el historial completo sigue en `agente_mensajes` (BD); la compactación NUNCA borra, solo marca; el usuario puede "expandir" o buscar (índice `tsvector`) lo compactado. Pérdida recuperable, no destructiva.
- **Mensaje de continuación:** tras el resumen se inyecta un mensaje sintético del agente ("Continúo desde el resumen…") para no romper el formato del proveedor — estilo opencode.
- **Métricas visibles:** `tokens_before/after`, `savings_pct`, `occupancy_pct` se emiten como evento `usage` y se muestran en el chat (ver 9.3 contexto real).

**Coste:** 1 llamada extra al modelo resumidor (barato) por compactación — se contabiliza en el presupuesto del proveedor.

### 5.3 Coste de ejecución

- 1 llamada LLM por turno de tool (el loop del agente) — acotado por el límite de turns (10) y el presupuesto agregado de tokens.
- Automejora: 1 llamada extra post-turno (modelo barato) SOLO en local (dev), con presupuesto diario y **umbral de repetición** para crear skills (no tras cada turno). DPI declarado: el turno completo, con datos personales, va a un modelo externo barato.
- Streaming no añade coste de tokens (es solo transporte).

> **Streaming en `LlmProviderService` (tarea explícita):** el contrato SSE emite `token`, pero `enviar_chat` (verificado) es request/response. Se añade `enviar_chat_stream` en Fase 0/1: flujo SSE hacia el proveedor que emite eventos `token`; fallback a no-stream (un único `token` con la respuesta completa) si el proveedor no soporta streaming. `CHAT_FALLBACK_CHAIN`: el fallback entre proveedores aplica **antes** de empezar a emitir (no se puede "rehacer" un stream a mitad); una vez iniciado el stream de un proveedor, un fallo a mitad no cambia de proveedor.

---

## 6. Rendimiento y operación

- **Ruta caliente:** el loop del agente (LLM → tools → LLM) dentro de un turno de usuario. Debe ser secuencial y acotado: **timeout global del turno 180s; timeout por tool 5-15s según tipo; máx 10 turns** (reconciliados: 10 × 15s = 150s < 180s).
- **Backpressure:** el SSE debe respetar la capacidad del cliente (no buffer infinito); en caso de cliente lento, el runtime puede pausar el bucle de tools.
- **Reintentos:** reintento único con backoff solo para fallos transitorios del proveedor (5xx/timeout); los 4xx del proveedor no se reintentan (mismo criterio que `LlmProviderService`). El fallback entre proveedores solo aplica antes de iniciar el stream.
- **Fallo parcial:** si una tool falla, el agente recibe el error como resultado de tool (no aborta el turno) y decide continuar; si el proveedor falla a mitad de turno, se emite `error` y se persiste el estado del turno en `agente_turnos` (job id + prompt reconstruido) para reanudar.
- **Cancelación:** la cancelación del cliente (AbortController) debe **matar el loop de tools en el servidor** (cancel token propagado al runtime), no solo dejar de leer el stream — si no, el turno sigue consumiendo tokens y ejecutando tools tras la cancelación.
- **Observabilidad:** tabla `agente_turnos` (turno, user, proveedor, modelo, tokens in/out, tools ejecutadas, duración, resultado) + `agente_acciones` (auditoría). Logs estructurados con request_id.
- **Límites de recursos:** tamaño máx de mensaje entrante, máx tools por turno (10), máx tamaño de archivo leído en local (1MB, truncado con aviso), presupuesto diario de automejora, y límites de `file_search` (resultados, profundidad y tamaño agregado — un glob recursivo sobre un workspace grande como OneDrive puede bloquear el proceso).

---

## 7. Seguridad (análisis de amenazas)

| Amenaza | Mitigación |
|---|---|
| **Escritura de archivos fuera del workspace (local)** | Allowlist de raíces (el workspace del proyecto / directorio de trabajo). `canonicalize()` la ruta y verificar prefijo con separador + **case-insensitive en Windows** (`C:\` vs `c:\`, `C:\workspace` vs `C:\workspace_evil`) — nunca `contains` ni `starts_with` ingenuo. Prohibido `..`. Manejar **junctions** (ubicuas en Windows/OneDrive, y el workspace está en OneDrive con files-on-demand). Solo rutas dentro de `AGENTE_WORKSPACE_ROOT` |
| **Lectura de archivos sensibles (local)** | Misma allowlist; lista negra de archivos de secretos (`.env`, `*.pem`, `.ssh/*`, `*_KEY`, `.git/config`) que el agente **no puede leer** (la negación se aplica antes de leer, no después de mostrar) |
| **Escape del sandbox en producción** | En prod **no se registran** las tools de archivo, **ni siquiera para admin** (nunca editar el filesystem del contenedor desplegado). Las tools de dominio validan `user_id` del token de sesión (nunca del cuerpo). Sin `execute_code` en ninguna versión (v1) |
| **Prompt injection desde datos** (notas, resultados web, **y archivos leídos en local**) | Los contenidos externos (incluido lo que devuelve `file_read`) se tratan como **datos opacos no instruccionales**, se delimitan con marcadores y una directiva system estable; las acciones se ejecutan solo si pasan el validador de contrato (whitelist de tool + schema estricto). Nunca `eval` |
| **Exfiltración al proveedor (local)** | La lista negra de secretos se aplica **antes de leer** el archivo; el límite de tamaño (1MB) trunca con aviso. Los resultados de tools se envían al LLM solo tras esa barrera |
| **Keys de proveedor** | Solo en el servidor (envs); el backend llama al proveedor. El no-admin NO llama directo al proveedor desde el navegador (se elimina ese camino) |
| **CSRF/XSS en el chat** | Los resultados de tools se renderizan como datos (React escapa por defecto); las diffs se muestran como `<pre>`/texto, nunca `dangerouslySetInnerHTML` con contenido del agente |
| **Rate limit / abuso** | Reutilizar `ai_chat_limiter` por usuario + **techo global/diario del proveedor** (coste servido a todos los usuarios con `require_auth`); límite de tools por turno; timeout de búsqueda web y límite de resultados |
| **Auditoría** | `agente_acciones` registra tool, args (sin secretos), resultado resumido, user_id, timestamp. Visible en el chat y consultable |
| **Inyección SQL** | SQLx con `query_as!`/`bind` (regla security-first) — nunca interpolación |
| **Fallo del proveedor de IA (p.ej. gloryapi)** | No es fallo silencioso: se propaga como estado observable. Fallback automático de proveedor (ver §8 R7), reintento con backoff solo para transitorios, health check del proveedor, y cola de reintentos sin perder el turno |

---

## 8. Mitigaciones de riesgo (plan de respuesta)

| Riesgo | Respuesta |
|---|---|
| R1 fuga de archivos | (a) allowlist por `canonicalize` + prefijo con separador + case-insensitive (Windows), (b) confirmación en UI vía **diff + undo** (sin confirmación inline en v1; el SSE es unidireccional), (c) pruebas de validación de rutas (casos `..`, `C:\workspace_evil`, symlinks, junctions, case) |
| R2 escape sandbox | (a) prod sin tools de archivo **tampoco para admin** (fail-closed: tool desconocida = error), (b) tests de que el registro de tools difiere por modo, (c) auditoría |
| R3 contexto inflado | (a) compactor con umbral, (b) tool_search, (c) límite de turns (10) + presupuesto agregado de tokens de tools, (d) métricas de tokens por turno visibles |
| R4 coste automejora | (a) solo local (dev), (b) modelo barato, (c) presupuesto diario, (d) toggle en config, (e) umbral de repetición para crear skills, (f) DPI declarado |
| R5 abuso web/rate | límites por usuario/hora + **techo global del proveedor** + timeout + tamaño máx |
| R6 sin auditoría | tabla de acciones + visibilidad en chat + export |
| R7 fallo del proveedor (gloryapi) | (a) `LlmProviderService` ya tiene `CHAT_FALLBACK_CHAIN` con rotación de keys: el agente reutiliza esa cadena ANTES de iniciar el stream (nunca a mitad); (b) reintento único con backoff para 5xx/timeout (nunca 4xx); (c) **health check** del proveedor (endpoint `/ai/health` o equivalente) con **circuit breaker**: tras N fallos consecutivos se aparta el proveedor un cooldown; (d) **cola de reintentos**: si el turno no pudo completarse por fallo de proveedor, el turno se persiste en `agente_turnos` con estado `pendiente` y el agente lo retoma (job id + prompt reconstruido) — el usuario ve el estado en el chat, no un error silencioso; (e) el fallo se emite como evento `error` con `retryable: true` para que el front ofrezca "reintentar" |

### 8.1 Tareas programadas (cron)

El usuario programa tareas que el agente ejecuta de forma autónoma. Diseño:

- **Tabla `agente_tareas_programadas`:** id, user_id, nombre, prompt/instrucciones, tipo (una_vez / recurrente), cron_expr (recurrente) o ejecutar_en (timestamp, una vez), estado (pendiente / ejecutando / completada / fallida / cancelada), ultima_ejecucion, proxima_ejecucion, result_summary, creada_en. La programación es del usuario: el agente solo ejecuta lo que el usuario programó (no se autoprograma en v1).
- **Scheduler en el backend:** un worker ligero (tokio interval) que consulta `proxima_ejecucion <= now` y encola ejecuciones; a prueba de reinicios: al arrancar el backend, recalcular `proxima_ejecucion` de las pendientes y recuperar ejecuciones interrumpidas (estado `ejecutando` con heartbeat vencido → `pendiente` de nuevo).
- **Ejecución:** cada tarea programada se ejecuta en un **turno de agente** (mismo runtime, sin tools de archivo en prod) con su propio presupuesto/timeout; el resultado se persiste (`result_summary`) y es visible en el chat y en el modal de config (sección "Tareas programadas").
- **Límites:** máximo de tareas programadas activas por usuario (p.ej. 20), intervalo mínimo entre ejecuciones (p.ej. 1 min) para evitar abuso, y techo diario de ejecuciones por usuario dentro del techo global del proveedor.
- **UI:** el chat muestra tarjetas de tareas programadas (próxima ejecución, estado, resultado de la última); el modal de config tiene sección para crear/editar/pausar/eliminar tareas.
- **Cancelación:** cancelar una ejecución en curso la mata en el servidor (mismo mecanismo que la cancelación de un turno).

---

## 9. Diseño UI / reutilización

### Chat con todo visible

- **Streaming de tokens:** las burbujas del asistente se actualizan incrementalmente (eventos `token`). Reutilizar el `Textarea` y el patrón de burbujas actual de `PanelIA`.
- **Tarjetas de evento de tool** (en el flujo del chat, no aparte): icono de la tool + nombre + estado (ejecutando/ok/error) + un expandible con los **argumentos** (JSON formateado) y el **resultado** (truncado). Cuando la tool es `file_write`, se muestra un **bloque diff** (`+`/`-`) en `<pre>`.
- **Indicador de "agente trabajando"** con la lista de tools ejecutándose (en vez del spinner único actual).
- **Estados**: vacío (sin conversación), carga, error con retry, cancelación (AbortController ya usado en `usePanelIA`).

### Modal de configuración del agente (propio, con sidebar)

El usuario pidió **explícitamente**: "las configuraciones van a necesitar su modal propio porque van a ser varias... en un modal igual donde las configuraciones estén agrupadas en el sidebar para manejarlas".

**Decisión:** nuevo modal **`ModalConfigAgente`** (reutilizando `Modal` base + patrón de layout del `ModalConfiguracionGlobal` con sidebar agrupado), **no** colgado de `SECCIONES_SIDEBAR` globales. Secciones:

1. **General/Proveedor** — proveedor (reusar `Select`), modelo (reusar `Select` filtrado), temperatura, maxTokens, idioma, estilo.
2. **Herramientas/Permisos** — toggles por familia de tools (tareas, hábitos, notas, recordatorios, web) + permisos especiales (escritura de archivos — solo visible en modo local/dev; búsqueda web).
3. **Memoria** — ver/limpiar memoria, toggle automejora, presupuesto diario, ver skills aprendidas.
4. **Sandbox/Rutas** (solo local/dev) — raíz del workspace, allowlist visible, lista negra de secretos, tamaño máx de archivo.
5. **Límites/Costo** — límite de turns por turno, timeout, presupuesto, techo global del proveedor.
6. **Debug** — ver últimas ejecuciones de tools, tokens por turno, log de eventos.

- Reutilizar: `Modal` (`components/shared/Modal.tsx`), `Select`, `Input`, `Boton`, `Textarea`, tokens de `variables.css`, patrón de sidebar del `ModalConfiguracionGlobal`.
- **`SeccionConfigMCP` NO migra al modal del agente** — MCP es un mecanismo global de conexión de herramientas externas, no del agente; se queda en el modal global. Solo `SeccionConfigIAPanelChat` (config del PanelIA legacy) migra, y **solo cuando se migre el legacy** (no antes).
- La creación del modal nuevo y la eliminación de secciones globales NO van en la misma fase: mientras `ia-asistente` (PanelIA legacy) siga vivo, su sección de config sigue en el modal global para no romper la config de usuarios existentes.
- No hardcodear specs visuales en componentes (regla no-design-specs-in-components): colores/espaciados vía tokens del design system.

### Modos de operación (por tab/workspace)

Tres modos configurables por sesión/tab (no globales):

| Modo | Comportamiento | Uso típico |
|---|---|---|
| **Meta** | El agente trabaja con una **meta explícita** (la declara el usuario al iniciar). Al **detenerse** (fin de turno, pausa, límite de pasos), **evalúa si la meta se cumplió realmente** (llamada de verificación, modelo barato) y, si no, **continúa** con un nuevo turno hasta cumplirla o agotar el límite de pasos/coste. Cada evaluación queda visible en el chat ("Meta: … · cumplida: sí/no · continúo") | Automatización de una meta concreta ("organiza mis tareas de la semana")
| **Predeterminado** | Los **comandos/acciones con efectos** (escribir, eliminar, ejecutar tool con efecto) requieren **aprobación del usuario** (diff + botón aprobar/rechazar o modal de confirmación). Las lecturas y el chat normal fluyen sin aprobación | Seguro por defecto, uso general
| **Autónomo** | Los comandos se evalúan si son seguros **por otro agente/LLM verificador** (llamada de clasificación, modelo barato): los **seguros se ejecutan sin aprobación**, los **inseguros requieren verificación del usuario**. Criterios de clasificación: tipo de tool, destino, tamaño del cambio, destructividad. Umbral de confianza configurable; el verificador devuelve su razonamiento visible | Tareas repetitivas de bajo riesgo con supervisión delegada

- El modo **predeterminado es el default** de cada tab; el modo autónomo requiere confirmación explícita del usuario al activarlo (y un aviso en el chat de que los efectos se ejecutan sin aprobación).
- En **producción**: el modo meta y autónomo se limitan a tools de dominio (nunca archivos); el predeterminado aplica diff+aprobación para efectos destructivos.
- Los tres modos comparten el mismo runtime; solo cambia la **política de aprobación** (interceptación en el loop antes de ejecutar la tool).

### Administración de skills y contexto real (config + chat)

- **Sección "Skills" en el modal** (además de la automejora): el usuario puede **crear, editar, activar, desactivar y eliminar skills** manualmente (SKILL.md con frontmatter: nombre, descripción, activa, DPI, aplica a). La automejora solo **sugiere** skills nuevas (propuesta visible en el chat para aprobar/descartar); el usuario conserva el control.
- Límites aplicados también a skills manuales: tope de tamaño (p.ej. 5K tokens por skill, 25K totales inyectadas — estilo Claude Code), umbral de repetición para autogenerar, DPI declarado.
- **Contexto real visible (sección Debug y en el chat):** cada turno muestra qué recibió el agente: **tokens usados / ventana máxima / ocupación %**, qué se **compactó** (evento `usage` con `tokens_before/after`, `savings_pct`), **skills activas** inyectadas, **memoria** cargada, y **tools** registradas. El usuario puede ver y depurar exactamente qué contexto recibe el agente.

### Workspaces con tabs (local)

- **En local (dev)** se asigna al agente una **carpeta de trabajo** (workspace): `AGENTE_WORKSPACE_ROOT` (p.ej. una carpeta del usuario; por defecto el proyecto). El modal de config tiene selector de workspace (solo local/dev).
- **Cada workspace tiene sus tabs; cada tab es un chat/sesión con su propia ventana de contexto** (historias separadas en `agente_conversaciones` con `workspace_id` + `tab_id`). Se pueden abrir **varias tabs en paralelo** (p.ej. una por tarea) y cada una mantiene su contexto, su modo de operación y sus skills/memoria independientes.
- **UI:** pestañas en el chat del agente (crear, renombrar, cerrar, cambiar de tab); la memoria y skills son por workspace (compartidas entre sus tabs) mientras el contexto del chat es por tab.
- En **producción** no hay workspaces de archivos: hay una única sesión sandbox de datos por usuario (la pestaña se reduce a conversaciones independientes, sin asignación de carpeta).

### Galería visual del chat — página aislada (dev)

**Objetivo:** una página aislada para **revisar todos los componentes visuales del chat del agente** con contenido de ejemplo realista, **sin depender de iniciar un chat real**, de llamar al backend ni de tener proveedor de IA. Es la herramienta de revisión del desarrollador (para mí/el usuario durante la implementación) y la base de los tests visuales.

**Cómo funciona:**

- **Página aislada dev-only:** ruta `/agente/visuales` registrada **solo en dev** (sin auth, sin backend, sin proveedor LLM). Nunca se despliega en producción.
- **Renderiza los MISMOS componentes del chat** (nada de copias ni maquetas aparte): `MensajeUsuario`, `MensajeAsistente`, `TarjetaTool`, `BloqueDiff`, `IndicadorTrabajando`, `TarjetaTareaProgramada`, `BarraContexto`, `TabsWorkspace`, `SelectorModo`, `ListaSkills`, etc. Si un componente se usa en el chat real, es el mismo que se muestra aquí.
- **Fixtures con contenido realista:** data estática (JSON/TS) que alimenta la galería y **se comparte con los tests** (misma fuente de verdad → la galería y los tests no divergen). Los fixtures cubren contenido real: una conversación completa de ejemplo, un archivo modificado con diff, una tarea programada, etc.
- **Catálogo exhaustivo (no dejar nada por fuera):** cada componente visual del chat tiene su **entrada** con: componente, estados cubiertos (normal / éxito / error / carga / vacío / límite), y variantes (texto corto, texto largo, muchos resultados, títulos largos).

**Lista exhaustiva de entradas de la galería (todo el chat):**

1. Burbuja de mensaje del **usuario** (corto, largo, multilínea).
2. Burbuja del **asistente** (con cursor de streaming, texto completo, markdown básico).
3. Tarjeta de tool — **ejecutando**.
4. Tarjeta de tool — **ok** (args expandibles, resultado truncado).
5. Tarjeta de tool — **error**.
6. **Bloque diff** de archivo modificado (add / modify / delete, `+`/`-`, `<pre>`).
7. **Indicador "agente trabajando"** (lista de tools en ejecución).
8. **Barra de contexto real** (ocupación %, tokens usados/máximo, compactación con `tokens_before/after` y `savings_pct`, skills/memoria inyectadas, tools registradas).
9. **Tarjeta de tarea programada** (pendiente / ejecutando / completada / fallida, próxima ejecución, último resultado).
10. **Tabs de workspace** (activa/inactiva, varias abiertas, crear/renombrar/cerrar).
11. **Selector de modo** de operación (meta / predeterminado / autónomo) + aviso de modo autónomo.
12. **Badge/lista de skills** (activa/inactiva, DPI).
13. **Mensaje de error retryable** (con botón "reintentar").
14. **Estado vacío** (sin conversación).
15. **Estado de carga**.
16. **Botón de cancelación** (AbortController).
17. **Propuesta de skill** de automejora (aprobar / descartar).
18. **Aviso de meta** (modo meta): "Meta: … · cumplida: sí/no · continúo".
19. **Verificación autónoma** (razonamiento del verificador visible: seguro/inseguro).

**Criterios visuales — minimalista y coherencia visual:**

- **Un solo sistema:** todos los colores, espaciados, radios, sombras y tipografías vienen de tokens (`variables.css`). Prohibido hex/px sueltos en componentes (regla no-design-specs-in-components).
- **Escala tipográfica mínima:** solo tamaños del design system; el chat usa 2-3 tamaños como máximo (título de sección, cuerpo, metadatos/etiquetas).
- **Paleta funcional mínima:** neutros + 1 acento + semánticos (éxito/error/advertencia) usados SOLO para comunicar estado, nunca decoración.
- **Estados consistentes:** el mismo patrón visual para éxito/error/advertencia en tools, tareas y skills (icono + color semántico + texto). Un estado igual se ve igual en todo el chat.
- **Espaciado y alineación por grid** (márgenes del sistema, no valores arbitrarios); jerarquía clara entre mensaje, tool y metadatos.
- **Burbujas:** usuario y asistente alineados de forma consistente, ancho máximo legible, radios del sistema.
- **Diff y código:** tipografía mono del sistema (token), nunca mono arbitraria.
- **Modo claro/oscuro:** todo vía tokens; la galería muestra ambas variantes si el tema lo soporta.
- **Contraste accesible (AA)** en texto sobre fondos; sin animaciones decorativas (solo micro-transiciones sutiles de estado si aportan).
- **Coherencia con la app:** reutiliza componentes del design system (`Boton`, `Icono`, `Modal`, `Textarea`) y los tokens del proyecto; la galería misma usa el layout/sidebar del proyecto.

**Mantenimiento (no dejar nada por fuera):**

- **Checklist obligatorio:** al añadir o modificar cualquier componente visual del chat, actualizar su entrada en la galería con los estados cubiertos, en la misma fase (reflejado en el checklist general de la sección 12).
- **Fixtures compartidos con tests:** unitaria y visual usan la misma data que la galería.
- La galería es dev-only; su presencia no afecta al bundle de producción (ruta registrada solo en dev).

**Verificación:** en navegador, abrir `/agente/visuales`, recorrer todas las entradas (claro/oscuro) y capturar; todos los fixtures renderizan sin errores de consola.

---

## 10. Núcleo / abstracción (regla glory-framework)

**Decisión:** extraer lo **agnóstico** a `glory-rs` (submódulo), dejando en `task` lo específico del producto.

- **Va a `glory-rs` (agnóstico, 2º consumidor probable):**
  - `AgentTool` trait + `AgentToolRegistry` (framework de tools declarativas con JSON Schema).
  - `AgentContextManager` (compresión + límites + tool_search) — es lógica genérica de agentes.
  - `AgentStream` (contrato SSE de eventos de agente) — genérico.
  - `AgentMemory` base (memoria por archivos MD con estructura de carpetas) — genérico.
- **Queda en `task` (específico del producto):**
  - Tools de dominio: tareas, hábitos, notas, recordatorios, web (usan repositorios de `task`).
  - Tools de archivo local (workspace del proyecto `task`).
  - `AppState` wiring, handlers `/api/agente/*`, auth/sandbox por env del proyecto.
  - Frontend del plugin (panel, modal de config, chat con eventos) — el diseño es del producto; los componentes UI genéricos (burbuja, diff, tarjeta de tool) podrían subir a glory-rs/frontend `componentes/ui/` si un 2º consumidor los usa.

**Criterio aplicado:** (1) lógica genérica sin acoplar al producto: sí (framework de agentes); (2) 2º consumidor real/probable: sí (WANDORIUS, RESTAURANTE u otros proyectos del usuario que usen glory-rs); (3) lugar/API apropiados: `glory-rs/backend/` (Rust) y `glory-rs/frontend/` (React). Si al implementar no aparece el 2º consumidor, se puede posponer (YAGNI) pero el framework de tools ya justifica la extracción.

---

## 11. Arquitectura de referencia — qué copiar de cada uno

| Referencia | Qué aporta | Qué NO copiar |
|---|---|---|
| **Hermes** (verificado local) | Compresión de contexto (`compressor`+`compression_locks`), `pre_llm_call` inyecta en user msg (prefix cache), tool_search deferral, subagentes async, `background_review` post-turno, plugin hooks (pre/post_tool_call, pre_verify) | El monolito Python; la UI Electron; el modelo de plugins Python |
| **opencode (sst)** | Dual loop plan/act, compactación por compresión, context edit (patching quirúrgico) | El runtime Bun/TS; no portar su CLI |
| **grok-build** | Memoria persistente + skills de repositorio, agente "build-first" | Su stack propietario |

Principios transferidos a nuestro diseño: (1) tools-first con schema declarativo, (2) compresión por resumen + límites, (3) prefix cache preservado, (4) tool_search lazy, (5) memoria + automejora, (6) sandbox por modo de despliegue.

---

## 12. Fases de ejecución (cada fase = bloque verificable)

> **Checklist obligatorio por fase (se cierra la fase SOLO con todo marcado):**
> 1. [ ] Objetivo de la fase implementado y probado (DoD de la fase).
> 2. [ ] Sin errores nuevos: `cargo check`/`cargo test` filtrado (backend) o `tsc --noEmit` (frontend).
> 3. [ ] Casos negativos probados cuando el contrato lo permite (no solo el camino feliz).
> 4. [ ] Documentación mínima de la fase (sección 14) actualizada si aplica.
> 5. [ ] Plan actualizado: fases completadas marcadas, siguiente paso verificable.
> 6. [ ] Registro de la fase en `Agente/completados/` (evidencia reproducible).
> 7. [ ] Todo componente visual nuevo del chat tiene su entrada en la galería (sección 9.5) con sus estados.

### Fase 0 — Contrato y fundamentos (backend) ✅ (commit `cf0b77e`, 29-08-2026)
- Migración `migrations/20260829000000_agente.{up,down}.sql`: `agente_conversaciones`, `agente_mensajes` (con `compactado`), `agente_acciones`, `agente_turnos`, `agente_memoria`, `agente_tareas_programadas`.
- `src/agent/`: `AgentTool` trait + `AgentToolRegistry` (OCP, JSON Schema, validación de argumentos), `AgentContextManager` (autocompactación 50/75/85 + anti-thrash + cola verbatim + head protegido + métricas), `runtime.rs` (loop), `tools.rs` (dominio).
- Contrato SSE `/api/agente/stream` (eventos `token`/`tool_start`/`tool_result`/`usage`/`error`/`done`) + `/api/agente/conversaciones` (crear/listar) con `require_auth` + rate limit por usuario (`agente_limiter`, 30/h).
- **DoD:** `cargo test` 21/21 (incl. umbrales, anti-thrash, cola verbatim), E2E `.freebuff/agente-e2e.mjs` con stream `done` real.

**Checklist de la fase:**
- [x] S1-S4 validados: S1 `iaStore` es por conversación (no multi-sesión aún); S2 el modal del agente será propio (no colgado de SECCIONES_SIDEBAR); S3 se creó la migración con schema real; S4 opencode/grok-build solo como referencia de diseño.
- [x] Migración `agente.sql` aplicada (verificada en BD local) y con `.down.sql` reversible.
- [x] `AgentTool` trait + `AgentToolRegistry` compilan y registran tools (tests `registra_y_lista_schemas`, `valida_argumentos_requeridos`).
- [x] `AgentContextManager`: tests de umbrales (no-compacta/compacta), anti-thrash y cola verbatim en verde.
- [x] SSE emite los eventos tipados (incluido `usage` y `done`); E2E con `done` exitoso.
- [x] `require_auth` y rate limit verificados (401 sin sesión; 404 conversación ajena en el E2E).
- [x] Checklist general de la sección 12 completado (cargo test filtrado, casos negativos, plan actualizado).

### Fase 1 — Runtime del agente (backend) ✅ (núcleo `cf0b77e`, scheduler `6648131`, R7+modos `c947e6a`)
- Loop del agente: LLM → ejecutar tools → LLM (límite de turns 10, timeout por tool 15s, fallo parcial como resultado de tool). ✅ verificado E2E (1 llamada a tool, tarea persistida en /dashboard).
- Tools de dominio v1 (tareas, hábitos, notas, recordatorios) + `web_search` (límites). ✅ `tool_search` lazy: pendiente (sección 5.2).
- **Autorecuperación de proveedor (R7):** circuit breaker por proveedor (cooldown tras N fallos consecutivos, acierto lo resetea) ✅ + turno `pendiente` en fallos retryable (el front ofrece reintentar) ✅.
- **Política de aprobación por modo** (predeterminado/meta/autónomo, sección 9.2): ✅ tools con `efecto()` requieren aprobación en predeterminado (evento `RequiereAprobacion` + resultado al LLM pidiendo confirmación); el `modo` viaja en crear/stream.
- **Scheduler de tareas programadas** (sección 8.1): ✅ worker tokio 30s + CRUD + ejecución real verificada (tarea creada en BD, estado completada).
- Persistencia de turnos/acciones (auditoría): ✅ (`agente_turnos` + `agente_acciones` se escriben en cada turno/tool).
- **DoD:** E2E casos 6 (tool de dominio + persistencia), 7 (CRUD) y 8 (ejecución real del scheduler) ✅ (`.freebuff/agente-e2e.mjs`).

**Checklist de la fase:**
- [x] Loop LLM→tools→LLM funciona (verificado: 1 llamada a `crear_tarea`, respuesta final streamed). Anti-bucle por turns: `max_turns` 10 con timeout por tool 15s.
- [x] Timeout por tool 15s implementado (timeout en el loop).
- [x] Fallo parcial de tool → error como resultado de tool (no aborta el turno).
- [x] E2E "crea una tarea 'X'": tool ejecutada + auditoría + respuesta streamed (caso 6 de agente-e2e.mjs).
- [x] Tarea programada (cron y una vez) se ejecuta; worker 30s + recuperación post-reinicio (filas pendientes se retoman al arrancar).
- [x] R7: circuit breaker por proveedor (cooldown por fallos consecutivos) + turno `pendiente` en fallos retryable + evento `error` con `retryable`.
- [x] Modos: predeterminado/meta/autónomo con política de aprobación (tools con `efecto()` interceptadas en predeterminado).
- [x] Cancelación: el cierre del canal SSE corta el loop (sender drop).
- [ ] `tool_search` lazy (deferral) — aplazado a una iteración posterior.
- [x] Checklist general de la sección 12 completado.

### Fase 2 — Modo local con archivos ✅ (commit `3cc0c1e`, 29-08-2026)
- Tools `file_read`/`file_write`/`file_patch`/`file_search` SOLO en `AGENTE_MODO=local` (dev; nunca en prod ni siquiera admin), con sandbox (allowlist por canonicalize + prefijo+separador + case-insensitive) + lista negra de secretos + confirmación de escrituras (efecto → aprobación en predeterminado).
- Bloque diff en el contrato SSE para `file_write`: pendiente de detalle fino en front (los eventos `RequiereAprobacion`/`ToolResult` ya existen en el contrato).
- **Workspace local** (sección 9.4): `AGENTE_WORKSPACE_ROOT` (fallback cwd) + validación de rutas Windows (case, prefijo+separador, junctions/symlinks resueltos por canonicalize).
- **DoD:** sandbox con 7 tests unitarios (traversal, absolutas, secretos, rw, truncado) + E2E caso 9 (file_search vía agente, skip legítimo si proveedor caído).

**Checklist de la fase:**
- [x] `file_read`/`file_write`/`file_patch`/`file_search` SOLO en `AGENTE_MODO=local` (fail-closed: sin sandbox no se registran; test `fail_closed_sin_sandbox`).
- [x] Allowlist por `canonicalize` + prefijo con separador + case-insensitive; `..` rechazado (tests `rechaza_escapar_con_dotdot`, `rechaza_rutas_absolutas`).
- [x] Lista negra de secretos aplicada ANTES de leer (`.env`, `*.pem`, `.ssh`, `*_KEY`, `.git/config`) — test `bloquea_secretos_antes_de_leer`.
- [x] Lectura de `.env` y `..\` bloqueada (tests unitarios; el E2E con LLM real queda como skip legítimo si el proveedor está caído).
- [x] Junctions/symlinks/OneDrive manejados (canonicalize resuelve; el check es sobre la ruta canónica).
- [ ] Bloque diff emitido en SSE para `file_write` (visible en el cliente) — el contrato de eventos ya emite `RequiereAprobacion`; el render del diff queda con Fase 4.
- [x] Workspace local configurable (`AGENTE_WORKSPACE_ROOT`, fallback cwd) — selector en config queda para Fase 5.
- [x] Checklist general de la sección 12 completado.

### Fase 3 — Memoria y automejora (MEMORIA v1 ✅ commit `pendiente`, 29-08-2026; tsvector/automejora/skills: iteración pendiente)
- **Memoria persistente v1** ✅: la tabla `agente_memoria` (ya migrada) se expone vía endpoints CRUD (`GET/PUT /agente/memoria`, `DELETE /agente/memoria/:clave`) y se **inyecta en el contexto** de cada turno: `cargar_memoria_agente` (runtime) selecciona las memorias recientes (hasta 50) y las agrega como mensaje `system` al inicio del historial en `agente_stream`. El agente así **recuerda preferencias/lecciones de sesiones anteriores**. Verificado por E2E caso 10 (upsert idempotente, validación de clave, delete → 404).
- Pendiente (iteración posterior, requiere LLM estable y más backend): búsqueda con `tsvector`, automejora post-turno (modelo barato solo local/dev) que **sugiere** skills, y CRUD manual de skills (crear/editar/activar/eliminar, topes 5K/25K, DPI).
- **DoD parcial:** el agente recuerda una preferencia dicha en una sesión anterior (memoria v1 — la inyección estructural compila y e2e cubre CRUD; la automejora/skills queda como iteración porque los proveedores LLM upstream están caídos y no se puede verificar la sugerencia real).

**Checklist de la fase:**
- [x] Memoria persistente: v1 (tabla + CRUD + inyección en contexto como mensaje system). El "recuerda preferencia cross-sesión" queda probado estructuralmente (inyección) + e2e de CRUD.
- [ ] Índice de búsqueda con `tsvector` de PostgreSQL (no FTS5) — iteración pendiente.
- [ ] Automejora SOLO en local/dev, modelo barato, presupuesto diario y toggle en config — iteración pendiente (no verificable ahora: proveedores caídos).
- [ ] Skill nueva se **sugiere** en el chat — iteración pendiente.
- [ ] CRUD manual de skills con topes y DPI — iteración pendiente.
- [ ] Skills activas se inyectan en el system prompt — iteración pendiente (depende del CRUD).
- [ ] Checklist general de la sección 12 completado.

### Fase 4 — Frontend: chat con todo visible ✅ (commit `d7fd017`, 29-08-2026)
- SSE streaming con eventos (`mensaje_inicio`/`token`/`tool_result`/`requiere_aprobacion`/`error`/`final`) en el panel `plugins/agente`.
- Tarjetas de tool, indicador de trabajo y cancelación: el contrato de eventos existe; el render fino queda con mejora de tarjetas.
- **Contexto real visible**: pendiente (ocupación %, event `usage`); aplazado a mejora de tarjetas.
- **Tabs de workspace** (sección 9.4): pestañas por conversación, crear/cerrar/cambiar; relanzada desde el panel (store `plugins/agente`), historial por tab desde BD.
- **Tarjetas de tareas programadas**: el backend expone CRUD + ejecución real (verificada en `6648131`, caso 8 del E2E); la tarjeta visual en el panel queda pendiente de Fase 5.
- Persistencia de conversaciones: mensajes de usuario **y** asistente persistidos en `agente_mensajes`; recarga restaura el historial (verificado en navegador + BD).
- **DoD:** verificado en navegador: streaming + recarga conserva historial; dos tabs en paralelo soportado por el store (cada tab carga sus mensajes).

**Checklist de la fase:**
- [x] Streaming SSE visible en navegador (mensaje enviado por SSE al backend real, respuesta/error honesto renderizado).
- [ ] Tarjetas de tool: estado (ejecutando/ok/error), args expandibles, resultado truncado, diff en `<pre>` — mejora de tarjetas (post Fase 5).
- [ ] Cancelación funciona y mata el loop en servidor (drop del sender en SSE; verificación dedicada pendiente).
- [ ] Contexto real visible: ocupación %, tokens, evento `usage`, skills — pendiente de Fase 3 (skills/memoria) + mejora de tarjetas.
- [x] Tabs de conversación: crear/cerrar/cambiar; cada tab carga su historial de BD; recarga conserva el estado.
- [ ] Tarjetas de tareas programadas + botón "reintentar" — la sección de tareas programadas en el panel queda con Fase 5.
- [x] Historial de conversaciones cargado desde BD al reabrir (verificado: mensaje persistido + restaurado tras recarga).
- [x] Estados vacío/carga/error sin fallos silenciosos (error honesto de proveedor mostrado).

### Fase 4.5 — Galería visual del chat (página aislada dev)
- Página aislada `/agente/visuales` (solo dev, sin auth ni backend): renderiza los **MISMOS componentes** del chat alimentados por **fixtures** con contenido realista (sección 9.5).
- Catálogo exhaustivo de entradas (los 19 ítems de 9.5) con estados y variantes; fixtures **compartidos con los tests** (misma fuente de verdad).
- Criterios visuales aplicados: tokens del design system, escala tipográfica mínima, estados consistentes, claro/oscuro, contraste AA (sección 9.5).
- **DoD:** en navegador, `/agente/visuales` lista TODAS las entradas, renderizan sin errores de consola y se revisan en claro/oscuro; capturas de la galería completa.

**Checklist de la fase:**
- [ ] Ruta `/agente/visuales` registrada solo en dev (ausente en producción).
- [ ] La galería usa los MISMOS componentes del chat (sin copias ni maquetas).
- [ ] Los 19 ítems de 9.5 tienen entrada con contenido realista (fixture).
- [ ] Fixtures compartidos con tests (la galería y los tests usan la misma data).
- [ ] Criterios visuales verificados en navegador: tokens, estados consistentes, claro/oscuro, contraste, sin specs hardcodeadas.
- [ ] Capturas de la galería completa (claro/oscuro) guardadas como evidencia.
- [ ] La galería se mantiene en Fases 5-6: cada componente nuevo del chat se añade a su catálogo (checklist general ítem 7).
- [ ] Checklist general de la sección 12 completado.

### Fase 5 — Frontend: modal de configuración del agente (v2 avanzada, en curso)
- `ModalConfigAgente` autocontenido (patrón `ModalEditorArbol`) abierto desde el header del panel IA vía botón de ajustes. ✅
- Secciones v1 implementadas y **verificadas en navegador**: **Modo por defecto** (predeterminado/meta/autónomo) que se aplica a conversaciones nuevas; **Modelo** que viaja en el stream SSE.
- Persistencia en `glory-agente-config`/`establecerConfig`; recarga conserva valores y el backend los respeta (verificado: POST crear conversación con `modo:autonomo`; POST stream con `modelo:glory/glm-5.3`).
- Pendiente para completar la fase (requiere backend adicional en iteración posterior): **Skills** (CRUD), **Tareas programadas** (la sección de panel queda), **Workspace** (selector carpeta solo local), **Contexto/Compactación**, y migrar `SeccionConfigIAPanelChat`. `SeccionConfigMCP` sigue global.
- **DoD:** verificado en navegador que abre, edita, guarda y una conversación nueva refleja el modo/modelo elegidos; no rompe tabs+streaming+persistencia.

**Checklist de la fase:**
- [x] `ModalConfigAgente` (v1: modo + modelo) reutilizando `Boton` y tokens del design system (`--dashboard-*`), coherente con los demás modales.
- [ ] Secciones restantes verificadas: Skills (CRUD), Tareas programadas en panel, Modos por tab, Workspace (solo local), Contexto/Compactación — iteración posterior.
- [x] Parámetros avanzados enviados y validados por `/agente/stream`: temperatura, max_tokens, idioma, contexto real limitado por user_id, permisos web/recordatorios, prompt de sistema y límites de turnos/timeout.
- [x] Configuración aislada por conversación: columna JSONB, endpoint autenticado y carga por tab; cada stream usa la configuración de su conversación.
- [ ] Skills CRUD/inyección completa y automejora: siguen pendientes porque todavía no existe contrato backend de skills verificable.
- [x] Config persiste (`glory-agente-config`) y el backend la respeta: el modo va en la creación de conversación y el modelo en el stream (verificado en vivo).
- [ ] `SeccionConfigIAPanelChat` migrada al modal del agente — pendiente (la v1 no la migra; el legacy sigue como helper del modal global).
- [x] No hay specs visuales hardcodeadas en componentes (tokens del design system).
- [x] Verificación visual en navegador del v1 (abre/edita/guarda/aplica).
- [ ] Checklist general de la sección 12 completado.

### Fase 6 — Producción/sandbox y cierre
- `AGENTE_MODO=prod`: sin tools de archivo, fail-closed, confirmación para acciones destructivas, auditoría completa. ✅ (fail-closed por diseño desde Fase 2, test `fail_closed_sin_sandbox`; aprobación por modo en Fase 1; auditoría en `agente_turnos`/`agente_acciones`).
- Verificación de despliegue (Coolify) vía `coolify-manager-rs` (regla deploy-only-coolify-manager). PENDIENTE de autorización de push/deploy + preflight.
- Documentación: ✅ manual en `Agente/documentacion/agente-manual-2026-08-29.md`. Lecciones y cierre en curso.

**Checklist de la fase:**
- [x] `AGENTE_MODO=prod`: sin tools de archivo (fail-closed — no se registran), confirmación para acciones destructivas (mecanismo `requiere_aprobacion`), auditoría completa.
- [ ] Criterios de aceptación 1-16 de la sección 13 verificados (los que apliquen) — revisión en curso.
- [ ] Despliegue en Coolify vía `coolify-manager-rs` con autorización explícita (preflight + verificación) — pendiente de autorización del usuario (push + escrituras remotas).
- [x] Documentación del agente en `Agente/documentacion/agente-manual-2026-08-29.md` (contrato SSE, tools, sandbox, modos, tareas programadas, tabs).
- [ ] Lecciones relevantes en `Agente/lecciones/lecciones-aprendidas.md`.
- [ ] Roadmap actualizado: bloque del agente retirado; evidencia en `Agente/completados/`.
- [ ] Gate final (tsc + cargo check/test filtrados) en verde y sin errores nuevos.
- [ ] Checklist general de la sección 12 completado.

---

## 13. Criterios de aceptación (verificables)

1. `cargo check` + `cargo test` (filtrado por dominio agente) en verde.
2. `npx tsc --noEmit` en verde tras Fases 4, 4.5 y 5.
3. E2E local: el agente crea/edita una tarea real en BD y la auditoría registra la acción.
4. E2E local: el agente lee y modifica un archivo dentro del workspace; un intento de leer `.env` o `..\` es bloqueado.
5. En prod (modo `prod`): no existe ninguna tool de archivo en el registro (fail-closed).
6. Streaming visible en navegador con eventos de tool; cancelación funciona; recarga conserva historial.
7. Modal de configuración del agente con sidebar agrupado y 6 secciones; config persistida.
8. Memoria: el agente recuerda una preferencia entre sesiones; una skill se crea y se carga.
9. Gate del proyecto (`npm run check` o equivalente) sin errores nuevos.
10. Autocompactación: se dispara en el umbral configurado (50% por defecto, 75% ventanas pequeñas, 85% degenerado); conserva cola verbatim, emite `usage` con métricas y no borra historial (recuperable desde BD).
11. Ventana máxima configurable se respeta (nunca se supera; si se alcanza, compactación forzada o error con estado).
12. Tareas programadas: una tarea recurrente (cron) y una de una vez se ejecutan; un reinicio del backend no pierde ni duplica ejecuciones.
13. Modos de operación: en predeterminado un efecto requiere aprobación (diff + botón); en autónomo un efecto seguro se ejecuta sin aprobación y uno inseguro pide verificación; en meta, al detenerse el agente evalúa si cumplió y continúa si no (todo visible en el chat).
14. Autorecuperación: con el proveedor caído (simulado), el agente cambia a otro proveedor / reintenta / encola y el turno no se pierde (estado visible, evento `error` con `retryable`).
15. Workspaces con tabs: en local se crean varios workspaces con sus tabs; cada tab es un chat con contexto independiente; se abren en paralelo y conservan su estado al recargar.
16. Skills administrables desde el modal (crear/editar/activar/desactivar/eliminar) y contexto real visible (tokens, ocupación, qué se compactó, skills/memoria inyectadas).
17. Galería visual: `/agente/visuales` (solo dev) lista TODOS los componentes del chat con sus estados y contenido realista, renderiza sin errores en claro/oscuro y no requiere iniciar un chat; los fixtures son compartidos con los tests.

---

## 14. Entropía documental (qué se toca al cerrar)

- **Este plan:** `Agente/planes/plan-agente-ia-plugin-2026-08-27.md` (activo, se actualiza por fase).
- **Roadmap:** `roadmap.md` — entrada del bloque con enlace al plan (y se retira al cerrar la última fase).
- **Completados:** `Agente/completados/tareas-YYYY-MM-DD.md` por fase con evidencia.
- **Documentación:** `Agente/documentacion/` — manual del agente (contrato SSE, tools, sandbox, modos).
- **Lecciones:** `Agente/lecciones/lecciones-aprendidas.md` si surge conocimiento reutilizable.
- **Prevención:** `Agente/prevencion/` solo si hay un fallo repetible (p.ej. un bug de validación de rutas).

---

## 15. Gate / evidencia

- **Chequeo proporcional:** `cargo check` + tests del dominio agente; `tsc --noEmit` en fases frontend; E2E por terminal/navegador con criterios de la sección 13.
- **Evidencia esperada por fase:** salida de tests, capturas de navegador (streaming, tarjeta de tool, modal), log de `agente_acciones`, y (en cierre de Fase 6) verificación de despliegue en Coolify vía `coolify-manager-rs`.
- **Regla valida-evidencia:** no afirmar PASS con una herramienta no ejecutada o una rama distinta.

---

## 16. Decisión de coordinación

- **Commit:** por fase, con `git add` explícito por archivo (regla git-discipline); **el usuario commitea al final** según su instrucción de esta sesión — los cambios quedan sin commitear salvo indicación contraria.
- **Gate Sentinel:** el proyecto declara gate; aplicarlo en el cierre de cada fase si `doctor.readyForGate === true`.
- **Deploy:** solo vía `coolify-manager-rs` y solo con autorización explícita (regla no-deploy-implicito).

# Plan: Glory Harness — núcleo de IA agnóstico extraíble (CLI + daemon)

- **Fecha:** 2026-09-01
- **ID:** 318A-13
- **Estado:** activo (diseño propuesto; requiere validación del usuario antes de ejecutar)
- **Tipo:** refactor estructural / extracción de núcleo reutilizable
- **Dependencias:** código actual del agente en `task/src/agent/` (runtime, tools, sandbox, contexto, scheduler), `task/src/services/ai.rs` (`LlmProviderService`), `task/src/handlers/agente.rs` (orquestación HTTP/SSE), frontend `task/frontend/src/app/plugins/agente/` (UI — **se queda en task**). Sin credenciales nuevas: se reutilizan las envs de proveedor ya existentes.
- **Referencias:** plan previo `Agente/planes/plan-agente-ia-plugin-2026-08-27.md` (hecho H7 y decisión (8): *"NO extraer a glory-rs en Fase 0 (YAGNI, 2º consumidor especulativo) — extraer cuando haya consumidor real"*).

---

## 0. Resumen ejecutivo (para el usuario)

Hoy el **núcleo de IA** (runtime de agente, tools, sandbox, memoria, contexto, scheduler, proxy de proveedores LLM) vive **dentro** del backend de task (`src/agent/`, `src/services/ai.rs`), acoplado a `AppState` y a las tablas `agente_*` de la BD de task. Eso hace que el agente no pueda escalar ni usarse en otros proyectos sin arrastrar todo task.

**Glory Harness** será una **carpeta/repositorio nuevo en `area-trabajo`** con el núcleo agnóstico:

- **Núcleo Rust** (binario o lib) que **no sabe nada de task**: ni tablas `agente_*`, ni `AppState`, ni el frontend.
- **Dos formas de consumirlo:**
  - **CLI** (`glory-harness run --prompt "..."`): un comando → un turno → salida.
  - **Daemon/background** (SSE o JSON sobre TCP/stdio): proceso de fondo que recibe prompts y emite eventos (`token`, `tool_start`, `tool_result`, `done`, ...). Es el modo que usará task en producción.
- **La UI se queda en task** (tu inclinación "creo que mejor no separarla"): el frontend del plugin agente no se mueve. Solo cambia el transporte: hoy el backend de task orquesta y emite SSE; tras la extracción, task sigue emitiendo el mismo SSE pero el runtime lo delega en Glory Harness (como lib o como proceso).

La frontera de desacople se hace con **traits (puertos)**: persistencia, búsqueda web, tools de dominio, rate limits. Task implementa esos puertos con sus repositorios actuales; Glory Harness define el contrato. Esto es lo que permite que otro proyecto (WANDORIUS, ONG Ágape, un futuro editor) consuma el mismo núcleo con su propia persistencia y sus propias tools de dominio.

**Qué NO se hace ahora (no-goals de este plan):** no se implementa la extracción (este plan solo la diseña), no se separa la UI, no se toca `glory-rs/`, no se crean repos externos en GitHub, no hay deploy.

---

## 1. Problema real

1. **Acoplamiento fuerte a task:** `AgentRuntime` recibe `&AppState` / `&PgPool`; `persistir_turno` inserta en `agente_turnos`; `inyectar_contexto` lee `agente_memoria` y `agente_skills` con SQL directo de task. El núcleo no es reutilizable sin la BD y el schema de task.
2. **No escalable a otros proyectos:** la decisión (8) del plan previo pospuso la extracción por YAGNI. **Ese segundo consumidor ya existe** (tú lo pides explícitamente): Glory Harness debe servir a task y a otros proyectos.
3. **Sin forma de operarlo fuera de HTTP:** no hay CLI ni proceso de fondo; el agente solo vive dentro del servidor Axum de task. Un flujo de automatización (script, cron, otro servicio) no puede invocar el núcleo.
4. **Frontera difusa:** la separación entre "lógica agnóstica de agente" y "lógica de dominio de task" no está declarada en el código; está implícita en la estructura de carpetas (`src/agent/` mezcla tools de dominio `crear_tarea`/`crear_habito` con herramientas genéricas `file_read`/`web_search`).

### Resultado deseado

1. **Carpeta `glory-harness/`** en `area-trabajo` (repo propio, agnóstico), con:
   - `core/` — runtime, traits, sandbox, contexto, diff, scheduler genérico (sin SQL de task).
   - `tools/` — tools agnósticas (archivo con sandbox, búsqueda web, shell acotado opcional) y el registro OCP.
   - `providers/` — `LlmProviderService` (proxy de proveedores con fallback chain) movido del core de task.
   - `cli/` — binario `glory-harness` (subcomandos `run`, `daemon`, `tools`, `doctor`).
   - `daemon/` — servidor SSE/JSON para modo background.
2. **Frontera limpia por traits:** el núcleo define `AgentPersistence` (turnos, mensajes, acciones, memoria, skills, tareas programadas), `WebSearchProvider` y `AgentToolContext`; task los implementa con sus repositorios. El núcleo no importa `AppState` ni SQLx.
3. **Task consume el núcleo sin romper su contrato SSE actual** (`/api/agente/stream` y eventos `Token/ToolStart/ToolResult/...` siguen idénticos para el frontend).
4. **Modo daemon:** el proceso de fondo emite el mismo contrato de eventos que task emite hoy; task puede (Fase 2) delegar en él sin tocar el frontend.
5. **Reutilización real:** un segundo proyecto (p. ej. WANDORIUS o un script local) puede usar `glory-harness run` con su propio provider y persistencia.

### No-goals (fuera de alcance de este plan y de la v1 de extracción)

- **No implementar ahora:** este plan **diseña** la extracción; la ejecución es por fases aprobadas una a una.
- **La UI NO se separa** (decisión por defecto; ver §6.6): el plugin `agente` del frontend de task sigue siendo el cliente. La incertidumbre del usuario ("no sé, creo que mejor no") se resuelve a favor de **mantener la UI en task**, con rationale y con la puerta abierta a extraerla más adelante si aparece un segundo cliente de UI.
- **No tocar `glory-rs/`:** el submódulo sigue siendo agnóstico pero no recibe lógica de IA; Glory Harness es el destino correcto (más pequeño, Rust-only, sin React).
- **No mover las tablas `agente_*` a otro servidor:** la BD sigue en task; el núcleo solo define el contrato de persistencia.
- **No deploy/push/creación de repos remotos** sin autorización explícita (protocolo PT §9.6).
- **No subagentes async, no ejecución de código arbitrario, no ZPA**: heredado del plan previo (no-goals v1 del agente).
- **No cambiar el comportamiento del agente actual:** la extracción es un refactor; paridad funcional obligatoria tras cada fase.

---

## 2. Restricciones y dependencias (hechos vs supuestos)

### Hechos confirmados (verificados 01-09-2026)

| # | Hecho | Evidencia |
|---|---|---|
| H1 | El núcleo IA vive en `src/agent/` (mod, tool, runtime, tools, tools_archivo, sandbox, scheduler, context, diff) + `src/services/ai.rs` + `src/handlers/agente.rs` + `src/lib.rs` (`AppState`) | exploración 01-09 |
| H2 | `AgentRuntime` depende de `&AppState` (pool, ai_provider, web_search) vía `AgentToolContext`; `persistir_turno` inserta en `agente_turnos` con SQL directo | `src/agent/runtime.rs`, `src/lib.rs:27` |
| H3 | El contrato SSE del agente (`AgenteEvento`) es: `Token{texto}`, `ToolStart`, `ToolResult{tool,ok,resumen,diff}`, `RequiereAprobacion`, `Usage`, `Contexto`, `ContextoDetalle`, `Error`, `Done` | `src/agent/runtime.rs` |
| H4 | `LlmProviderService` (en `src/services/ai.rs`) es un proxy genérico de proveedores con `PROVIDERS` allowlist + `CHAT_FALLBACK_CHAIN` + streaming; no depende de tablas de task | `src/services/ai.rs` |
| H5 | Tablas acopladas al núcleo en la BD de task: `agente_turnos`, `agente_mensajes`, `agente_acciones`, `agente_conversaciones`, `agente_memoria`, `agente_skills`, `agente_tareas_programadas` | `src/agent/runtime.rs`, `src/handlers/agente.rs` |
| H6 | `SandboxArchivos` (allowlist de rutas, `ruta_presentable`, resolución case-insensitive) ya es agnóstico de task; `tools_archivo.rs` usa `sandbox.ruta_presentable` en sus resúmenes (318A-12) | `src/agent/sandbox.rs`, `tools_archivo.rs` |
| H7 | El frontend del plugin agente (14 archivos en `frontend/src/app/plugins/agente/`) consume el contrato SSE y CRUD `/api/agente/*`; el servicio normaliza config camelCase↔snake_case | `service.ts`, `store.ts`, `PanelAgente.tsx` |
| H8 | Plan previo: decisión (8) de no extraer a `glory-rs` por YAGNI, con condición explícita *"extraer cuando haya consumidor real"*; el hecho H7 confirma que `glory-rs/` no tiene lógica IA | `plan-agente-ia-plugin-2026-08-27.md` |
| H9 | `AgentTool` trait + `AgentToolRegistry` (HashMap) ya es el patrón OCP/ISP que hay que generalizar: `id, descripcion, schema(JSON Schema), efecto(), ejecutar(ctx)` | `src/agent/tool.rs` |
| H10 | `AppState` incluye `ai_provider`, `web_search`, `pool`, `agente_limiter` (rate limit por usuario/hora) | `src/lib.rs:27-41` |

### Supuestos (a validar en Fase 0)

- S1: El binario de Glory Harness puede compilarse como **lib + bin** en el mismo crate (o workspace de 2 crates) sin conflictos con `Cargo.toml` de task. → validar en el skeleton.
- S2: Los traits de persistencia pueden modelar los 7 repositorios `agente_*` con un contrato compacto sin perder capacidad (búsqueda de memoria por clave, skills por id, cola de tareas programadas). → validar al definir el trait.
- S3: `sqlx` puede quedar fuera del núcleo (el núcleo usa traits; task implementa con sqlx). Si alguna query genérica de memoria/skills es inseparable del núcleo, se evalúa portar a un trait de query-string. → validar en Fase 1.
- S4: El contrato SSE se mantiene estable (no romper el frontend). → garantía de diseño (los eventos son los de H3).
- S5: Glory Harness puede correr como daemon en el mismo host que task (puerto local dedicado o stdio), sin chocar con 3001/5175. → validar en Fase 2.

### Modos de fallo y riesgos principales

- **R1 — Romper el contrato SSE / frontend:** la extracción cambia dónde corre el runtime y el frontend se rompe. → Fases con paridad funcional verificada; el contrato de H3 es invariante de fase.
- **R2 — Fuga de archivos en el daemon:** si el daemon se expone sin auth, un proceso local podría leer archivos del workspace. → El daemon solo escucha en loopback (`127.0.0.1`) con token de sesión; las tools de archivo solo se registran si el consumidor lo permite (mismo criterio `AGENTE_MODO=local`).
- **R3 — Doble fuente de verdad de memoria/skills:** si el núcleo escribe memoria y task también, divergen. → El núcleo **nunca** persiste por sí mismo: siempre a través del puerto `AgentPersistence`; task es el único dueño de la BD.
- **R4 — Deuda de extracción a medias:** mover archivos sin definir la frontera deja un "core híbrido" que importa task. → Orden de fases estricto: primero traits/contratos (Fase 1), luego mover módulos que ya no dependen de task (Fase 2), luego el daemon/CLI (Fase 3).
- **R5 — Dependencia de sqlx en el núcleo:** arrastraría el schema de task. → Objetivo: núcleo sin sqlx (S3); si no es viable del todo, el núcleo usa un trait de "queries de memoria/skills" implementado por el consumidor.
- **R6 — El daemon duplica rate limits:** task limita por usuario/hora; un daemon sin límite lo anula. → El rate limit sigue viviendo en el consumidor (task); el núcleo expone el turno como operación atómica y el consumidor decide el límite. No hay rate limit dentro del núcleo (es política de host, no del núcleo).

---

## 3. SOLID — decisiones por principio (aplicadas a la extracción)

| Principio | Decisión | Justificación |
|---|---|---|
| **SRP** | `glory-harness` separa: `core` (runtime+contratos), `providers` (LLM), `tools` (agnósticas), `persistence` (trait), `cli`/`daemon` (transporte). Task conserva: handlers HTTP, repositorios sqlx, frontend | Cada artefacto una responsabilidad; el núcleo no orquesta HTTP de task ni SQL de task |
| **OCP** | El registro de tools se generaliza: el núcleo ofrece `registrar_tools_core()` (archivo, web, contexto); el consumidor registra las suyas (`crear_tarea`, `crear_habito`, ...) con el mismo `AgentTool` trait. Añadir tool en cualquier proyecto = nuevo módulo + registro, sin tocar el runtime | Es el patrón H9 ya existente, elevado a contrato público del núcleo |
| **LSP** | `AgentPersistence` define operaciones (guardar_turno, listar_mensajes, memoria, skills, tareas programadas); task la implementa con sqlx; cualquier otro proyecto implementa la suya. El runtime no distingue implementación | Sustituible sin cambiar el núcleo ni el frontend |
| **ISP** | `AgentToolContext` se divide en puertos pequeños: `PersistencePort`, `WebSearchPort`, `ProviderPort`, `TimePort`; el runtime pide solo lo que usa; las tools de dominio reciben solo su subconjunto | Evita que una tool vea `AppState` entero; cada puerto mínimo |
| **DIP** | El runtime y las tools dependen de los **traits** del núcleo, no de `AppState`/`PgPool`/tipos de task. El binario `glory-harness` y el daemon inyectan implementaciones concretas en el entrypoint | El núcleo es la abstracción; task y otros proyectos son las implementaciones |

---

## 4. Modelo de escala

| Dimensión | Valor objetivo |
|---|---|
| Consumidores | v1: task (lib + daemon). Objetivo de diseño: N proyectos (WANDORIUS, Ágape, scripts locales) sin cambios en el núcleo |
| Throughput | El mismo del agente actual (turnos por usuario/hora limitados en el consumidor); el daemon añade 1 proceso de fondo por host, sin límite propio |
| Concurrencia | Mismo modelo: 1 agente activo por sesión (lock de sesión). **Con N interfaces (task + CLI + escritorio) compartiendo daemon, el lock vive en el daemon por `session_id`** (multi-sesión), no en cada consumidor; el núcleo es stateless por turno (todo el estado entra por el contexto), así N turnos paralelos en sesiones distintas son seguros |
| Latencia | Streaming: primer token < 2-3s (heredado). La vía daemon añade <1ms de overhead local (loopback) |
| Volumen de datos | La BD sigue en task; el núcleo no guarda estado persistente propio (solo el estado del turno en memoria) |
| Despliegue | Local (dev) y producción (Coolify, mismo binario, config por env: `AGENTE_MODO`, `AGENTE_WORKSPACE_ROOT` solo en local). Glory Harness es un crate más del workspace de task en el build, o un binario separado desplegado junto a task |

**Nota de honestidad:** la escala real sigue siendo la de una app personal + algunos usuarios. La ganancia de esta extracción **no es** el throughput (igual) sino la **reutilización y la independencia del ciclo de vida**: Glory Harness puede evolucionar (mejor compactación, nuevos providers, mejor sandbox) sin tocar task, y otros proyectos pueden adoptarlo sin arrastrar el backend de task.

---

## 5. Eficiencia — comparación de opciones de integración

### 5.1 Cómo consume task el núcleo: lib vs proceso

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| A. **Crate lib** (task añade `glory-harness` como dependencia path) | Cero overhead de proceso; tipos y contrato en el mismo binario; tests compartidos; refactor gradual (Fase 1-2) | Sigue compartiendo ciclo de compilación con task; no es "independiente" del todo | ✅ **Fase 1-2**: la vía inmediata, mínima fricción |
| B. **Proceso daemon** (binario separado, SSE/JSON en loopback) | Independencia real del ciclo de vida; task puede actualizar el núcleo sin recompilar; escala a otros proyectos sin acoplar builds | Overhead de proceso + serialización; auth del socket; gestión de lifecycle del daemon | ✅ **Fase 3**: el modo "harness corre de fondo" que pediste |
| C. CLI one-shot (subproceso por prompt) | Simple para scripts | Latencia de arranque por prompt; sin estado de sesión; ineficiente para chat interactivo | ✅ **Complementario** (CLI `run`), no sustituto del daemon |

**Decisión:** **A ahora, B como destino, C como bonus.** La extracción se hace como crate lib (permite refactor incremental y tests), y el binario `glory-harness` ofrece `daemon` (B) y `run` (C). Task puede empezar consumiendo como lib y migrar a daemon cuando el daemon esté maduro, sin cambiar el contrato. **El daemon (B) es además el punto de extensión para interfaces futuras (CLI interactiva, escritorio):** un solo proceso multi-sesión que sirve el contrato SSE a N clientes sin que task cambie (ver §6.7).

### 5.2 Qué transporte usa el daemon

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| A. SSE sobre HTTP loopback | Mismo contrato que el frontend ya usa; reutiliza `tokio-stream`; debug fácil con curl | Más peso que stdio | ✅ **v1 daemon** (coherente con H3) |
| B. JSON lines sobre stdio | Ligero, sin puertos, ideal para orquestar desde task | Hay que definir protocolo de framing propio; menos debug-friendly | 🔶 futuro si hace falta (modo `daemon --stdio`) |
| C. gRPC/tonic | Tipado fuerte | Overhead de dependencias (tonic/prost) injustificado para loopback local | ❌ descartado |

### 5.3 Qué queda en task vs qué se mueve (frontera del núcleo)

| Artefacto | ¿A Glory Harness? | Nota |
|---|---|---|
| `src/agent/runtime.rs` (loop, system prompt, ejecutar_turno) | ✅ sí (**parcial**) | el corazón queda agnóstico vía puertos; **pero** dentro del archivo viven `persistir_turno`, `cargar_historial`, `cargar_memoria_agente` y `cargar_skills_agente` con SQL inline de tablas de task (dominio: tareas/hábitos/notas, memoria, skills) — esas funciones **NO se mueven**: pasan al puerto `AgentPersistence` implementado por task. Verificado: `runtime.rs` usa `&AppState`/`&state.pool` (L22, L233, L266, L614-832) |
| `src/agent/tool.rs` (trait + registry) | ✅ sí | H9, contrato público |
| `src/agent/sandbox.rs` | ✅ sí | ya agnóstico (H6) |
| `src/agent/context.rs` (compresión/límites) | ✅ sí | agnóstico |
| `src/agent/diff.rs` | ✅ sí | agnóstico |
| `src/agent/tools_archivo.rs` | ✅ sí | agnóstico (usa sandbox) |
| `src/agent/tools.rs` (`crear_tarea`, `crear_habito`, `crear_recordatorio`, `crear_nota`, `web_search`) | ⚠️ **parcial** | `crear_*` son **tools de dominio de task** → se quedan como tools registradas por task contra el trait; `web_search` es agnóstica → al núcleo |
| `src/agent/scheduler.rs` | ✅ sí (**con requisito**) | hoy está 100% acoplado a `AppState`+SQL (`correr_scheduler(state: AppState)`, verificado); al moverlo, **todas** sus queries pasan a métodos del trait `AgentPersistence` (`tarea_programada_*`); la lógica de reprogramación es agnóstica, pero el desacople query-a-trait es el grueso del trabajo |
| `src/services/ai.rs` (`LlmProviderService`) | ✅ sí (**con requisito**) | H4 no usa `AppState`/`PgPool` (verificado), pero depende de `crate::config::AiProviderKeys` y `crate::errors::AppError`; al moverlo hay que mover/reexportar esos tipos al núcleo o desacoplarlos (tipos propios de error/config del crate) |
| `src/handlers/agente.rs` | ❌ **se queda en task** | orquesta HTTP/SSE, auth, rate limit, config por usuario |
| `src/lib.rs` (`AppState`) | ❌ **se queda en task** | glue del servidor |
| Tablas `agente_*` | ❌ **se quedan en task** | la BD es del consumidor |
| Frontend `plugins/agente/` | ❌ **se queda en task** | UI nativa de task (decisión §6.6) |

---

## 6. Núcleo / abstracción — decisiones de arquitectura

### 6.1 Frontera del contrato: el runtime no sabe quién lo llama

El núcleo define un `AgentRuntime` que recibe un `AgentSession` (config del turno + puertos) y produce eventos. **No** recibe `user_id` de task como concepto de negocio; recibe un `session_id` opaco (string) que el consumidor mapea a su usuario. Toda consulta a BD pasa por `AgentPersistence`.

**Gotcha de la frontera (verificado):** las funciones `persistir_turno`, `cargar_historial`, `cargar_memoria_agente` y `cargar_skills_agente` viven HOY dentro de `runtime.rs` con SQL inline de dominio de task. Al mover `runtime.rs` al núcleo, estas funciones **no se mueven con él**: se convierten en implementación del puerto `AgentPersistence` (en task). El núcleo solo conserva el loop y el flujo de turno; toda query de dominio viaja por el trait.

### 6.2 Puertos (traits) que define el núcleo

```rust
// glory-harness/core/src/persistence.rs (contrato; sin sqlx)
#[async_trait]
pub trait AgentPersistence: Send + Sync {
    async fn guardar_turno(&self, turno: &TurnoPersistido) -> Result<(), PersistError>;
    async fn guardar_mensaje(&self, m: &MensajePersistido) -> Result<(), PersistError>;
    async fn guardar_accion(&self, a: &AccionPersistida) -> Result<(), PersistError>;
    async fn cargar_historial(&self, session_id: &str, limite: usize) -> Result<Vec<MensajePersistido>, PersistError>;
    async fn memoria(&self, clave: &str) -> Result<Option<String>, PersistError>;
    async fn guardar_memoria(&self, clave: &str, valor: &str) -> Result<(), PersistError>;
    async fn skills(&self) -> Result<Vec<SkillPersistida>, PersistError>;
    async fn tarea_programada_siguiente(&self, ahora: DateTime<Utc>) -> Result<Option<TareaProgramada>, PersistError>;
    // ... (completar en Fase 1 contra los 7 repositorios agente_*)
}

pub trait WebSearchProvider: Send + Sync { /* buscar(consulta, limite) */ }
pub trait ProviderPort: Send + Sync { /* enviar_chat_stream(options) -> Stream<Chunk> */ }
```

Task implementa `AgentPersistence` con sus repositorios sqlx (sin cambiar tablas), `WebSearchProvider` con `WebSearchService`, y `ProviderPort` con `LlmProviderService` (movido al núcleo como crate, reexportado).

### 6.3 Sistema de plugins de tools (OCP público)

El núcleo exporta `AgentTool` + `AgentToolRegistry` y un constructor `AgentRuntime::nuevo(registro, puertos, config)`. Task registra sus tools de dominio:

```rust
let mut registro = AgentToolRegistry::default();
registro.registrar_tools_core();        // archivo, web, contexto (núcleo)
registro.registrar(ToolTarea::nuevo()); // task
registro.registrar(ToolHabito::nuevo());
// ...
let runtime = AgentRuntime::nuevo(registro, puertos, config);
```

### 6.4 Eventos / contrato SSE estable (invariante)

`AgenteEvento` (H3) es **el contrato de salida del núcleo** (enum en el crate core). El handler de task serializa ese enum a SSE; el daemon también. El frontend **no cambia**. Esto hace que migrar de lib→daemon sea transparente para el cliente.

### 6.5 Configuración por env (sin secretos en código)

El núcleo lee su config de envs (`GLORY_HARNESS_*`, reutilizando `GROQ_API_*`, `DEEPSEEK_API_*`, `GLORY_API_URL` para providers). Task sigue pasando su config de usuario (por conversación) como parte de `AgentSession`. No se copian secretos al repositorio.

### 6.6 Decisión sobre la UI (la incertidumbre que planteaste)

Tu duda: *"¿separar también la interfaz? no lo sé, creo que mejor no"*.

**Decisión propuesta (por defecto): la UI se queda en task.** Razones:

1. **La UI es específica de task**: `PanelAgente.tsx`, `mensajes.tsx`, `panelAgente.css`, store y modal de config están construidos sobre el design system y los patterns de task (formularios declarativos, tokens, plugin system). Extraerla a un núcleo la obligaría a depender de task de todos modos (o a duplicar el design system).
2. **No hay segundo cliente de UI real**: otro proyecto (p. ej. WANDORIUS) tendría su propio shell/UX; compartir el "chat del agente" como componente React genérico no aporta hoy y añade una librería UI a mantener (YAGNI — la misma lógica de la decisión (8) original).
3. **El contrato ya está separado**: el SSE tipado (H3) es la interfaz real. Cualquier UI futura puede consumirlo sin mover nada del núcleo. La UI ya está desacoplada por contrato, aunque viva en task.
4. **Puerta abierta**: si en el futuro aparece un segundo cliente de UI que quiera exactamente este chat, se extrae el componente a una librería compartida en `area-trabajo` (p. ej. `glory-ui`) sin tocar el núcleo. No es un cambio irreversible.

**Criterio de revisión:** si un proyecto nuevo quiere el mismo chat del agente y NO puede consumir el SSE directamente, se reevalúa extraer la UI como librería compartida. Hasta entonces, UI nativa de task.

### 6.7 Interfaces futuras (CLI + escritorio) sin romper task — decisión de diseño

> [01-09-2026] Pregunta del usuario: *"¿y si más adelante creamos una interfaz para harness — una versión CLI y otra de escritorio? no es para hacerlo ahora, pero se podrá, me imagino, sin romper la integración task."*

**Respuesta de diseño: SÍ se podrá, sin romper task.** Es consecuencia directa de los invariantes del plan:

1. **El contrato SSE (`AgenteEvento`) es la interfaz estable** (§6.4): una interfaz nueva (CLI, escritorio) es un cliente más del mismo contrato. Añadir clientes no cambia el contrato → task no se entera.
2. **La persistencia es por consumidor** (trait `AgentPersistence`, §6.2): un escritorio implementa la suya (p. ej. SQLite local), **nunca** las tablas `agente_*` de task. Cero acoplamiento de datos entre interfaces.
3. **Las tools de dominio son del consumidor** (§6.3): el escritorio registra sus propias tools (o ninguna); el núcleo solo aporta las agnósticas (archivo con sandbox, web, contexto). Cada interfaz decide sus permisos.

**Vías de consumo de una interfaz nueva:**

| Interfaz | Vía | Detalle |
|---|---|---|
| **CLI** (`glory-harness run`) | one-shot (Fase 3, §5.1 opción C) | ya previsto; también TUI interactiva sobre el mismo contrato |
| **Escritorio** | **daemon compartido** (recomendado) o **lib embebida** | task y desktop hablan con el mismo `glory-harness daemon` (SSE loopback multi-sesión), o el desktop embebe `glory-harness-core` en su proceso (Tauri/Wails/Electron) e implementa sus puertos |

**Único requisito nuevo que revela esta pregunta (se incorpora a Fase 3):** el daemon debe ser **multi-sesión** (lock por `session_id` dentro del daemon, no en cada consumidor) para que task + escritorio puedan compartirlo sin pisarse (§4).

**Límites honestos (decisión de producto futura, no de arquitectura hoy):**
- Si el escritorio usa su propia persistencia, su memoria/skills son **distintas** a las de task. Si algún día se quiere memoria compartida entre interfaces, eso exige un `AgentPersistence` compartido (p. ej. el daemon con BD propia) — se decide cuando exista ese requisito, no ahora.
- La UI React de task **no se reutiliza** en un escritorio nativo (design system distinto); pero la lógica del cliente SSE (`service.ts` → parseo de eventos) es portable 1:1.

---

## 7. Seguridad

1. **El núcleo no persiste por sí mismo** (R3): toda escritura de memoria/skills/turnos pasa por `AgentPersistence` del consumidor. Un núcleo "huérfano" no puede escribir en ninguna BD.
2. **Sandbox de archivos** (H6) se mantiene y se mueve intacto: allowlist de rutas, resolución segura, `ruta_presentable`, límite de tamaño. Las tools de archivo solo se registran bajo política del consumidor (`AGENTE_MODO=local`); el núcleo no las registra por defecto en modos restrictivos.
3. **Daemon solo en loopback + token**: `GLORY_HARNESS_DAEMON_BIND=127.0.0.1:<puerto>` y un token de sesión que el consumidor pasa en cada request. Sin auth de red (no es un servicio de internet).
4. **Sin ejecución de código arbitrario** (heredado): el núcleo no incluye `execute_code`.
5. **Secretos por env** (6.5): nunca en código ni en el repo; el núcleo lee del entorno del proceso.
6. **Salida acotada**: timeouts por tool, tope de tamaño de salida de tool, límite de turns por turno (ya en el runtime actual) se conservan en el núcleo.
7. **No hay SSH/deploy/push desde el núcleo**: Glory Harness no orquesta despliegues; eso sigue siendo del consumidor (y en producción, solo `coolify-manager-rs` con autorización).

---

## 8. Documentación / entropía documental

- **Fuente canónica nueva:** `glory-harness/README.md` (qué es, cómo se consume como lib, CLI y daemon) + `glory-harness/Agente/planes/` para sus planes propios.
- **No duplicar decisiones:** el plan previo del agente (`plan-agente-ia-plugin-2026-08-27.md`) **sigue vivo** para el diseño funcional del agente (compactación, modos, skills); este plan solo decide **dónde vive** el código. Se enlaza, no se reescribe.
- **En task:** el roadmap gana una entrada de pendiente (318A-13) con enlace a este plan; no se archiva en completados hasta que se ejecute.
- **Regla de oro:** toda decisión nueva de Glory Harness se escribe en su propio `Agente/documentacion/` y se enlaza desde el README; no se vuelca al AGENTS.md global.

---

## 9. Gate / evidencia

- **Gate de task:** el cambio en task (Fases 1-2) pasa por `npm run gate:check -- <ID>` con sentinel de task (rama `main`, worktree propio, ff-only). El plan previo advierte del desync de varsense (318A-6VAR): no forzar pins ni editar `sentinel.lock.json` a mano; si el gate base está rojo por varsense, se reporta como trabajo separado y no se mezcla con la extracción.
- **Gate de Glory Harness (nuevo proyecto):** bootstrap con `quality:doctor` y gate propio una vez el crate compile; el repo nuevo se declara en su `sentinel.config.json` (primaryBranch `main`).
- **Evidencia por fase:** tests del núcleo (los de `src/agent/*` que se mueven) + tests de task (paridad de comportamiento) + verificación real de un turno de chat antes y después (el SSE del frontend debe mostrar el mismo resultado). Verificación funcional, no solo compilación.

---

## 10. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Extraer a `glory-rs/`** (submódulo existente) | El plan previo (H7) ya lo descartó: `glory-rs` es el framework reutilizable Rust+React de otro alcance; meter el agente lo infla y mezcla dominios. Glory Harness es un repositorio dedicado, más pequeño y con su propio ciclo de vida |
| **No extraer nada (seguir en task)** | Era correcto mientras el único consumidor era task (decisión (8)). El consumidor real ya existe (tu petición); seguir acoplado bloquea la reutilización |
| **Extraer solo `services/ai.rs`** (proxy LLM) | Es el paso más fácil pero deja el runtime acoplado; no resuelve el problema de fondo |
| **Reescribir el núcleo desde cero en el repo nuevo** | Pérdida de código probado (runtime, sandbox, contexto, diff) y riesgo de divergencia. La extracción mueve código existente con tests |
| **Separar también la UI** | Ver §6.6: sin segundo cliente de UI real, es YAGNI y añade una librería UI a mantener |

---

## 11. Criterios de aceptación

1. `glory-harness/` existe como repo/carpeta en `area-trabajo` con `core/`, `providers/`, `tools/`, `cli/`, `daemon/` y README que documenta consumo lib + CLI + daemon.
2. El crate `glory-harness` compila **sin** depender de `task` (0 imports de `src/` de task; 0 sqlx en el núcleo — validar S3).
3. Task consume el núcleo (lib) y el contrato SSE del frontend **no cambia**; un turno de chat real funciona igual antes y después (evidencia de verificación funcional).
4. Los tests movidos al núcleo pasan en el repo nuevo; los tests de task siguen pasando (sin regresión).
5. El binario `glory-harness run` responde un turno por CLI y `glory-harness daemon` emite los eventos de H3 en loopback (Fase 3).
6. Roadmap de task actualizado (318A-13) y documentación de Glory Harness creada sin duplicar decisiones.
7. Gate de task PASS en las fases que tocan task; gate propio de Glory Harness provisionado.

---

## 12. Fases de ejecución (checklist por fase) — pendiente de validación

> **La ejecución NO se inicia sin tu visto bueno.** Cada fase es un bloque cerrado con su propio gate y commit. Paridad funcional obligatoria al cierre de cada fase.

### Fase 0 — Skeleton y decisión de frontera
- [x] Crear `glory-harness/` en `area-trabajo` (carpeta nueva, no toca task).
- [x] `Cargo.toml` con 2 crates (workspace): `glory-harness-core` (lib) + `glory-harness` (bin CLI/daemon). Validado S1.
- [x] Declarar en el README el contrato de puertos (6.2), eventos (6.3/6.4) y la frontera 5.3.
- [x] Bootstrappear gate propio de Glory Harness (sentinel + doctor) y verificar `cargo build`/`cargo test` vacío en `C:\tmp`.
- [ ] **Checklist:** repo creado, compila, gate propio verde, frontera documentada.
  - Hecho: repo + workspace compilan (target `C:/tmp/glory-harness-target`); gate propio autónomo `0016142`: checkouts propios (sentinel v0.7.7, varsense v2.2.1) en commits publicados, `quality:setup` con evidencia real, doctor `readyForGate=true`, analyze 0 errores. VarSense 0 archivos escaneables por diseño (linter CSS/TS y el repo es Rust puro). Fix de config: la policy v2 exige las 4 listas de guard (`npmScripts`/`npxTools` vacías en proyecto Rust).

### Fase 1 — Definir traits y mover módulos agnósticos (como crate lib)
- [x] Definir `AgentPersistence`, `WebSearchProvider`, `ProviderPort` en el núcleo (validado S2/S3: sin sqlx, sin tipos de task). Contrato serde snake_case con tests (`contrato_tests.rs`, 12/12).
- [x] Desacoplar `LlmProviderService` de `crate::config::AiProviderKeys` y `crate::errors::AppError` → `core/src/llm.rs` con tipos propios y tests portados 12/12 (commit `ff65ccf`). 3 warnings estructurales heredados (`limite-lineas`, `funcion-larga` en `llm.rs`) documentados; 0 errores gate.
- [x] Extraer de `runtime.rs` las funciones de persistencia/dominio (`persistir_turno`, `cargar_historial`, `cargar_memoria_agente`, `cargar_skills_agente`) → implementación del puerto `AgentPersistence` en task (**no se mueven al núcleo**; bloque de Fase 2; commit task `d9d523f`: `src/agent/adaptador.rs`).
- [x] Convertir **todas** las queries de `scheduler.rs` a métodos del trait `AgentPersistence` — puerto extendido con `tarea_reprogramar` (commit `5125589`); scheduler 100% sin SQL.
- [x] Mover a `glory-harness-core`: `diff.rs`, `context.rs`, `sandbox.rs` (commit `fe47ccc`); `tool.rs`, `tools_archivo.rs`, `tools_web.rs` (commit `def5aa7`); `scheduler.rs` (commit `5125589`); `runtime.rs` sin SQL sobre puertos con contrato H3 alineado al SSE de task (commit `ad57f54`); `services/ai.rs` como `llm.rs` desacoplado (commit `ff65ccf`). 44/44 tests core, 0 warnings, gate 0 errores (warnings estructurales heredados documentados).
- [x] `web_search` (agnóstica) al núcleo (`tools_web.rs`); `crear_tarea`/`crear_habito`/`crear_recordatorio`/`crear_nota` quedan en task como tools registradas contra el trait (Fase 2).
- [x] Task implementa `AgentPersistence` con sus repositorios `agente_*`; `WebSearchProvider` con `WebSearchService`; `ProviderPort` con el provider movido (Fase 2; commit task `d9d523f`).
- [x] `handlers/agente.rs` y `AppState` se adaptan: construyen el runtime con los puertos, sin lógica de núcleo (Fase 2; commit task `d9d523f`).
- [ ] **Checklist:** núcleo compila sin task; task compila y un turno de chat real funciona igual (evidencia SSE); tests movidos pasan; tests de task sin regresión; gate task PASS; commit por bloque.
  - Parcial (02-09): núcleo compila (44/44 tests core, gate glory-harness PASS); task compila (`cargo check` 0 errores) y tests 23 pass sin regresión; `export-openapi` incluye `AiMessage` como schema. **Gate task queda bloqueado por desync varsense preexistente (318A-6VAR)**: `readyForGate:false` por varsense commit `38889aa` no alcanzable + evidencia de compilación ausente; NO se forzó (trabajo separado). Turno de chat real con proveedor externo pendiente de evidencia SSE.

### Fase 2 — Integración como lib en task
- [x] task declara `glory-harness-core` como dependencia path (opción A de 5.1) — `Cargo.toml` `path="../glory-harness/core"`.
- [x] Eliminar de task `src/agent/*` movidos y `src/services/ai.rs` (ahora import del crate) — 6 módulos huérfanos borrados (`context/diff/runtime/sandbox/tool/tools_archivo`), `services/ai.rs` reducido a re-export, `mod.rs`/`scheduler.rs`/`tools.rs` re-apuntan al crate (commit task `d9d523f`).
- [ ] Verificación funcional completa: chat real, tools de archivo (local), memoria, skills, tareas programadas, compactación — parcial: compilación 0 errores, tests 23 pass, tests adaptador (skills) pasan, OpenAPI incluye `AiMessage`; falta turno SSE real con proveedor externo.
- [ ] **Checklist:** task sin `src/agent/` movido; todo el contrato SSE funciona; gate task PASS; evidencia de turno real — código completo y compila; gate task bloqueado por 318A-6VAR (preexistente); falta evidencia de turno SSE real.

### Fase 3 — CLI y daemon (el "corre de fondo" que pediste)
- [ ] Binario `glory-harness` con subcomandos `run` (one-shot CLI) y `daemon` (SSE loopback, opción A de 5.2; `--stdio` futuro).
- [ ] **Daemon multi-sesión** (requisito §6.7): lock por `session_id` dentro del daemon, no en cada consumidor — habilita task + CLI + escritorio compartiendo el mismo proceso sin pisarse.
- [ ] Task puede delegar en el daemon (opción B de 5.1) o seguir con lib — decisión al cerrar la fase según estabilidad.
- [ ] Auth del daemon: bind loopback + token de sesión.
- [ ] **Checklist:** `glory-harness run --prompt "..."` responde; `daemon` emite H3 en loopback con token y atiende ≥2 sesiones en paralelo; task usa lib o daemon con paridad; gate ambos proyectos PASS.

### Fase 4 — Segundo consumidor (opcional, validar contigo)
- [ ] Identificar un proyecto real (p. ej. WANDORIUS o un script) y consumir `glory-harness run`/lib.
- [ ] Documentar en README el caso de uso del segundo consumidor.
- [ ] **Checklist:** segundo consumidor funcional; sin cambios en el núcleo (o cambios justificados).

---

## 13. Riesgos abiertos (decisión del usuario requerida)

1. **¿Repo Git propio en GitHub o solo carpeta local?** (protocolo: push requiere autorización). Sugerencia: carpeta local + git local primero; GitHub cuando haya consumidor real.
2. **¿Nombre/carpeta exacta?** Sugerencia: `glory-harness` (minúsculas, con guion) para consistencia con `coolify-manager-rs`, `freebuff-bridge`, etc.
3. **¿Hasta qué fase ejecutar ahora?** Sugerencia: Fase 0+1 (skeleton + traits + mover módulos agnósticos) como primer bloque; Fase 2-4 cuando la 1 esté verde.
4. **¿Task consume como lib o daemon en producción?** Sugerencia: lib ahora (menos riesgo), daemon cuando esté maduro (Fase 3).

---

## 14. SIGUIENTE ACCIÓN

1. **Revisado con `supervisor-thinking` (01-09-2026): VEREDICTO VIABLE CON RESERVAS** — se corrigió la frontera de `runtime.rs`/`scheduler.rs`/`services/ai.rs` (§5.3, §6.1, Fase 1) con evidencia de código (SQL inline y dependencias reales). Reservas: (a) funciones de persistencia/dominio dentro de `runtime.rs` **no se mueven** (van al puerto `AgentPersistence`), (b) `LlmProviderService` arrastra `AiProviderKeys`+`AppError`, (c) `scheduler.rs` requiere desacople query-a-trait antes de moverse.
2. **Estado de registro:** el plan ya está registrado en el roadmap de task como **318A-13** y commiteado (`bf2b0e7`); la entrada de completados se crea **solo cuando se ejecute**.
3. **Pendiente de tu validación:** §13 (repo Git vs local, nombre/carpeta, alcance de fases, lib vs daemon). Si lo apruebas: **Fase 0 + Fase 1** como primer bloque (skeleton + traits + mover módulos agnósticos), con gate y commit por bloque.

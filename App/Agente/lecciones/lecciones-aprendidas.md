# Lecciones Aprendidas

## 2026-05-11 — El prompt de OpenCode debe preservar el mensaje original de WhatsApp

**Patrón del error:** El chatbot recibía memorias semánticas relevantes y debía crear una acción `solicitar_opencode`, pero el LLM podía poner el bloque de memoria/contexto en `prompt` y dejar fuera la tarea real del usuario. OpenCode obedecía correctamente, pero el bloque `=== TAREA A EJECUTAR ===` contenía contexto en vez de la solicitud.

**Lección:** Cuando una acción delega trabajo a otro agente, el backend no debe confiar en que el LLM transcriba fielmente la intención. La frontera debe preservar el mensaje original como fuente de verdad y dejar cualquier resumen del LLM como contexto secundario.

**Fix:** `AgentChatProcessor::normalizarAccionesDesdeMensajeUsuario()` antepone el texto original de WhatsApp a `solicitar_opencode.prompt`. El scheduler de hábitos también resuelve recordatorios dinámicos en runtime para no depender del texto genérico generado al crearlos.

## 2026-05-11 — WhatsApp no debe ejecutar agentes de codigo directo desde produccion

**Patrón del error:** Un webhook WhatsApp en produccion puede recibir una orden valida, pero el codigo que debe cambiar vive en una PC local y requiere credenciales, Git, OpenCode y permisos de deploy. Intentar que WordPress ejecute eso directamente mezcla fronteras de red, secretos y produccion.

**Lección:** Las solicitudes remotas de codigo necesitan una cola aprobable y un runner local con proyectos whitelisted. El backend guarda intencion, permisos, estado y logs; la PC local ejecuta OpenCode solo para proyectos declarados. Commit/push/deploy deben ser flags explicitos del job.

**Fix:** Base `115A-12`: `opencode.jsonc`, agente `whatsapp-code`, runner `scripts/opencode-whatsapp-runner.mjs`, workflow GitHub y plan para cola `opencode_job`.

## 2026-05-11 — HMAC runner WordPress debe firmar el route REST, no la URL completa

**Patrón del error:** Un runner local puede llamar a `/wp-json/glory/v1/...`, pero WordPress valida internamente `$request->get_route()` como `/glory/v1/...` y sin query string.

**Lección:** Para endpoints HMAC de REST WP, documentar y testear exactamente la base firmada: `timestamp + METHOD + route + body`. Las queries (`?limit=1`) no deben entrar si el servidor no las firma.

**Fix:** `115A-13` implementa firma consistente en `AgentRestHandlers::validarOpencodeRunner()` y `scripts/opencode-whatsapp-runner.mjs`.

## 2026-05-11 — Interfaces PHP deben precargarse antes del barrido recursivo

**Patrón del error:** `AgentResearchService` y `LocalResearchProvider` dependían de `ResearchProviderInterface`, pero el cargador recursivo de `App/` usa `glob` por orden alfabético. PHP evalúa tipos e interfaces implementadas al incluir la clase, así que el archivo de la interfaz podía cargarse después y producir fatal en local.

**Lección:** En proyectos sin autoload PSR-4 puro, cualquier interfaz/trait usada por clases incluidas en un barrido recursivo debe precargarse explícitamente o vivir en un archivo cuyo orden garantice carga anterior. El lint por archivo no detecta este fallo porque cada archivo aislado es sintácticamente válido.

**Fix:** `functions.php` precarga `App/Services/ResearchProviderInterface.php` antes de recorrer `App/`, igual que ya hacía con dependencias de cifrado.

## 2026-05-11 — Plugins simples no deben requerir generador de props manual

**Patrón del error:** Escalador de Imagen estaba registrado como plugin y panel, y al activarlo se actualizaba la visibilidad del layout. Pero `DashboardGrid` rechazaba cualquier panel sin entrada específica en `GENERADORES_PROPS`, aunque el componente solo necesitara `PanelBaseProps`.

**Lección:** En una arquitectura extensible, el registro debe soportar el caso simple por defecto. Un plugin que solo usa `renderHandleArrastre` y `handleMinimizar` no debe obligar a tocar un mapa central adicional. Los mapas específicos son para props especiales, no para permitir render básico.

**Fix:** `generarPropsPanelBase()` y `obtenerGeneradorPropsPanel()` devuelven props base cuando no existe generador específico, dejando `DashboardGrid` compatible con plugins simples.

## 2026-05-10 — Solo ocultar UI no protege plugins admin

**Patrón del error:** Grupos FB podía ocultarse en React, pero los endpoints seguían aceptando usuarios logueados o tokens Bearer sin comprobar `manage_options`. Un panel sensible persistido en localStorage también podía reaparecer si solo se filtraba el menú.

**Lección:** Toda función admin-only necesita tres capas: filtro de registro/visibilidad, guard en render/layout para estado persistido antiguo, y verificación en REST/token. La capa de UI mejora UX; la capa backend es la frontera real de seguridad.

**Fix:** `soloAdmin` en definiciones de plugin/panel, filtros `pluginPuedeMostrarse`/`panelPuedeMostrarse`, y `GruposFbApiController` validando `current_user_can('manage_options')` o `user_can($userId, 'manage_options')`.

## 2026-04-04 — Tareas virtuales contaminan estado real vía drag & drop (044A-12)

**Patrón del error:** `handleReorder` recibe `nuevoOrdenPrincipales` que incluye tareas virtuales de hábitos (IDs negativos de `useHabitosComoTareas`). La lista se pasa a `reordenarTareas` → `setTareas` → localStorage sin filtrar. Cada reorder subsecuente multiplica las copias porque las persistidas aparecen como subtareas del hábito vía `tareas.filter(t => t.habitoId === habito.id)`.

**Lección:** Cuando se combina estado real con datos computados (virtuales) para renderizar, el callback de reorder NO debe persistir los datos computados al store real. En general: todo callback que modifica estado permanente debe filtrar entidades transitorias (IDs negativos, virtuales, computadas). El boundary entre "datos para display" y "datos para persistencia" debe estar explícito.

**Fix:** Filtrar `t.id > 0` en `reordenarTareas`, cleanup `parentId < 0` → undefined, y `dragListener={false}` para hábitos.

## 2026-04-02 — fueCompletadoHoy solo verificaba ultimoCompletado

**Patrón del error:** `fueCompletadoHoy` comparaba solo `ultimoCompletado === obtenerFechaHoy()`. Pero `actualizarHistorialHabito` recalcula `ultimoCompletado` como la última fecha cronológica del historial (`.sort()` + last). Si hay fechas "futuras" en el historial (por cambio de `horaFinDia`), `ultimoCompletado` apunta a una fecha que no es el "hoy" lógico, y el hábito nunca se muestra como completado.

**Lección:** Cuando un campo calculado (`ultimoCompletado`) puede desincronizarse de la fuente de verdad (`historialCompletados`), las funciones de verificación deben consultar AMBOS. Nunca confiar solo en campos derivados para determinar estado actual.

**Fix:** `fueCompletadoHoy(ultimoCompletado, historialCompletados?)` ahora verifica ambos. `actualizarHistorialHabito` prioriza `obtenerFechaHoy()` como `ultimoCompletado` si está en el historial.

## 2026-03-28 — Heatmap no llenaba el 100% del contenedor (5 fallos previos)

**Patrón del error:** Aplicar fixes internos (overflow, min-width, aspect-ratio en celdas) sin analizar la cadena completa container → flexbox → max-width. Todos los intentos previos corregían síntomas dentro del grid, pero el limitante real era `max-width` fijo en las columnas de semana y en las celdas.

**Lección:** Cuando un bug CSS reaparece, rastrear la cadena complete de layout de fuera hacia dentro: contenedor padre → flex/grid → hijo → nieto. El primer punto donde el tamaño se fija o se cap (max-width, fixed width) es probablemente la raíz. No atacar el interior sin verificar que el exterior permite el crecimiento.

## 2026-04-04 — Zustand persist: onRehydrateStorage no persiste mutaciones (044A-24)

**Patrón del error:** `onRehydrateStorage` recibe el state ya mergeado y permite mutarlo, pero las mutaciones directas (ej: `habito.subhabitos = limpiados`) NO disparan `subscribe()`, por lo que el middleware persist no escribe los cambios a localStorage. La limpieza era efímera: funcionaba en memoria pero los datos corruptos reaparecían en cada recarga.

**Lección:** En Zustand persist, `onRehydrateStorage` es solo para efectos secundarios o modificaciones en memoria. Para que los cambios persistan, SIEMPRE usar `useStore.setState()` (disponible vía `setTimeout(() => ..., 0)` para asegurar que el store está inicializado). Nunca mutar state directamente si se espera que persist lo capture.

## 2026-04-04 — Dedup solo en setHabitos no cubre todas las vías (044A-27)

**Patrón del error:** La deduplicación de subhábitos estaba en `setHabitos` y `onRehydrateStorage`, pero `restaurarHabito`, `restaurarHabitos`, `toggleHabito` y todos los `set()` directos del store bypassean la lógica. La dedup por ID (`subIdsVistos`) en `useHabitosComoTareas` no servía porque los 56 duplicados tenían IDs únicos de `Date.now()`.

**Lección:** Cuando un store Zustand tiene lógica de sanitización, NUNCA confiar en que solo se ejecute en un action específico. Agregar un `store.subscribe()` global como safety net que intercepte TODOS los cambios y sanitice. Además, la dedup en la capa de rendering es un safety net visual gratuito — incluso si el store tiene basura, el usuario no la ve. Finalmente, la dedup server-side (PHP) es la última línea de defensa: impide que datos corruptos se persistan en la BD.

**Lección 2:** Cuando se deduplica por ID, considerar que los IDs pueden haber colisionado (ej: `Date.now()` llamado en el mismo milisegundo). La dedup por ID debe distinguir: mismo ID + mismo nombre = duplicado real (descartar) vs mismo ID + nombre diferente = colisión (reasignar nuevo ID). Eliminar ciegamente por ID destruye datos válidos.

**Fix correcto:** Calcular el tamaño de celda dinámicamente en JS basado en el ancho real del contenedor (ResizeObserver) y pasar como CSS variable `--mapa-calor-tamano-celda`. Así el grid siempre llena 100% independientemente del tamaño del contenedor.

## 2026-04-02 — CSS unclosed block no detectado antes de commit (024A-15)

**Patrón del error:** `multi_replace_string_in_file` reemplazó un bloque CSS que incluía el `}` de cierre en el `oldString`, pero el `newString` generado perdió esa llave. Esto dejó un bloque CSS abierto (`configBarraInferiorItem--fijado {` sin `}`). El error NO fue detectado porque `get_errors` solo se ejecutó sobre archivos `.tsx`, nunca sobre los `.css` editados.

**Lección:** La Regla 11 dice "después de editar CUALQUIER archivo: ejecutar get_errors sobre ESE archivo". Cuando `multi_replace_string_in_file` toca N archivos, se debe ejecutar `get_errors` sobre TODOS los N archivos editados, no solo los que parecen más importantes. Los archivos CSS son especialmente vulnerables a errores de sintaxis silenciosos porque ni TypeScript ni el editor los validan tan estrictamente.

**Fix correcto:** Inmediatamente después de cada `multi_replace_string_in_file`, listar TODOS los archivos tocados y pasar la lista completa a `get_errors`. No asumir que "los CSS son simples" y saltarlos.

## 2026-04-02 — Extensión Chrome borra comentarios de Facebook (024A-22)

**Patrón del error:** `link.appendChild(badge)` dentro de un `<a>` gestionado por React de Facebook. React de Facebook reconcilia el DOM periódicamente y al encontrar nodos inesperados dentro de elementos que gestiona, puede eliminar el nodo padre completo o su árbol de hijos, haciendo desaparecer comentarios y contenido. Además, `hideGroupFromPage` ocultaba `[role="article"]` del feed, y dentro de un grupo TODOS los posts tienen el link al grupo → se ocultaban todos.

**Lección:** NUNCA modificar el interior de elementos DOM que otro framework de JS (React, Angular, Vue) gestiona. Usar `insertAdjacentElement` (sibling) en vez de `appendChild` (child). Para ocultar elementos, ser muy conservador con el selector: solo ocultar en contextos seguros (listItems, cards de discover), nunca articles del feed. Suspender MutationObservers durante inyecciones de DOM propias para evitar loops.

## 2026-04-02 — flex:1 no limita altura en panels con alturaDefecto:'auto' (024A-21)

**Patrón del error:** Reemplacé `max-height: 500px` por `flex: 1; min-height: 0` en el contenedor de scroll de la tabla. Esto funciona cuando el padre tiene altura fija (panelAlturaFija), pero el panel usa `alturaDefecto: 'auto'` → el padre crece con el contenido → flex:1 no tiene límite → la tabla se extiende infinitamente.

**Lección:** `flex: 1 + min-height: 0` solo funciona como restricción de altura cuando algún ancestro tiene una altura fija. Con content-based sizing (auto), hay que usar `max-height` explícito.

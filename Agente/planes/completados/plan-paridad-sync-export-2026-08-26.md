# Plan: paridad de sync y export completo (bug reappear + export incompleto)

- **Fecha:** 2026-08-26
- **Estado:** CERRADO 2026-09-02 (verificado; código completo desde 28-08, documentación stale cerrada ahora)
- **Dependencias:** ninguna bloqueante. Headless / sin credenciales externas.
- **Tipo:** corrección de arquitectura + cierre de brecha de export.

## Problema 1 — Las tareas/hábitos reaparecen tras borrar/completar (intermitente)

### Síntomas
- Al borrar una tarea/hábito **o** al marcarla como completada, aparece el toast
  (la acción se aplica en local) pero **después la tarea reaparece** (resucita) o
  se des-completa. Intermitente: "a veces sí, a veces no".
- Persiste desde el legacy WordPress; no es una regresión de esta semana.

### Por qué es intermitente (race condition)
El sync usa dos mecanismos concurrentes:
1. **Guarrado debounced** (2s) por entidad: `PUT /api/tasks|habits/{id}` y, para
   borrados, flush de **tombstones** (`DELETE /api/{entity}/{id}`). Vía
   `useSyncManager` + `useDashboardApi.guardar`.
2. **Refresco desde servidor** con `loadData()` → `GET /api/dashboard`, que hace
   `onDataReceived(serverData)` **sobrescribiendo TODO el estado local**. Se
   dispara cada 30s y en el evento `focus`/`visibilitychange`.

El defecto arquitectónico está en `useSyncManager.refrescarDesdeServidor`
(`frontend/src/app/hooks/dashboard/useSyncManager.ts`):

```ts
if (document.visibilityState !== 'visible' || hasChanges || transportState.isSaving) return;
const serverData = await loadData();
onDataReceived(serverData);   // sobrescribe el estado local sin fusionar borrados
```

La única protección es `hasChanges`. Pero `hasChanges` viene de
`useChangeDetector` (hash JSON entero) y el callback de `setInterval` captura su
valor **en el closure del efecto**. Si un `focus`/interval cae en la ventana en
que `hasChanges` transiciona o en que el save debounced aún no ha confirmado, el
refresh devuelve la fila aún presente en el servidor y la **reescribe en local**,
resucitando la tarea borrada / revirtiendo el completado. Como depende del timing
(30s vs 2s vs foco), es intermitente.

### Fix propuesto (fase 1)
1. **Refresco consciente de tombstones**: al hacer `onDataReceived` desde el
   refresco periódico/foco, descartar cualquier entidad cuyo id esté en el
   registro local de borrados pendientes (`utils/borradosPendientes.ts`). Así,
   aunque el servidor devuelva la fila (por el race), local NO la resucita.
2. **No sobrescribir con datos no confirmados**: bloquear el refresco mientras
   haya un guardado debounced pendiente (mirror de `hasChanges` + un ref de
   "save pendiente"), de modo que un pull nunca pise una edición aún sin subir.
3. Re-usar la fusion para ese `onDataReceived` del refresco (no la del init).

### Verificación (fase 1)
- Suite: assert de regresión que simule el refresh con tombstone presente y
  confirme que la entidad no vuelve al estado local.
- En vivo: borrar una tarea, forzar `focus`/refresh dentro de la ventana y
  comprobar que no reaparece; completar una tarea y forzar el refresco sin que
  se des-complete.

---

## Problema 2 — Exportar no exporta la mayor parte de los datos

### Síntomas
- `exportarDatos` (y por tanto "Exportar datos") solo genera
  `{version, fechaExportacion, habitos, tareas, proyectos, notas}`.
- **No incluye**: recordatorios, notas guardadas (notasStore), grupos de tareas,
  grupos de ejecución, grupos Facebook, ayuno, déficit calórico, time-tracker,
  plugins (estado/activos), configuración de usuario, config IA/panel, ni el
  historial de actividad agregado.
- Importar por tanto no restaura "todo", incumpliendo el requisito de que *"NADA
  se borre / todo perdure entre navegadores y máquinas"*.

### Inventario de dominios persistentes (fuente: `stores/*`, persist en localStorage)
| Store | Persist name | En export actual |
|---|---|---|
| tareas / habitos / proyectos / notas-scratchpad | `dataService` | ✅ (parcial) |
| recordatoriosStore | `glory-recordatorios` | ❌ |
| notasStore (notas guardadas + carpetas) | notasStore | ❌ |
| gruposTareasStore | `grupos-tareas-storage` | ❌ |
| gruposEjecucionStore | `glory_grupos_ejecucion` | ❌ |
| gruposFbStore | `GruposFbStore` | ❌ |
| ayunoStore | `glory-ayuno` | ❌ |
| deficitCaloricoStore | `glory-deficit-calorico` | ❌ |
| timeTrackerStore | `glory-time-tracker` | ❌ |
| pluginsStore | `glory-plugins` | ❌ |
| configuracionUsuarioStore | `glory-config-usuario` | ❌ |
| iaStore | `glory-ia-panel` | ❌ |
| preferencias (layout/órdenes/tema) | `glory-*` | ❌ |

Nota: varios de estos (ayuno, déficit calórico, preferencias/layout) **sí se
sincronizan al servidor** por sus propios endpoints/settings; el problema es que
**el archivo de export/import portátil no los lleva** — migrar a otra máquina o
navegador pierde lo que vivía solo en localStorage.

### Fix propuesto (fase 2)
1. **Ampliar el formato** de `DatosDashboardExportados` (bump version a `2.0.0`)
   con secciones opcionales por dominio: `recordatorios`, `notasGuardadas`
   (+carpetas), `gruposTareas`, `gruposEjecucion`, `gruposFb`, `ayuno`,
   `deficitCalorico`, `timeTracker`, `plugins`, `configuracionUsuario`,
   `configIA`, `preferencias`.
2. **Recolección**: al exportar, leer cada store (via sus getters) y serializarlo.
3. **Validación**: ampliar `validarDatosImportados` para validar (de forma
   tolerante, sin rechazar archivos antiguos v1.1 por faltar secciones) las
   nuevas secciones si vienen.
4. **Import/restore**: al importar, aplicar cada sección al store correspondiente
   (con los setters/métodos de cada store) y luego dejar que el sync suba lo que
   corresponda.
5. **Backwards-compat**: los exports v1.1 (solo los 4 campos) se siguen
   importando sin cambios.

### Verificación (fase 2)
- Round-trip: exportar → importar en un contenedor limpio → comparar cada dominio.
- Suite: asserts de regresión de export/import por sección (al menos recordatorios,
  notas guardadas, grupos de ejecución, ayuno, preferencias).

---

## Alcance / no-alcance
- **Sí**: fix de reappear (tombstones-aware + no-clobber), export/import completo.
- **No**: dominios con credenciales externas (pagos, MCP real, OAuth) — quedan
  degradados como hoy. No tocar la auditoría SOLID en curso ni el refactor de
  otro agente en `components/dashboard/*`.

## Definition of Done
- Bug reappear resuelto (verificado en vivo con foceo de refresh; sin resurrección
  ni des-completado).
- Export/import cubre todos los dominios persistentes; round-trip verificado.
- `tsc --noEmit` limpio; suite `verify-parity.mjs` 100% (asserts nuevos).
- Commit con solo los archivos del plan.

---

## Cierre (verificado 2026-09-02)

Ambas fases estaban implementadas y commiteadas; la deuda era solo documental
(roadmap/plan marcaban "en curso" stale). Evidencia:

- **Fase 1 (reappear) — HECHO**: `useSyncManager.refrescarDesdeServidor` es
  tombstones-aware + no-clobber: guard `guardadoPendienteRef` (no pisa edición en
  debounce), guard `lastModified > lastSync` (no pisa save fallido), re-verificación
  de guards DESPUÉS del fetch, y `aplicarTombstonesAlPayload(serverData)` (no
  resucita filas borradas). Commits: `27cce4d`, `7506156`, `dda873d`, `e041bc6`.
- **Fase 2 (export v2) — HECHO**: `DatosDashboardExportados` v2.0.0 con blob
  `extensiones` (opcional, backwards-compat v1.x) que lleva los 8 stores
  local-only (`CLAVES_EXTENSIONES_LOCAL`: recordatorios, grupos ejecución,
  plugins, time-tracker, config-usuario, grupos-tareas, grupos-FB, panel IA) vía
  `recolectarExtensionesLocal()`/`aplicarExtensionesLocal()`; cableado en
  `useDashboard.ts` (export L184, import L205); validación tolerante. Los dominios
  que el sync por entidad SÍ persigue (ayuno, déficit, preferencias, notas) se
  excluyen del blob por diseño (el servidor es su respaldo). Commit: `ed27b94`.
- **Verificación DoD**: `.freebuff/verify-parity.mjs` **113 pasados / 0 fallados /
  2 omitidos** (proveedor externo) — incluye la suite de regresión de tombstones
  ("borrar no debe reaparecer" 8/8) y el round-trip LWW. `tsc --noEmit` exit 0
  (2026-09-02).
- **Nota 318A-1**: el bug visual de modales de tareas mencionado en el análisis
  era el refactor visual monocromo 318A-1, ya resuelto (31-08-2026); el overlap
  `panelAgenteTarea*` quedó resuelto por el form "Programar tarea" migrado
  (`14f0060`). Sin ítem abierto.
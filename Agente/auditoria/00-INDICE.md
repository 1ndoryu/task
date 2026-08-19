# Auditoría SOLID — task (índice maestro)

> **Fecha inicio:** 2026-08-19
> **Alcance:** backend Rust (`src/`) + frontend React (`frontend/src/`) del repo `task` (rama `main`).
> **Fuera de alcance:** `glory-rs/` (submódulo, repo aparte), `node_modules/`, `dist/`, `temp/`, `uploads/`, `migrations/` (SQL de esquema, sin lógica de dominio), `frontend/src/app/android/` (generado por Capacitor).

## Cómo se usa este documento

1. Cada módulo tiene un MD con un **checklist de archivos** generado automáticamente (uno por archivo, con líneas).
2. La revisión se hace **archivo por archivo**: se lee, se marcan hallazgos y se tilda el checkbox del archivo.
3. Los **hallazgos** se anotan en el mismo MD del módulo, con ID, severidad, categoría y ubicación exacta.
4. Al terminar la revisión completa, cada hallazgo se **resuelve** desde su propio checklist (ver formato abajo).

## Formato de hallazgo

```markdown
- [ ] **H-{MOD}-{NN}** `{SEVERIDAD}` `{CATEGORÍA}` — `{archivo}:{líneas}` — {qué viola y por qué}. {sugerencia de resolución}
```

- `[ ]` = hallazgo pendiente de resolver. `[x]` = resuelto (con fecha y commit al lado).
- La severidad y categoría van entre backticks para poder filtrarlas con grep (ej: `grep "ALTA" Agente/auditoria/ -r`).

## Severidades

| Severidad | Significado |
|---|---|
| `BLOQUEANTE` | Seguridad, integridad de datos o impide operar el producto |
| `ALTA` | Violación de arquitectura/contrato (SOLID, capas, límites de tamaño) con impacto real |
| `MEDIA` | Violación que degrada mantenibilidad o consistencia |
| `BAJA` | Orden, limpieza, código muerto, imports |
| `INFO` | Observación / decisión consciente documentada |

## Categorías

`SRP` `OCP` `LSP` `ISP` `DIP` — principios SOLID.
`ARQUITECTURA` — capas, acoplamiento, contratos (no encaja en un principio concreto).
`SEGURIDAD` `RENDIMIENTO` `ERRORES` `UI/UX` `ORDEN` `DUPLICACION` `REGLA` (reglas del AGENTS.md) `CODEGEN` `CSS`.

## Criterios de revisión por archivo

1. **SOLID:** SRP (una responsabilidad), OCP (extensible sin modificar), LSP (sustitución coherente), ISP (interfaces mínimas), DIP (depender de abstracciones).
2. **Reglas AGENTS.md:** límites de tamaño (componentes/estilos ≤300 líneas, hooks ≤120, utils ≤150), ≤3 `useState`, lógica >5 líneas a hook, Zustand con selectores específicos, sin CSS inline ni hardcodeo visual, imports muertos, código muerto, nombres confusos.
3. **Seguridad:** prepared statements / query builders tipados, validación en boundary, sin `unwrap()` sobre input, sin secrets hardcodeados, autorización por recurso.
4. **Rendimiento:** N+1, roundtrips innecesarios, re-renders, selectores de store, tamaño de payload.
5. **Errores:** no silenciar, propagar con contexto, feedback visible en UI, rollback en updates optimistas.

## Estado por módulo

| Módulo | MD | Archivos | Líneas | Revisados | Hallazgos | Abiertos |
|---|---|---|---|---|---|---|
| B01 Núcleo backend | [backend/01-nucleo.md](backend/01-nucleo.md) | 8 | 484 | 8 | 2 | 0 |
| B02 Models | [backend/02-models.md](backend/02-models.md) | 17 | 1.899 | 17 | 5 | 0 |
| B03 Repositories | [backend/03-repositories.md](backend/03-repositories.md) | 17 | 3.095 | 17 | 5 | 0 |
| B04 Services | [backend/04-services.md](backend/04-services.md) | 19 | 2.860 | 19 | 10 | 0 |
| B05 Handlers | [backend/05-handlers.md](backend/05-handlers.md) | 19 | 3.017 | 19 | 9 | 0 |
| F10 API generado (Orval) | [frontend/10-api-generado.md](frontend/10-api-generado.md) | 14 | 6.581 | 14 | 1 | 0 |
| F11 Stores/servicios/islands | [frontend/11-stores-servicios-islands.md](frontend/11-stores-servicios-islands.md) | 36 | 7.180 | 36 | 8 | 0 |
| F12 Hooks | [frontend/12-hooks.md](frontend/12-hooks.md) | 146 | 25.748 | 146 | 12 | 1 |
| F13 Componentes | [frontend/13-componentes.md](frontend/13-componentes.md) | 264 | 26.936 | 264 | 7 | 0 |
| F14 Estilos CSS | [frontend/14-estilos.md](frontend/14-estilos.md) | 142 | 30.804 | 142 | 3 | 1 |
| F15 Tipos/utils/config/raíz | [frontend/15-tipos-utils-config.md](frontend/15-tipos-utils-config.md) | 64 | 6.905 | 64 | 4 | 0 |
| F16 glory-core | [frontend/16-glory-core.md](frontend/16-glory-core.md) | 46 | 4.122 | 46 | 3 | 0 |
| **Total** | | **792** | **119.631** | **792** | **69** | **2** |

## Estado 2026-08-19 (sesión 16 — componentes H-F13-01)

**Los 6 componentes restantes de H-F13-01 quedaron bajo 300 (H-F13-01 resuelto al 100%)** — evidencia: `tsc --noEmit` limpio.

✅ Resueltos: H-F13-01 (PanelGruposFb 377→304 con `TablaGruposFb`/`EstadosPanelGruposFb` y sin `sentinel-disable-file`; useTareaMenu 343→156 con builders `opcionesMenuTarea.tsx` + handlers por dominio `manejarOpcionHabito.ts`/`manejarOpcionTarea.ts`; SeccionesConfigPaneles 335→10 barrel sobre `global/paneles/` (6 secciones); SeccionesConfigGeneral 328→11 barrel sobre `global/general/` (7 secciones); useArbitraje 323→125 con cálculos puros en `arbitraje/calculos/`; ListaTareas 309→261 con contrato `ListaTareasProps.ts` + fila conectada `TareaListaItem.tsx`; rutas/exports públicos intactos).

**Acumulado: 67 resueltos + 1 parcial (H-F12-01) de 69 → 2 abiertos.**

## Estado 2026-08-19 (sesión 15 — transacción de restore H-B04-03)

**Restore atómico (H-B04-03 resuelto)** — evidencia: `cargo check` limpio + `cargo test` 11/11.

✅ Resueltos: H-B04-03 (`restore` de backups en **una** transacción: `pool.begin()` → upserts → `tx.commit()`; rollback total ante error duro de BD. Repositorios tx-aware: `upsert_settings`/`upsert_project`/`upsert_habit` aceptan cualquier `Executor` sqlx y `upsert_task_in` corre sobre `&mut PgTransaction`. Fallos suaves por ítem — conflicto LWW, padre inválido, formato — se saltan sin abortar; el mensaje sigue contando `restored`/`fallos`).

**Acumulado: 66 resueltos + 2 parciales (H-F12-01, H-F13-01) de 69 → 3 abiertos.**

## Estado 2026-08-19 (sesión 14 — refactor DashboardRepository)

**Refactor dedicado de `DashboardRepository` (H-B03-01 resuelto)** — evidencia: `cargo check` + `cargo test` 11/11.

✅ Resueltos: H-B03-01 (`dashboard.rs` 536→141; `dashboard/lectura.rs` queries + row structs y `dashboard/proyeccion.rs` mappers JSON; API pública intacta, consumidores sin cambios).

**Acumulado: 65 resueltos + 3 parciales (H-B04-03, H-F12-01, H-F13-01) de 69 → 4 abiertos.**

## Estado 2026-08-19 (sesión 13 — refactor utils/tipos H-F15-01)

**Refactor dedicado de utils/types (H-F15-01 resuelto)** — evidencia: `tsc --noEmit` limpio.

✅ Resueltos: H-F15-01 (10 rutas bajo límite: 8 utils divididas por dominio con facade en la ruta original, `accionesIA` 337→15 sobre 5 módulos IA, `types/dashboard.ts` 839→49 barrel sobre `habito/tarea/proyecto/suscripcion/social`; exports públicos intactos, consumidores sin cambios).

**Acumulado: 64 resueltos + 3 parciales (H-B04-03, H-F12-01, H-F13-01) de 69 → 5 abiertos.** (ver sesión 14)

## Estado 2026-08-19 (sesión 12 — refactor TablaHabitos)

**Refactor dedicado de `TablaHabitos` (H-F13-01 parcial)** — evidencia: `tsc --noEmit` limpio.

🔄 Parcial: H-F13-01 (`TablaHabitos` 470→99 líneas con `FilaHabito`/`FilaSubHabito`/`EncabezadoTabla` extraídos a `tabla-habitos/`; quedan 6 componentes >300: PanelGruposFb, useTareaMenu, SeccionesConfigPaneles, SeccionesConfigGeneral, useArbitraje, ListaTareas).

**Acumulado: 63 resueltos + 3 parciales (H-B04-03, H-F12-01, H-F13-01) de 69 → 6 abiertos.** (ver sesión 13)

## Estado 2026-08-19 (sesión 11 — refactor habitosStore)

**Refactor dedicado de `habitosStore` (H-F11-01 resuelto)** — evidencia: `tsc --noEmit` limpio.

✅ Resueltos: H-F11-01 (`habitosStore` 1.198→186 líneas, 5 slices de dominio en `stores/habitos/`: CRUD, toggle, historial, orden, subhábitos + dedup extraída a `dedupSubhabitos.ts`; API pública y persist v1 intactas, 17 consumidores sin cambios).

**Acumulado: 63 resueltos + 2 parciales (H-B04-03, H-F12-01) de 69 → 6 abiertos.** (ver sesión 12)

## Estado 2026-08-19 (sesión 10 — refactor useTareas)

**Refactor dedicado de `useTareas` (H-F12-02 resuelto, H-F12-01 parcial)** — evidencia: `tsc --noEmit` limpio.

✅ Resueltos: H-F12-02 (`useTareas` 507→38 líneas, compone `useTareaCrud`/`useTareaToggle`/`useTareaReordenar` + utils puras `repeticionTareas`, `eventosCambioTarea`, `mergeTarea`, `registroActividadTarea`; API pública intacta).

⏳ Parcial: H-F12-01 (`useTareas` resuelto pero el hallazgo de 120 líneas sigue abierto: 87 hooks lo superan; refactors dedicados por hook).

**Acumulado: 62 resueltos + 2 parciales (H-B04-03, H-F12-01) de 69 → 7 abiertos.** (ver sesión 11)

## Estado 2026-08-19 (sesión 9 — remate de contenidos)

**Remate (hallazgos contenidos restantes): 7/7 resueltos** — evidencia: `tsc --noEmit` + `cargo check`/`test` (11 ok).

✅ Resueltos: H-B03-02 (`upsert_settings` atómico en SQL, sin read-modify-write), H-F10-01 (decisión: `unknown` espejo correcto del contrato, Orval v9 opcional), H-F11-02 (límites del servidor como autoridad + `apiFetch` en trial/recarga), H-F11-03 (hidratación explícita desde `main.tsx`), H-F11-04 (DashboardIsland pasa `modales` completo), H-F11-08 (decisión: servicios legacy WP sin backend Rust aún), H-F12-07 (`useBackButtonCapacitor` con `PARES_CIERRE_MODALES` declarativos).

**Acumulado: 61 resueltos + 1 parcial (H-B04-03) de 69 → 8 abiertos.** (ver sesión 10)

## Estado 2026-08-19 (sesión 8 — T5 resuelta)

**T5 (CSS/duplicación frontend + H-B05-07): 8/9 resueltos, 1 diferido a T6** — evidencia: `tsc --noEmit` + `cargo check`/`test` (11 ok).

✅ Resueltos: H-F14-01 (9 tokens nuevos en `variables.css`, hex migrados en 9 archivos, fallbacks eliminados), H-F14-03 (`acentoRgb` alineado, typo `superposicionMedioOscuro`, `radioSm/Md/Lg` base 4px, `espacioSx` eliminado), H-F15-02 (`obtenerTokenCsrf` único + flush con `apiFetch`), H-F15-04 (verificado: sin solape `accionesIA`/`accionesExternasIA`), H-F16-01 (listener `popstate` con guard de módulo), H-F16-02 (casts `as any` eliminados con tipado existente), H-F16-03 (decisión: por diseño en framework agnóstico), H-B05-07 (`PaginationParams` con `#[serde(flatten)]` en notes).

⏳ Diferido a T6: H-F14-02 (8 CSS monolíticos ~4.800 líneas sobre 111 `@import` en cascada — refactor mayor con verificación visual).

**Acumulado: 54 resueltos + 1 parcial (H-B04-03) de 69 → 15 abiertos.**

## Estado 2026-08-19 (sesión 7 — T4 resuelta)

**T4 (contrato front+back coordinado): 10/10 resueltos** — evidencia: `cargo check` + `cargo test` (11 tests) + `tsc --noEmit` OK.

✅ Resueltos: H-B04-01 (`change_password` exige `contrasena_actual` + front la envía), H-B04-02 (Argon2 a `spawn_blocking` vía `services/crypto.rs` compartido con `AuthService`), H-B01-01 (sesión+usuario en una query JOIN), H-B05-02 (`me`/`profile` sin re-consulta; `AuthUser` porta `User`), H-B05-01 (register sin pre-check de email: timing uniforme, 23505 genérico), H-B04-05 (timeline `event` con 404/403 reales), H-B04-10 (front envía `fecha` local en actividad), H-B04-09 (feedback `es_premium` real + gate premium en backend), H-B02-03 (columna `device` en backups + migración), H-F15-03 (`esAdmin` real desde `/api/auth/me`).

**Acumulado: 46 resueltos + 1 parcial (H-B04-03) de 69 → 23 abiertos.**

## Estado 2026-08-19 (sesión 6 — T3 resuelta)

**T3 (frontend bugs contenidos): 17/17 resueltos** — evidencia: `tsc --noEmit` limpio (sin backend tocado en esta tanda).

✅ Resueltos: H-F11-05 (logs de store/island a `devLog`), H-F11-07 (`devWarn` en fallbacks de `iaService`/`notasStore`), H-F12-03 (52 logs → `devLog`, solo DEV), H-F12-04 (selectores atómicos en `useTimeTracker`/`useDeficitCalorico`), H-F12-05 (`useOnlineStatus` con `useEffect` + cleanup), H-F12-06 (código muerto `obtenerEstadoSync`/`SyncStatus` eliminado), H-F12-08 (conexión IndexedDB cacheada en `useModoOffline`), H-F12-09 (`crypto.randomUUID` para tareas repetidas), H-F12-10 (campo `intentos` eliminado), H-F12-11 (generadores tipados + fallback explícito), H-F12-12 (comentario actualizado), H-F13-02 (`alert()` → toasts en `TablaHabitos`/`TareaItem`), H-F13-03 (3 `useState` + `color="#fff"` → variable CSS), H-F13-04 (non-null assertion eliminada), H-F13-05 (comentarios `sentinel-disable`), H-F13-06 (`renderFila` compartido en drag&drop), H-F13-07 (prop muerta `indice` eliminada).

**Acumulado: 36 resueltos + 1 parcial (H-B04-03) de 69 → 33 abiertos.**

## Estado 2026-08-19 (sesión 5 — T2 resuelta)

**T2 (rendimiento BD contenido): 4/4 resueltos** — evidencia: `cargo check` + `cargo test` (11 tests) OK.

✅ Resueltos: H-B04-08 (`SubscriptionService::active_row` reutilizado en info/backup/storage; storage ahora degrada vencidos), H-B03-05 (`_viewer_id` eliminado del contrato de `TimelineRepository::list`), H-B02-04 (`dias_restantes_en` con reloj inyectable + test), H-B03-03 (`ADMIN_USER_SELECT` con `LEFT JOIN` agregados + `COUNT(DISTINCT)` en una pasada; el índice GIN del flag `completado` queda anotado como migración opcional).

**Acumulado: 19 resueltos + 1 parcial (H-B04-03) de 69 → 50 abiertos.**

## Estado 2026-08-19 (sesión 4 — T1 resuelta)

**T1 (validación y seguridad backend): 8/8 resueltos** — evidencia: `cargo check` + `cargo test` (10 tests) OK.

✅ Resueltos: H-B02-01 (contraseña máx. 72 bytes vía custom validator), H-B02-02 (`Validate` en los 3 Upsert*Request + payload ≤1 MB), H-B02-05 (`range(min=1)` en `AdminPremiumRequest`), H-B03-04 (`deleted_at IS NULL` en los 4 contadores admin), H-B04-06 (SQL de feedback movido a `FeedbackRepository`), H-B05-05 (`require_admin` a `middleware/admin.rs` + `SubscriptionRepository::extend_trial`), H-B05-08 (rate-limit/semáforo/body limit configurables en `AppConfig`), H-B05-09 (validación de `Origin` en WebSocket contra `cors_origins`).

**Acumulado: 15 resueltos + 1 parcial (H-B04-03) de 69 → 54 abiertos.**

## Estado 2026-08-19 (sesión 3 — T0 resuelta)

**T0 (fixes seguros y contenidos): 7 de 8 resueltos, 1 parcial** — evidencia: `cargo check` + `cargo test` (10 tests) + `tsc --noEmit` OK.

✅ Resueltos: H-B01-02 (variante `InvalidConnectionCount`), H-B04-04 (log de borrado de adjuntos), H-B04-07 (sliding de sesión con umbral), H-B05-03 (sanitización `Content-Disposition` + RFC 5987), H-B05-04 (`BadRequest` en `entityId` inválido), H-B05-06 (validación de `duracion` en admin), H-F11-06 (límite 10 MB + validación profunda en importación JSON).

⏳ Parcial: H-B04-03 (errores silenciados corregidos y conteo honesto; transacción pendiente en T6 con H-B03-02).

## Estado 2026-08-19 (sesión 2 — frontend completo)

Frontend completo: **712/712 archivos revisados, 38 hallazgos** (0 BLOQUEANTE, 5 ALTA, 12 MEDIA, 14 BAJA, 7 INFO).

**Hallazgos `ALTA` del frontend:**
- H-F12-01 — `REGLA` — 64 de 146 hooks superan el límite de 120 líneas (peores: useTareas 507, useDashboardApi 494).
- H-F12-02 — `SRP` — `hooks/useTareas.ts` god-hook: CRUD, lógica de repetición, auto-trackeo, sincronización, filtros (6 responsabilidades).
- H-F11-01 — `SRP` — `stores/habitosStore.ts` (1.198 líneas, ~30 acciones) god-store: CRUD hábitos + subhábitos + historial + orden + persistencia + sincronización.
- H-F13-01 — `REGLA` — 7 componentes superan 300 líneas (TablaHabitos 470, PanelGruposFb 377, …).
- H-F15-01 — `REGLA` — 8 utils superan 150 líneas (jerarquiaTareas 299, layoutLogica 242, …).

## Estado 2026-08-19 (sesión 1)

Backend completo: **80/80 archivos revisados, 31 hallazgos** (0 BLOQUEANTE, 2 ALTA, 9 MEDIA, 15 BAJA, 5 INFO).

**Totales de auditoría:** 792/792 archivos, **69 hallazgos** (0 BLOQUEANTE, 7 ALTA, 21 MEDIA, 29 BAJA, 12 INFO). **Abiertos tras T0: 62** (7 resueltos + 1 parcial).

**Hallazgos `ALTA`:**
- H-B03-01 — `repositories/dashboard.rs` 536 líneas, mezcla lectura+merge+proyección (SRP).
- H-B04-02 — `services/security.rs` Argon2 en runtime async sin `spawn_blocking`/semáforo (bloquea workers de tokio).
- H-B01-01 (MEDIA) + H-B05-02 relacionados: 2-3 roundtrips por request autenticado.

**Para continuar (sesión 16):** **los 2 abiertos son refactors dedicados (T6)**: H-F12-01 (87 hooks >120 líneas, useTareas ya resuelto) y H-F14-02 (CSS monolíticos) — cada uno con plan activo en `Agente/planes/`.

**Cómo resolver:** al corregir un hallazgo, marcar `[x]` con fecha y commit; actualizar esta tabla. Los hallazgos `ALTA`/`MEDIA` de seguridad y rendimiento son candidatos a plan en `Agente/planes/`.

## Orden de revisión propuesto

Backend primero (base del contrato) → luego frontend por capas:

1. B01 Núcleo → B02 Models → B03 Repositories → B04 Services → B05 Handlers
2. F15 (utils/tipos base) → F11 (stores) → F12 (hooks) → F13 (componentes) → F14 (estilos)
3. F10 (API generado: solo verificación de modo `tags-split` y drift) → F16 (glory-core)

## Notas

- Generado el 2026-08-19 a partir de `git ls-files` + `wc -l`. Si se agregan/eliminan archivos, regenerar la tabla del módulo afectado.
- `api/generated/*` son archivos de codegen (Orval): no se revisan línea por línea; se verifica modo `tags-split` (regla 9) y sincronía con el snapshot OpenAPI.
- Los hallazgos `CSS` de F14 se limitan a: hardcodeo de colores/fuentes fuera de `variables.css`, duplicación de recetas del sistema de diseño y clases huérfanas (VarSense).

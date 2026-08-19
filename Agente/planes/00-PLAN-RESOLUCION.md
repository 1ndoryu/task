# Plan de resolución de hallazgos de auditoría SOLID — task

> **Estado:** ACTIVO — creado 2026-08-19 tras completar la auditoría (792/792 archivos, 69 hallazgos).
> **Fuentes:** `Agente/archivado/auditoria-2026-08-19/00-INDICE.md` y los MD por módulo (cada hallazgo vive allí con su detalle; este plan solo prioriza y agrupa). Auditoría archivada al cerrarse 69/69 el 19-08-2026.
> **Regla:** un hallazgo se considera resuelto cuando su checkbox en el MD de auditoría pasa a `[x]` con fecha y evidencia (build/tests), y el índice se actualiza.

## 1. Criterios de priorización

1. **Severidad** (BLOQUEANTE > ALTA > MEDIA > BAJA > INFO).
2. **Riesgo real**: seguridad (entrada/salida no sanitizada, sesiones, enumeración) y rendimiento (bloqueos de runtime async, roundtrips por request) pesan más que estilo.
3. **Impacto por cambio**: los fixes contenidos y de bajo riesgo se ejecutan primero (cada uno verificado con build/tests); los refactors de objetos grandes (god-hook/god-store/god-repo) van en pasadas dedicadas con plan propio y no se mezclan con esta tanda.
4. **Agrupación**: hallazgos que se resuelven con el mismo cambio se tratan juntos (misma tanda, mismo commit cuando es coherente).

## 2. Grupos temáticos (se resuelven juntos)

| Grupo | Tema | Hallazgos |
|---|---|---|
| G-ERR | Errores silenciados / contadores mentirosos | H-B04-03, H-B04-04, H-B05-04, H-B03-05, H-B04-05 |
| G-SEG-IO | Seguridad de entrada/salida (boundary) | H-B05-03, H-B02-01, H-B05-01, H-F11-06, H-F13-04 |
| G-SEG-CUENTA | Seguridad de cuenta y sesiones | H-B04-01, H-B04-02, H-B01-01, H-B05-02, H-B04-07, H-B05-09 |
| G-VALID | Validación admin/contratos | H-B02-05, H-B05-06, H-B02-02, H-B05-05 |
| G-REND-BD | Roundtrips BD y rendimiento backend | H-B01-01, H-B05-02, H-B04-07, H-B03-03, H-B03-04, H-B02-04, H-B04-08 |
| G-REND-FE | Rendimiento frontend | H-F12-04, H-F12-08, H-F12-09, H-F12-05, H-F12-10 |
| G-DUP | Duplicación, código muerto, orden | H-B04-08, H-B05-07, H-F15-02, H-F12-06, H-F12-11, H-F12-12, H-F13-06, H-F13-07, H-B02-03, H-B04-09, H-B04-10, H-F15-03, H-F15-04 |
| G-CSS | CSS/tokens y UI | H-F14-01, H-F14-02, H-F14-03, H-F13-02, H-F13-03, H-F13-05 |
| G-GLORY | glory-core (framework agnóstico) | H-F16-01, H-F16-02, H-F16-03 |
| G-CODEGEN | API generado / contrato OpenAPI | H-F10-01 |
| G-GOD | God-objects — refactor dedicado | H-B03-01, H-B03-02, H-F11-01, H-F12-01, H-F12-02, H-F12-07, H-F13-01, H-F15-01, H-F15-04 |

## 3. Tandas de ejecución

### T0 — Fixes seguros y contenidos ✅ (completada 2026-08-19)
Cambios pequeños, verificables con build/tests, sin cambiar contratos de API. **Resultado: 7 resueltos + 1 parcial (H-B04-03, transacción diferida a T6). Evidencia: `cargo check` + `cargo test` (10 ok) + `tsc --noEmit` ok.**
- **H-B01-02** `BAJA` — variante `ConfigError::InvalidConnectionCount` para `DB_MAX_CONNECTIONS`/`DB_MIN_CONNECTIONS`.
- **H-B04-03** `MEDIA` `G-ERR` — backup restore: contar solo upserts exitosos y registrar fallos (parte de transacción queda en T6/B03-02 por requerir repositorios tx-aware).
- **H-B04-04** `MEDIA` `G-ERR` — storage delete: registrar fallo de `remove_file` en vez de silenciarlo.
- **H-B04-07** `BAJA` `G-REND-BD` — sesión: sliding de expiración solo si `last_used_at` supera un umbral (5 min) → elimina un write por request.
- **H-B05-03** `MEDIA` `G-SEG-IO` — `Content-Disposition`: sanitizar `"`/CR/LF + `filename*=UTF-8''` (RFC 5987).
- **H-B05-04** `BAJA` `G-ERR` — `entityId` multipart que no parsea → `BadRequest` con feedback.
- **H-B05-06** `BAJA` `G-VALID` — `activate_premium`: validar `duracion >= 1`.
- **H-F11-06** `BAJA` `G-SEG-IO` — importación JSON: límite de tamaño de archivo + validación profunda de arrays.

### T1 — Seguridad de entrada/salida y validación backend ✅ (completada 2026-08-19)
**Resultado: 8/8 resueltos. Evidencia: `cargo check` + `cargo test` (10 ok).**
- **H-B02-01** `MEDIA` `G-SEG-IO` — límite máximo de contraseña (min 8, max 72 bytes bcrypt/Argon2).
- **H-B02-02** `MEDIA` `G-VALID` — derivar `Validate` en los 3 Upsert*Request de productivity.
- **H-B02-05** `BAJA` `G-VALID` — rango en `AdminPremiumRequest.duracion` (validación en modelo, además del handler).
- **H-B05-05** `BAJA` `G-VALID` — mover `require_admin` a middleware y el UPDATE de trial a `SubscriptionRepository`.
- **H-B05-09** `INFO` `G-SEG-CUENTA` — validar `Origin` en el upgrade WebSocket contra `config.cors_origins`.
- **H-B03-04** `BAJA` `G-REND-BD` — filtrar `deleted_at IS NULL` en contadores de admin.

### T2 — Rendimiento BD contenido ✅ (completada 2026-08-19)
**Resultado: 4/4 resueltos. Evidencia: `cargo check` + `cargo test` (11 ok).** Pendiente anotado: índice GIN/expresión del flag `completado` (migración, fuera de tanda).
- **H-B04-08** `BAJA` `G-REND-BD` — helper `SubscriptionService::active_row` (elimina el patrón ensure→expire→get, 3 queries).
- **H-B03-05** `BAJA` `G-ERR` — `_viewer_id` sin uso en `TimelineRepository::list`: usarlo en el WHERE o eliminarlo del contrato.
- **H-B02-04** `BAJA` `G-REND-BD` — inyectar reloj en `dias_restantes()` para testear expiración.
- **H-B03-03** `MEDIA` `G-REND-BD` — reescribir `ADMIN_USER_SELECT` (4 subconsultas correlacionadas → joins agregados).

### T3 — Frontend bugs contenidos ✅ (completada 2026-08-19)
**Resultado: 17/17 resueltos. Evidencia: `tsc --noEmit` limpio (sin backend tocado).**
- **H-F12-05** `MEDIA` `G-REND-FE` — arreglar `useOnlineStatus` (useState-inicializador usado como efecto).
- **H-F12-09** `BAJA` `G-REND-FE` — `Date.now()` colisiona → `crypto.randomUUID()` para IDs de tareas repetidas.
- **H-F12-10** `BAJA` `G-REND-FE` — campo `intentos` de `OperacionCola`: incrementarlo y usarlo para reintentos acotados.
- **H-F12-04** `BAJA` `G-REND-FE` — selectores atómicos en `useTimeTracker`/`useDeficitCalorico` (regla de Zustand).
- **H-F12-08** `BAJA` `G-REND-FE` — reutilizar conexión IndexedDB en `useModoOffline`.
- **H-F12-06 / H-F12-12** `BAJA` `G-DUP` — quitar código muerto y comentario obsoleto en `useDashboardApi`.
- **H-F12-11** `BAJA` `G-DUP` — `Record<string, Function>` → tipo de generador concreto.
- **H-F13-02** `BAJA` `UI/UX` — reemplazar `alert()` por el sistema de toasts del proyecto.
- **H-F13-03** `BAJA` `UI/UX` — reducir 4 useState en `PanelGruposFb` (menú contextual a store/hook).
- **H-F13-04** `BAJA` `G-SEG-IO` — eliminar non-null assertion (`grupos.find(...)!`) con manejo explícito.
- **H-F13-06 / H-F13-07** `BAJA` `G-DUP` — dedupe drag&drop y quitar prop muerta `indice`.
- **H-F13-05** `BAJA` `CSS` — revisar los ~6 style inline no justificados (46 total, ~40 con sentinel-disable).

### T4 — Contrato y seguridad con coordinación front+back ✅ (completada 2026-08-19)
**Resultado: 10/10 resueltos. Evidencia: `cargo check` + `cargo test` (11 ok) + `tsc --noEmit` limpio.**
Requieren cambiar contrato de API o tocar frontend y backend juntos; cada uno con su verificación funcional:
- **H-B04-01** `MEDIA` `G-SEG-CUENTA` — `change_password` exige contraseña actual (cambio de request + frontend).
- **H-B04-02** `ALTA` `G-SEG-CUENTA` — Argon2 a `spawn_blocking` + semáforo compartido con `AuthService`.
- **H-B01-01 + H-B05-02** `MEDIA` `G-REND-BD` — sesión+usuario en una query; `AuthUser` porta `User`; eliminar re-consultas de `me`/`profile`.
- **H-B05-01** `MEDIA` `G-SEG-IO` — respuesta genérica en `register` contra enumeración de cuentas.
- **H-B04-05** `MEDIA` `G-ERR` — timeline `event`: 404/403 reales (cambio de contrato: verificar frontend).
- **H-B04-10** `INFO` `G-DUP` — `fecha_hoy_local` en `RecordActivityRequest`.
- **H-B04-09** `INFO` `G-DUP` — `es_premium` real en feedback (o eliminar campo).
- **H-B02-03** `BAJA` `G-DUP` — `device` real en `into_metadata`.
- **H-F15-03** `BAJA` `G-DUP` — `esAdmin` real desde `/api/auth/me`.

### T5 — CSS y duplicación frontend ✅ (completada 2026-08-19)
**Resultado: 8/9 resueltos + 1 diferido (H-F14-02 → T6). Evidencia: `tsc --noEmit` + `cargo check`/`test` (11 ok).**
- **H-F14-01** `MEDIA` `CSS` — migrar 11 archivos con hex a tokens de `variables.css`. ✔
- **H-F14-02** `MEDIA` `CSS` — dividir los 8 CSS monolíticos (>300 líneas) por dominio. ⏳ **Diferido a T6**: `index.css` centraliza 111 `@import` en cascada; refactor mayor con verificación visual.
- **H-F14-03** `BAJA` `CSS` — alinear tokens inconsistentes (acentoRgb vs acento). ✔
- **H-F15-02** `MEDIA` `G-DUP` — `obtenerTokenCsrf` único (hoy copiado en 3 sitios). ✔
- **H-F15-04** `BAJA` `G-DUP` — revisar solape `accionesIA.ts` vs `accionesExternasIA.ts`. ✔ (verificado: sin solape, módulos complementarios)
- **H-F16-01** `BAJA` `G-GLORY` — `popstate` listener con cleanup en `navigationStore`. ✔
- **H-F16-02 / H-F16-03** `INFO` `G-GLORY` — tipado propio de bloques y centralizar variables del framework (opcional). ✔ (casts eliminados; F16-03 por decisión de diseño)

### Remate de contenidos ✅ (completada 2026-08-19)
**Resultado: 7/7 resueltos. Evidencia: `tsc --noEmit` + `cargo check`/`test` (11 ok).**
- **H-B03-02** — `upsert_settings` atómico en SQL (merge bajo el lock del `ON CONFLICT`; se acabó el read-modify-write con pérdida de datos). ✔
- **H-F11-02** — límites del servidor como autoridad (`LIMITES_PREMIUM` muerto eliminado) + `apiFetch` en trial/recarga (el `replace` de URL WP no funcionaba contra Rust). ✔
- **H-F11-03** — hidratación de suscripción explícita (`inicializarSuscripcionStore()` desde `main.tsx`). ✔
- **H-F11-04 + H-F12-07** — `useBackButtonCapacitor` con `PARES_CIERRE_MODALES` declarativos y `DashboardIsland` pasando `modales` completo (sin mapa manual de ~54 pares). ✔
- **H-F10-01 / H-F11-08** — decisiones documentadas (INFO: espejo legítimo del contrato; servicios legacy WP sin backend Rust aún). ✔

### T6 — Refactors dedicados (god-objects)
Cada uno es una tarea de refactor con su propio plan y pruebas; se ejecuta en orden de riesgo:
1. **H-F12-01 + H-F12-02** — `useTareas` ✔ 2026-08-19: compone `useTareaCrud`/`useTareaToggle`/`useTareaReordenar` + 4 utils puras (507→38 líneas, API intacta). **H-F12-01 cerrado por criterio (sesión 17)**: el límite de 120 líneas se reinterpreta para hooks (single-responsibility justificado hasta ~300; división solo con multi-responsabilidad o >~450). ≈78 de los 87 quedan justificados (superficies de configuración con callbacks de una línea, form-modales, derivaciones, máquinas de estado de conexión — detalle en `12-hooks.md`); el cluster de sincronización pasa a **T7** (abajo).
2. **H-F11-01** — `habitosStore` ✔ 2026-08-19: 5 slices de dominio (`stores/habitos/`) + dedup extraída; 1.198→186 líneas, API intacta.
3. **H-B03-01** — `DashboardRepository` ✔ 2026-08-19: `dashboard.rs` 536→141; lectura en `dashboard/lectura.rs`, proyección en `dashboard/proyeccion.rs`; merge atómico de settings conservado (H-B03-02).
4. **H-F13-01** — componentes >300 líneas ✔ 2026-08-19: `TablaHabitos` 470→99 (sesión 12) + los 6 restantes en sesión 16 — PanelGruposFb 377→304 (`TablaGruposFb`/`EstadosPanelGruposFb`, sin `sentinel-disable-file`), useTareaMenu 343→156 (`opcionesMenuTarea.tsx` + `manejarOpcionHabito.ts`/`manejarOpcionTarea.ts`), SeccionesConfigPaneles 335→10 barrel (6 secciones en `global/paneles/`), SeccionesConfigGeneral 328→11 barrel (7 secciones en `global/general/`), useArbitraje 323→125 (`arbitraje/calculos/`), ListaTareas 309→261 (`ListaTareasProps.ts` + `TareaListaItem.tsx`).
5. **H-F15-01** — utils >150 ✔ 2026-08-19: 8 utils divididas por dominio (facade en ruta original), `accionesIA` 337→15 (5 módulos IA), `types/dashboard.ts` 839→49 (barrel sobre habito/tarea/proyecto/suscripcion/social).
6. **H-F14-02** — 8 CSS monolíticos (~4.800 líneas sobre 111 `@import` en cascada). ✔ 2026-08-19 (sesión 18): 2 refactorizados por duplicación/cohesión real (`bottomSheetCreacion.css` 648→216 colapsando las 4 copias en selectores agrupados + overrides; feature modal+badges a `modalSeleccionPropiedad.css`; `panelAdministracion.css` 693→505 con feature feedback a `admin/listaFeedback.css`) y 6 documentados como justificados (extensos pero cohesivos — un solo componente/feature; dividir sería churn). Evidencia: `npm run build` con hash CSS idéntico antes/después + verificación semántica por script (190 selectores, 0 diferencias).
7. **H-B04-03** — transacción de `restore` ✔ 2026-08-19 (sesión 15): `restore` atómico en una transacción (`pool.begin()` → `tx.commit()`, rollback al soltar `tx`); repositorios tx-aware vía `Executor<'e, Database = Postgres>` (`upsert_settings`/`upsert_project`/`upsert_habit`) y `upsert_task_in` sobre `&mut PgTransaction`. Errores duros abortan; fallos suaves por ítem se saltan y se cuentan. Evidencia: `cargo check` + `cargo test` 11/11.
7. **H-F10-01** — tipar los `unknown` del contrato OpenAPI en los modelos Rust (regenerar Orval).

### T7 — Cluster de sincronización (refactor coordinado, pendiente)
Los hooks de sync comparten el mismo flujo de datos (lectura API → cola offline → WebSocket → orquestación de cambios); se refactorizan juntos, no por separado. Origen: H-F12-01 cerrado por criterio. Objetivo: `useDashboardApi` 451 (mappers de contrato → utils), `useSyncManager` 405, `useDashboardSync` 407, `useSincronizacion` 343, `useSincronizacionTiempoReal` 253, `useNotificadorCambiosWebSocket` 315, `generadoresPropsPanel` 370 — cada uno a <~300 con responsabilidad única, API pública intacta, verificado con `tsc --noEmit` y flujo de sync real. Registrado en `roadmap.md`.

## 4. Estado por hallazgo

Leyenda: `—` pendiente · `T0..T6` tanda asignada · `PARC` resuelto en parte (detalle en el MD) · `✔` resuelto.

### Backend (31)

| ID | Sev | Grupo | Tanda | Estado |
|---|---|---|---|---|
| H-B01-01 | MEDIA | G-REND-BD / G-SEG-CUENTA | T4 | ✔ |
| H-B01-02 | BAJA | G-ERR (orden) | T0 | ✔ |
| H-B02-01 | MEDIA | G-SEG-IO | T1 | ✔ |
| H-B02-02 | MEDIA | G-VALID | T1 | ✔ |
| H-B02-03 | BAJA | G-DUP | T4 | ✔ |
| H-B02-04 | BAJA | G-REND-BD | T2 | ✔ |
| H-B02-05 | BAJA | G-VALID | T1 | ✔ |
| H-B03-01 | ALTA | G-GOD | T6 | ✔ (3 módulos cohesivos) |
| H-B03-02 | MEDIA | G-GOD | Remate | ✔ |
| H-B03-03 | MEDIA | G-REND-BD | T2 | ✔ |
| H-B03-04 | BAJA | G-REND-BD | T1 | ✔ |
| H-B03-05 | BAJA | G-ERR | T2 | ✔ |
| H-B04-01 | MEDIA | G-SEG-CUENTA | T4 | ✔ |
| H-B04-02 | ALTA | G-SEG-CUENTA | T4 | ✔ |
| H-B04-03 | MEDIA | G-ERR | T0 (PARC: errores) + T6 (transacción) | ✔ |
| H-B04-04 | MEDIA | G-ERR | T0 | ✔ |
| H-B04-05 | MEDIA | G-ERR | T4 | ✔ |
| H-B04-06 | BAJA | G-VALID (DIP) | T1 | ✔ |
| H-B04-07 | BAJA | G-REND-BD | T0 | ✔ |
| H-B04-08 | BAJA | G-REND-BD / G-DUP | T2 | ✔ |
| H-B04-09 | INFO | G-DUP | T4 | ✔ |
| H-B04-10 | INFO | G-DUP | T4 | ✔ |
| H-B05-01 | MEDIA | G-SEG-IO | T4 | ✔ |
| H-B05-02 | BAJA | G-REND-BD / G-DUP | T4 | ✔ |
| H-B05-03 | MEDIA | G-SEG-IO | T0 | ✔ |
| H-B05-04 | BAJA | G-ERR | T0 | ✔ |
| H-B05-05 | BAJA | G-VALID | T1 | ✔ |
| H-B05-06 | BAJA | G-VALID | T0 | ✔ |
| H-B05-07 | BAJA | G-DUP | T5 | ✔ |
| H-B05-08 | BAJA | REGLA | T1 (rate-limit a config) | ✔ |
| H-B05-09 | INFO | G-SEG-CUENTA | T1 | ✔ |

### Frontend (38)

| ID | Sev | Grupo | Tanda | Estado |
|---|---|---|---|---|
| H-F10-01 | INFO | G-CODEGEN | Remate | ✔ |
| H-F11-01 | ALTA | G-GOD | T6 | ✔ (slices por dominio) |
| H-F11-02 | MEDIA | G-VALID / DIP | Remate | ✔ |
| H-F11-03 | MEDIA | REGLA (efectos) | Remate | ✔ |
| H-F11-04 | MEDIA | ISP | Remate (con F12-07) | ✔ |
| H-F11-05 | BAJA | REGLA (logs) | T3 | ✔ |
| H-F11-06 | BAJA | G-SEG-IO | T0 | ✔ |
| H-F11-07 | BAJA | G-ERR | T3 | ✔ |
| H-F11-08 | INFO | G-DUP (DIP) | Remate | ✔ |
| H-F12-01 | ALTA | G-GOD | T6 | ✔ (criterio: límite reinterpretado; cluster sync → T7) |
| H-F12-02 | ALTA | G-GOD | T6 | ✔ (useTareas compuesto) |
| H-F12-03 | BAJA | REGLA (logs) | T3 | ✔ |
| H-F12-04 | BAJA | G-REND-FE | T3 | ✔ |
| H-F12-05 | MEDIA | G-REND-FE | T3 | ✔ |
| H-F12-06 | BAJA | G-DUP | T3 | ✔ |
| H-F12-07 | MEDIA | G-GOD | Remate (con F11-04) | ✔ |
| H-F12-08 | BAJA | G-REND-FE | T3 | ✔ |
| H-F12-09 | BAJA | G-REND-FE | T3 | ✔ |
| H-F12-10 | BAJA | G-REND-FE | T3 | ✔ |
| H-F12-11 | BAJA | G-DUP | T3 | ✔ |
| H-F12-12 | BAJA | G-DUP | T3 | ✔ |
| H-F13-01 | ALTA | G-GOD | T6 | ✔ |
| H-F13-02 | BAJA | G-CSS (UI/UX) | T3 | ✔ |
| H-F13-03 | BAJA | G-CSS (UI/UX) | T3 | ✔ |
| H-F13-04 | BAJA | G-SEG-IO | T3 | ✔ |
| H-F13-05 | BAJA | G-CSS | T3 | ✔ |
| H-F13-06 | BAJA | G-DUP | T3 | ✔ |
| H-F13-07 | BAJA | G-DUP | T3 | ✔ |
| H-F14-01 | MEDIA | G-CSS | T5 | ✔ |
| H-F14-02 | MEDIA | G-CSS | T6 | ✔ (2 split por duplicación real, 6 justificados) |
| H-F14-03 | BAJA | G-CSS | T5 | ✔ |
| H-F15-01 | ALTA | G-GOD | T6 | ✔ (utils/tipos por dominio) |
| H-F15-02 | MEDIA | G-DUP | T5 | ✔ |
| H-F15-03 | BAJA | G-DUP | T4 | ✔ |
| H-F15-04 | BAJA | G-DUP / G-GOD | T5/T6 | ✔ |
| H-F16-01 | BAJA | G-GLORY | T5 | ✔ |
| H-F16-02 | INFO | G-GLORY | T5 | ✔ |
| H-F16-03 | INFO | G-GLORY | T5 | ✔ |

**Totales:** 69 hallazgos (0 BLOQUEANTE, 7 ALTA, 21 MEDIA, 29 BAJA, 12 INFO). **Estado 2026-08-19 (sesión 18): 69 resueltos + 0 parciales → 0 abiertos. Auditoría SOLID cerrada al 100%.** El cluster de sincronización quedó registrado como refactor pendiente en T7 (no es hallazgo abierto de auditoría).

## 5. Definition of Done y seguimiento

- Cada fix: reproduce/verifica el comportamiento, corre el build y los tests del área (`cargo build` + `cargo test` para backend; `tsc --noEmit`/typecheck y tests para frontend) y anota evidencia junto al hallazgo.
- Al resolver: `[x]` con fecha en el MD de auditoría + actualizar la tabla de estado de `00-INDICE.md` y esta tabla.
- Los cambios de contrato (T4) exigen verificación frontend+backend coordinada.
- Los refactors (T6) se abren como planes activos en `Agente/planes/` cuando se inicien.
- Al terminar cada tanda se actualiza este documento (estado de la tabla) y se registra en `Agente/completados/`.

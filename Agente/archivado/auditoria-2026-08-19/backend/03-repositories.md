# Auditoría SOLID — Backend 03: Repositories (17 archivos, 3.095 líneas)

> Criterios: SOLID (SRP por entidad, DIP hacia el pool), reglas AGENTS (SQL preparado, sin N+1, errores no silenciados), seguridad, rendimiento.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | src/repositories/mod.rs | 35 | — |
| 2 | [x] | src/repositories/activity.rs | 317 | — |
| 3 | [x] | src/repositories/admin.rs | 171 | H-B03-03, H-B03-04 |
| 4 | [x] | src/repositories/backup.rs | 103 | — |
| 5 | [x] | src/repositories/collaboration.rs | 289 | — |
| 6 | [x] | src/repositories/dashboard.rs | 536 | H-B03-01, H-B03-02 |
| 7 | [x] | src/repositories/feedback.rs | 68 | — |
| 8 | [x] | src/repositories/habit_history.rs | 112 | — |
| 9 | [x] | src/repositories/note.rs | 228 | — |
| 10 | [x] | src/repositories/notifications.rs | 142 | — |
| 11 | [x] | src/repositories/productivity.rs | 268 | — |
| 12 | [x] | src/repositories/security.rs | 78 | — |
| 13 | [x] | src/repositories/shared.rs | 255 | — |
| 14 | [x] | src/repositories/storage.rs | 99 | — |
| 15 | [x] | src/repositories/subscription.rs | 115 | — |
| 16 | [x] | src/repositories/timeline.rs | 194 | H-B03-05 |
| 17 | [x] | src/repositories/user.rs | 85 | — |

## Hallazgos

### src/repositories/dashboard.rs
- [x] **H-B03-01** `ALTA` `SRP` — `src/repositories/dashboard.rs` (536 líneas, supera todo límite razonable) — un solo repositorio hace 6 cosas distintas: lectura agregada del dashboard (6 queries paralelas), merge de settings con lógica de negocio (COALESCE + merge por clave + fusión de `preferencias`), deduplicación de compartidos, truncado, proyección JSON y cálculo de `latest_update`. La lógica de merge de `upsert_settings` es dominio, no persistencia. **Resolver:** extraer la proyección a un servicio/mapper; el merge de settings debería vivir en el service de dashboard y el repo exponer primitivas atómicas.
  - ✅ Resuelto 2026-08-19 (refactor dedicado): `dashboard.rs` 536→141 con las 6 responsabilidades separadas en 3 módulos cohesivos — `dashboard/lectura.rs` (215: las 6 queries + row structs), `dashboard/proyeccion.rs` (191: mappers JSON + truncado + metadata de compartido) y la facade `DashboardRepository` (141: `read` con dedup/latest_update + `upsert_settings`). API pública intacta (`read`/`upsert_settings`); consumidores (`DashboardService`, `BackupService::restore`) sin cambios. El merge de `upsert_settings` se mantiene atómico en SQL por decisión de H-B03-02 (moverlo al service rompería la atomicidad del ON CONFLICT ya verificada); la proyección sí quedó en mapper propio como pedía el hallazgo. Evidencia: `cargo check` + `cargo test` 11/11.
- [x] **H-B03-02** `MEDIA` `CONSISTENCIA` — `src/repositories/dashboard.rs:70-122` — `upsert_settings` es un read-modify-write no atómico: lee `settings` y reescribe el blob completo con `ON CONFLICT DO UPDATE`. Dos PUT parciales concurrentes (notas + preferencias) se pisan entre sí y **pierden datos** (last-write-wins sobre todo el config). **Resolver:** hacer el merge en SQL (`config = COALESCE(config, '{}'::jsonb) || $2` preservando la clave `preferencias`) o dentro de una transacción con `FOR UPDATE`.
  - ✅ Resuelto 2026-08-19 (remate): `upsert_settings` reescrito como un único statement atómico — `notes = COALESCE($2, …)`, `config = COALESCE(…, $5) || COALESCE($3,'{}') || jsonb_build_object('preferencias', COALESCE($4, …))` bajo el lock de fila del `ON CONFLICT`; se eliminó la lectura previa (un roundtrip menos) y el default de fila nueva se preserva vía `$5`. Evidencia: `cargo check` + `cargo test` (11 ok).

### src/repositories/admin.rs
- [x] **H-B03-03** `MEDIA` `RENDIMIENTO` — `src/repositories/admin.rs:104-118` — `ADMIN_USER_SELECT` ejecuta **4 subconsultas correlacionadas por fila** (habitos, tareas, proyectos, tareas_completadas) y además un `COUNT` separado por página: para N usuarios son 4N+1 consultas. `(t2.payload->>'completado')::boolean` no está indexado. **Resolver:** pasar los contadores a `LEFT JOIN LATERAL`/CTEs con `GROUP BY`, o subconsultas sobre columnas indexadas, y evaluar un índice `GIN`/expresión para el flag de completado.
  - ✅ Resuelto 2026-08-19 (T2): `ADMIN_USER_SELECT` reescrito con `LEFT JOIN` agregados + `COUNT(DISTINCT)` y una sola pasada (mantiene `deleted_at IS NULL`, H-B03-04). Pendiente evaluado: el índice `GIN`/expresión del flag `completado` queda anotado como optimización opcional (es una migración, fuera de la tanda). Evidencia: `cargo check` + `cargo test` (11 ok).
- [x] **H-B03-04** `BAJA` `REGLA` — `src/repositories/admin.rs:104-118` — los contadores de admin **no filtran `deleted_at IS NULL`** (a diferencia de `dashboard.rs` y `activity.rs`): usuarios con tareas/hábitos/proyectos soft-borrados ven conteos inflados. **Resolver:** añadir `AND deleted_at IS NULL` a las cuatro subconsultas.
  - ✅ Resuelto 2026-08-19 (T1): `AND deleted_at IS NULL` añadido a las 4 subconsultas de `ADMIN_USER_SELECT` (habitos, tareas, proyectos, tareas_completadas). Evidencia: `cargo check` + `cargo test` OK.

### src/repositories/timeline.rs
- [x] **H-B03-05** `BAJA` `ORDEN` — `src/repositories/timeline.rs:78-93` — `list` recibe `_viewer_id` y no lo usa: la autorización queda delegada implícitamente al service que resuelve `owner_id`. Parámetro muerto que invita a un futuro bypass si se llama sin el check. **Resolver:** eliminar el parámetro (la autorización ya ocurre antes en el service) o verificar aquí el acceso del viewer.
  - ✅ Resuelto 2026-08-19 (T2): parámetro `_viewer_id` eliminado del contrato de `list` (la autorización ya ocurre en `authorized_owner` del service); si se necesita visibilidad por rol se agrega entonces. Evidencia: `cargo check` + `cargo test` (11 ok).

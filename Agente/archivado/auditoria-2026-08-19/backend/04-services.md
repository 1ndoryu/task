# Auditoría SOLID — Backend 04: Services (19 archivos, 2.860 líneas)

> Criterios: SOLID (SRP, DIP hacia repositories), reglas AGENTS, seguridad (autorización, validación), rendimiento (N+1), errores (propagación con `?`, sin silenciar).
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | src/services/mod.rs | 37 | — |
| 2 | [x] | src/services/activity.rs | 361 | H-B04-10 |
| 3 | [x] | src/services/auth.rs | 115 | — |
| 4 | [x] | src/services/backup.rs | 225 | H-B04-03, H-B04-08 |
| 5 | [x] | src/services/collaboration.rs | 259 | — |
| 6 | [x] | src/services/dashboard.rs | 33 | — |
| 7 | [x] | src/services/feedback.rs | 150 | H-B04-06, H-B04-09 |
| 8 | [x] | src/services/habit_history.rs | 160 | — |
| 9 | [x] | src/services/note.rs | 152 | — |
| 10 | [x] | src/services/notifications.rs | 121 | — |
| 11 | [x] | src/services/productivity.rs | 90 | — |
| 12 | [x] | src/services/rate_limit.rs | 80 | — |
| 13 | [x] | src/services/realtime.rs | 59 | — |
| 14 | [x] | src/services/security.rs | 128 | H-B04-01, H-B04-02 |
| 15 | [x] | src/services/session.rs | 139 | H-B04-07 |
| 16 | [x] | src/services/shared.rs | 304 | — |
| 17 | [x] | src/services/storage.rs | 87 | H-B04-04 |
| 18 | [x] | src/services/subscription.rs | 55 | H-B04-08 |
| 19 | [x] | src/services/timeline.rs | 305 | H-B04-05 |

## Hallazgos

### src/services/security.rs
- [x] **H-B04-01** `MEDIA` `SEGURIDAD` — `src/services/security.rs:60-89` — `change_password` no exige la contraseña actual: con una sesión robada el atacante cambia la clave, expulsa al usuario legítimo (borra todas sus sesiones) y toma la cuenta. **Resolver:** añadir `contrasena_actual` al request y verificarla con `verify_password` antes de actualizar.
  - ✅ Resuelto 2026-08-19 (T4): `ChangePasswordRequest` exige `contrasena_actual` (validada con `validar_contrasena` compartido) y `SecurityService::change_password` la verifica con `crypto::verify_password` antes de actualizar; el front (`useModalPerfil`) la envía. Contrato coordinado. Evidencia: `cargo check` + `cargo test` (11 ok) + `tsc --noEmit`.
- [x] **H-B04-02** `ALTA` `RENDIMIENTO` — `src/services/security.rs:72-76, 119-124` — `change_password` y `mcp_generate` ejecutan **Argon2 sincrónicamente en el runtime async** (bloquea un worker de tokio ~100-300 ms por request) mientras que `auth.rs` usa `spawn_blocking` + semáforo. Concurrencia de estas dos rutas = DoS de workers. **Resolver:** mover el hashing a `spawn_blocking` con el mismo `crypto_semaphore` que `AuthService` (o un helper compartido).
  - ✅ Resuelto 2026-08-19 (T4): nuevo `services/crypto.rs` compartido (`hash_password`/`verify_password` con `spawn_blocking` + semáforo); `AuthService`, `change_password` y `mcp_generate` lo usan (los handlers pasan `state.auth_crypto_semaphore`). Evidencia: `cargo check` + `cargo test` (11 ok).

### src/services/backup.rs
- [x] **H-B04-03** `MEDIA` `ERRORES` — `src/services/backup.rs:150-207` — `restore` usa `let _ = ...upsert...await` (errores silenciados, regla 6) y suma `restored += 1` incluso cuando el upsert falló: el mensaje "Restaurados N elementos" puede mentir. Además no hay transacción: un fallo a mitad deja un estado parcial. **Resolver:** propagar errores con contexto, contar solo éxitos reales y envolver el restore en una transacción.
  - ⏳ Parcial 2026-08-19 (T0): errores silenciados corregidos (`tracing::warn` con contexto) y conteo honesto (solo éxitos; el mensaje avisa si hubo fallos). **Pendiente:** transacción — requiere repositorios tx-aware. Evidencia: `cargo check` + `cargo test` OK.
  - ✅ Resuelto 2026-08-19 (sesión 15): `restore` atómico — todo corre en **una** transacción (`pool.begin()` → `tx.commit()`; rollback automático al soltar `tx` en error). Repositorios tx-aware: `upsert_settings`/`upsert_project`/`upsert_habit` aceptan cualquier `Executor<'e, Database = Postgres>` (pool o transacción) y `upsert_task_in` corre locks+validación+upsert sobre `&mut PgTransaction` sin commit propio. Errores duros de BD abortan el restore completo (rollback, `AppError::Internal` con legacy_id); fallos suaves por ítem (conflicto LWW = datos más nuevos, padre inválido, formato inválido) se saltan y se cuentan sin abortar. Nota sqlx 0.8: `&mut Transaction` ya no implementa `Executor` (solo `&mut PgConnection`), por eso `upsert_task_in` usa `&mut **transaction` y el caller con `Transaction` owned pasa `&mut *tx`. Evidencia: `cargo check` limpio + `cargo test` 11/11.

### src/services/storage.rs
- [x] **H-B04-04** `MEDIA` `ERRORES` — `src/services/storage.rs:82-84` — `let _ = tokio::fs::remove_file(path).await` silencia el fallo de borrado: se elimina el registro en BD aunque el archivo siga en disco → fuga de almacenamiento no detectable. **Resolver:** loguear el error (y devolver `Internal` o marcar el adjunto como huérfano si la política lo permite).
  - ✅ Resuelto 2026-08-19 (T0): fallo de `remove_file` registrado con `tracing::warn` (ruta, adjunto_id, error) — el huérfano queda trazado para limpieza. Evidencia: `cargo check` + `cargo test` OK.

### src/services/timeline.rs
- [x] **H-B04-05** `MEDIA` `ERRORES` — `src/services/timeline.rs:71-76` — `event` devuelve `success:false` cuando no hay owner o acceso, enmascarando 404/403 (inconsistente con `authorized_owner` que sí distingue). El front no puede diferenciar "no pasó nada" de "no tienes permiso". **Resolver:** usar `authorized_owner` como en el resto de métodos y devolver `NotFound`/`Forbidden`.
  - ✅ Resuelto 2026-08-19 (T4): `event` usa `authorized_owner` (404 elemento inexistente, 403 sin acceso); el front ya tolera errores (`registrarEventoSistema` catch → false). Evidencia: `cargo check` + `cargo test` (11 ok) + `tsc --noEmit`.

### src/services/feedback.rs
- [x] **H-B04-06** `BAJA` `ARQUITECTURA` — `src/services/feedback.rs:47-55, 117-126` — SQL inline en el service (límite diario y `admin_list`) en vez de `FeedbackRepository` (DIP). **Resolver:** mover ambas queries al repositorio.
  - ✅ Resuelto 2026-08-19 (T1): `FeedbackRepository::count_since` y `FeedbackRepository::admin_list` (con `AdminFeedbackRow` movida al repositorio); el service solo valida y orquesta. Evidencia: `cargo check` + `cargo test` OK.
- [x] **H-B04-09** `INFO` `REGLA` — `src/services/feedback.rs:66` — `es_premium: false` hardcodeado en `state`: el límite diario aplica igual a premium, contradiciendo el contrato del campo. **Resolver:** calcular `es_premium` real (o eliminar el campo si el límite es global por diseño).
  - ✅ Resuelto 2026-08-19 (T4): contrato coordinado con la UI (que ya trata el feedback como beneficio Premium): `state` calcula `es_premium` real con `SubscriptionService::active_row` y `create` exige premium en el backend (no solo el gate visual); límite diario aplica a quienes pueden enviar. Evidencia: `cargo check` + `cargo test` (11 ok) + `tsc --noEmit`.

### src/services/session.rs
- [x] **H-B04-07** `BAJA` `RENDIMIENTO` — `src/services/session.rs:63-66` — `validate` hace un `UPDATE auth_sessions` (renueva `expires_at` 168 h + `last_used_at`) en **cada request autenticado**: un write por request además de los reads del auth. **Resolver:** actualizar solo si `last_used_at` es más antiguo que un umbral (p.ej. 5 min) o degradar a expiración fija sin sliding.
  - ✅ Resuelto 2026-08-19 (T0): sliding condicionado a `last_used_at` con más de 5 min de antigüedad (constante `SLIDING_UMBRAL_MINUTOS`). Evidencia: `cargo check` + `cargo test` OK.

### src/services/subscription.rs + backup.rs + storage.rs
- [x] **H-B04-08** `BAJA` `DUPLICACION` — patrón `ensure` → `expire_if_due` → `get` repetido en `SubscriptionService::info`, `BackupService::ensure_premium` y `StorageService::is_premium` (3 queries por llamada). **Resolver:** extraer un helper `SubscriptionService::active_row(pool, user_id)` que devuelva la fila ya expirada/actualizada y reutilizarlo.
  - ✅ Resuelto 2026-08-19 (T2): `SubscriptionService::active_row` extraído y reutilizado en `info`, `BackupService::ensure_premium` y `StorageService::is_premium` (una sola lectura). Beneficio extra: storage ahora degrada suscripciones vencidas (antes un premium expirado seguía viendo cuota premium). Evidencia: `cargo check` + `cargo test` (11 ok).

### src/services/activity.rs
- [x] **H-B04-10** `INFO` `ARQUITECTURA` — `src/services/activity.rs:140-141` — `record` usa `Utc::now().date_naive()` (huso del servidor) como fecha por defecto; un usuario en UTC+13 registrando a las 00:30 local cae en el día anterior. Los queries de lectura sí aceptan `fecha_hoy_local`. **Resolver:** aceptar `fecha_hoy_local` en `RecordActivityRequest` como hacen las queries, o documentar la limitación.
  - ✅ Resuelto 2026-08-19 (T4): el front (`actividadService.registrarActividad`) envía siempre `fecha` local del cliente (`obtenerFechaHoy()`); el backend ya la acepta (`RecordActivityRequest.date`). Evidencia: `tsc --noEmit` + `cargo check`/`test` (11 ok).

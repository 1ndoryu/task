# Auditoría SOLID — Backend 05: Handlers (19 archivos, 3.017 líneas)

> Criterios: SOLID (SRP por recurso, ISP de request/response), reglas AGENTS (validación en boundary, errores visibles, autorización), seguridad, rendimiento.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | src/handlers/mod.rs | 393 | H-B05-08 |
| 2 | [x] | src/handlers/activity.rs | 145 | — |
| 3 | [x] | src/handlers/admin.rs | 204 | H-B05-05, H-B05-06 |
| 4 | [x] | src/handlers/auth.rs | 249 | H-B05-01, H-B05-02 |
| 5 | [x] | src/handlers/backup.rs | 82 | — |
| 6 | [x] | src/handlers/collaboration.rs | 145 | — |
| 7 | [x] | src/handlers/dashboard.rs | 59 | — |
| 8 | [x] | src/handlers/feedback.rs | 143 | — |
| 9 | [x] | src/handlers/habit_history.rs | 108 | — |
| 10 | [x] | src/handlers/health.rs | 60 | — |
| 11 | [x] | src/handlers/notes.rs | 286 | H-B05-07 |
| 12 | [x] | src/handlers/notifications.rs | 114 | — |
| 13 | [x] | src/handlers/productivity.rs | 157 | — |
| 14 | [x] | src/handlers/realtime.rs | 89 | H-B05-09 |
| 15 | [x] | src/handlers/security.rs | 118 | — |
| 16 | [x] | src/handlers/shared.rs | 206 | — |
| 17 | [x] | src/handlers/storage.rs | 260 | H-B05-03, H-B05-04 |
| 18 | [x] | src/handlers/subscription.rs | 60 | — |
| 19 | [x] | src/handlers/timeline.rs | 139 | — |

## Hallazgos

### src/handlers/auth.rs
- [x] **H-B05-01** `MEDIA` `SEGURIDAD` — `src/handlers/auth.rs:38-56` + `src/services/auth.rs:29-32` — `register` devuelve `409 "Email ya registrado"`: permite **enumeración de cuentas** (el rate limit de 10/min lo frena, no lo elimina). **Resolver:** devolver el mismo 409/422 genérico tanto si el email existe como si el registro falla, o aplicar un delay uniforme.
  - ✅ Resuelto 2026-08-19 (T4): eliminado el pre-check `find_by_email` en `register`; el hash se calcula siempre (timing uniforme para emails nuevos y existentes) y la unicidad la resuelve la BD (23505 → `Conflict`). El 409/201 es inherente al registro; el mensaje no aporta señal extra. Evidencia: `cargo check` + `cargo test` (11 ok).
- [x] **H-B05-02** `BAJA` `DUPLICACION` — `src/handlers/auth.rs:75-105` — `me` y `profile` son idénticos y ambos re-consultan el usuario que el middleware `AuthUser` acaba de cargar (`UserRepository::find_by_id` en `auth.rs:31`): tercera query redundante por request (ver H-B01-01). **Resolver:** que `AuthUser` porte `User` (o id+nombre+avatar) y eliminar la re-consulta.
  - ✅ Resuelto 2026-08-19 (T4): `AuthUser` porta `User`; `me` y `profile` devuelven `auth.user.into()` sin re-consulta (0 queries extra). Evidencia: `cargo check` + `cargo test` (11 ok).

### src/handlers/storage.rs
- [x] **H-B05-03** `MEDIA` `SEGURIDAD` — `src/handlers/storage.rs:246-252` — el `filename` viene del cliente y se interpola en `Content-Disposition` sin sanitizar (`format!("inline; filename=\"{}\"", row.nombre)`): un nombre con `\r\n` o `"` permite inyección de headers o **panic** del `.expect("respuesta de descarga válida")` (HeaderValue::from_str falla → pánico → 500). **Resolver:** sanitizar (quitar `"`, CR/LF) y codificar con `filename*=UTF-8''...` (RFC 5987).
  - ✅ Resuelto 2026-08-19 (T0): nombre acotado a 255 bytes, fallback quoted-string sanitizado (sin `"`, `\\`, CR/LF ni controles) + `filename*=UTF-8''` percent-encoded (RFC 5987); `HeaderValue` construido con `from_str` y error mapeado (sin pánico). Evidencia: `cargo check` + `cargo test` OK.
- [x] **H-B05-04** `BAJA` `ERRORES` — `src/handlers/storage.rs:154` — `entity_id = text.trim().parse::<i64>().ok()` silencia el parseo fallido: un `entityId` inválido se convierte en `None` sin feedback. **Resolver:** devolver `BadRequest` cuando el campo viene pero no parsea.
  - ✅ Resuelto 2026-08-19 (T0): `entityId` presente pero no numérico → `BadRequest` con el valor recibido. Evidencia: `cargo check` + `cargo test` OK.

### src/handlers/admin.rs
- [x] **H-B05-05** `BAJA` `ARQUITECTURA` — `src/handlers/admin.rs:158-165` — `extend_trial` ejecuta SQL raw directamente en el handler (fuera de repositorio/servicio) y `require_admin` vive importado desde `handlers::feedback` (guard de admin en el módulo equivocado). **Resolver:** mover `require_admin` a `middleware` (o service) y el UPDATE de trial a `SubscriptionRepository`/service.
  - ✅ Resuelto 2026-08-19 (T1): `require_admin` movido a `src/middleware/admin.rs` (re-exportado por `middleware/mod.rs`; feedback y admin lo importan de ahí) y el UPDATE de trial extraído a `SubscriptionRepository::extend_trial`. Evidencia: `cargo check` + `cargo test` OK.
- [x] **H-B05-06** `BAJA` `VALIDACIÓN` — `src/handlers/admin.rs:115-117` — `activate_premium` acepta `duracion` negativa o 0 (expiracion en el pasado). **Resolver:** validar `duracion >= 1` (o tratar `None` como indefinido).
  - ✅ Resuelto 2026-08-19 (T0): `duracion` presente pero `< 1` → `Validation` (días positivos). Evidencia: `cargo check` + `cargo test` OK.

### src/handlers/notes.rs
- [x] **H-B05-07** `BAJA` `DUPLICACION` — `src/handlers/notes.rs:42-54, 91-100` — `NoteListQuery` + `default_page`/`default_per_page` duplican `PaginationParams` de `models/note.rs`. **Resolver:** reutilizar `PaginationParams` (con `folder_id`/`search` como extensión) o un tipo compartido.
  - ✅ Resuelto 2026-08-19 (T5): `NoteListQuery` embebe `PaginationParams` con `#[serde(flatten)]` (defaults y validación heredadas); el handler lee `params.paginacion.page/per_page`. Evidencia: `cargo check` + `cargo test` (11 ok).

### src/handlers/mod.rs
- [x] **H-B05-08** `BAJA` `REGLA` — `src/handlers/mod.rs` (393 líneas) — el router+OpenAPI excede el límite de 300 líneas y los valores del rate limiter (10 req/min, semáforo 4, body 6 MB) están **hardcodeados** en vez de en `AppConfig`. El bloque OpenAPI es declarativo (justificable con `sentinel-disable-file` si se conserva), pero los límites operativos deberían ser configurables. **Resolver:** mover rate-limit/semáforo a `config/mod.rs`.
  - ✅ Resuelto 2026-08-19 (T1): `AppConfig.auth_rate_limit_per_minute` (default 10), `auth_crypto_semaphore_permits` (4) y `max_body_bytes` (6 MB) vía env (`AUTH_RATE_LIMIT_PER_MINUTE`, `AUTH_CRYPTO_SEMAPHORE_PERMITS`, `MAX_BODY_BYTES`) con variante `InvalidConfigValue`; `create_router` los usa. El bloque OpenAPI declarativo se conserva. Evidencia: `cargo check` + `cargo test` OK.

### src/handlers/realtime.rs
- [x] **H-B05-09** `INFO` `SEGURIDAD` — `src/handlers/realtime.rs:25-48` — el upgrade WebSocket autentica por cookie pero **no valida el header `Origin`**: SameSite=Lax mitiga el CSWSH en navegadores modernos, pero conviene validar contra `config.cors_origins` como hardening. **Resolver:** verificar `Origin` en `ws_handler`.
  - ✅ Resuelto 2026-08-19 (T1): `AppState.cors_origins` (poblada desde `config.cors_origins`) y chequeo de `Origin` en `ws_handler` — si el header viene y no está en la lista → 403; sin header (cliente no-navegador) se permite. Evidencia: `cargo check` + `cargo test` OK.

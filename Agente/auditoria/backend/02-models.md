# Auditoría SOLID — Backend 02: Models (17 archivos, 1.899 líneas)

> Criterios: SOLID (especialmente SRP/ISP), reglas AGENTS, seguridad (validación en boundary), errores, orden.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | src/models/mod.rs | 47 | — |
| 2 | [x] | src/models/activity.rs | 185 | — |
| 3 | [x] | src/models/admin.rs | 91 | H-B02-05 |
| 4 | [x] | src/models/backup.rs | 73 | H-B02-03 |
| 5 | [x] | src/models/collaboration.rs | 83 | — |
| 6 | [x] | src/models/dashboard.rs | 103 | — |
| 7 | [x] | src/models/feedback.rs | 84 | — |
| 8 | [x] | src/models/habit_history.rs | 70 | — |
| 9 | [x] | src/models/note.rs | 94 | — |
| 10 | [x] | src/models/notifications.rs | 89 | — |
| 11 | [x] | src/models/productivity.rs | 246 | H-B02-02 |
| 12 | [x] | src/models/security.rs | 98 | — |
| 13 | [x] | src/models/shared.rs | 140 | — |
| 14 | [x] | src/models/storage.rs | 137 | — |
| 15 | [x] | src/models/subscription.rs | 147 | H-B02-04 |
| 16 | [x] | src/models/timeline.rs | 138 | — |
| 17 | [x] | src/models/user.rs | 74 | H-B02-01 |

## Hallazgos

### src/models/user.rs
- [x] **H-B02-01** `BAJA` `SEGURIDAD` — `src/models/user.rs:39-49` — `RegisterRequest.password` y `LoginRequest.password` tienen `min = 8` pero **sin límite máximo**: el coste del hash (argon2/bcrypt) crece con la entrada y un password de megabytes es un vector de DoS acotado. **Resolver:** añadir `length(max = 256, ...)` a ambos campos.
  - ✅ Resuelto 2026-08-19 (T1): `validar_contrasena` (custom validator, límite de **72 bytes**) aplicada a `RegisterRequest.password` y `LoginRequest.password` — el límite en bytes respeta el máximo recomendado por argon2 (PHC). Evidencia: `cargo check` + `cargo test` OK.

### src/models/productivity.rs
- [x] **H-B02-02** `BAJA` `VALIDACIÓN` — `src/models/productivity.rs:16-140` — `UpsertProjectRequest`, `UpsertTaskRequest` y `UpsertHabitRequest` **no derivan `Validate`**: `texto`/`nombre` sin límite de longitud y `payload` (JSONB) sin tope de tamaño. El front es el escritor legítimo, pero el endpoint queda abierto a payloads arbitrarios. **Resolver:** derivar `Validate` con `length(max = ...)` en los campos tipados y acotar el tamaño del payload (p.ej. rechazar >1 MB) en el handler o servicio.
  - ✅ Resuelto 2026-08-19 (T1): los 3 request derivan `Validate` (`nombre` ≤120, `texto` ≤1000) + `validar_payload` (custom, tope 1 MB del JSONB); los 3 handlers de productivity llaman `req.validate()`. Evidencia: `cargo check` + `cargo test` OK.

### src/models/backup.rs
- [x] **H-B02-03** `BAJA` `ORDEN` — `src/models/backup.rs:29-38` — `BackupRow::into_metadata` hardcodea `device: "this-device"` aunque `CreateBackupRequest.device` es `Option<String>`: el dispositivo del cliente nunca se persiste ni se refleja. **Resolver:** persistir `device` en la tabla (columna nueva o dentro de `datos`) y usarlo en `into_metadata`.
  - ✅ Resuelto 2026-08-19 (T4): migración `20260827000000_backup_device` (columna `device TEXT NOT NULL DEFAULT 'unknown'`), `BackupRow.device` persistido en create/list/get y reflejado en `into_metadata`; el servicio normaliza `req.device`. Evidencia: `cargo check` + `cargo test` (11 ok).

### src/models/subscription.rs
- [x] **H-B02-04** `INFO` `ARQUITECTURA` — `src/models/subscription.rs:102-112` — `dias_restantes()` llama a `Utc::now()` internamente, lo que dificulta testear estados de expiración sin reloj simulado. **Resolver (opcional):** aceptar `now: DateTime<Utc>` como parámetro.
  - ✅ Resuelto 2026-08-19 (T2): `dias_restantes_en(ahora: DateTime<Utc>)` con reloj inyectable; `dias_restantes()` delega en `Utc::now()`. Test `dias_restantes_usa_el_reloj_inyectado` añadido (11 tests OK).

### src/models/admin.rs
- [x] **H-B02-05** `INFO` `VALIDACIÓN` — `src/models/admin.rs:56-64` — `AdminPremiumRequest.duracion: Option<i64>` sin rango: un valor negativo activaría premium con expiración en el pasado. Verificar en `services/admin` si se valida; si no, añadir `#[validate(range(min = 0))]`.
  - ✅ Resuelto 2026-08-19 (T1): `#[validate(range(min = 1))]` en el modelo + `req.validate()` en `activate_premium` (consolidado con H-B05-06). Evidencia: `cargo check` + `cargo test` OK.

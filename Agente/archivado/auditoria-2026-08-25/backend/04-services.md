# Auditoría SOLID — task — Services (checklist archivos)

> Módulo: `B04` · Revisar archivo por archivo y anotar violaciones (SOLID, reglas, rendimiento, seguridad, errores) con formato `- [ ] **H-B04-NN** `SEV` `CAT` — `archivo:líneas` — qué viola y por qué`. Tildar el checkbox al terminar la revisión del archivo.

| # | Rev | Archivo | Líneas | Hallazgos |
|---|---|---|---|---|
| 1 | [x] | `src/services/activity.rs` | 361 | — |
| 2 | [x] | `src/services/auth.rs` | 71 | — |
| 3 | [x] | `src/services/backup.rs` | 303 | — |
| 4 | [x] | `src/services/collaboration.rs` | 259 | — |
| 5 | [x] | `src/services/crypto.rs` | 57 | — |
| 6 | [x] | `src/services/dashboard.rs` | 33 | — |
| 7 | [x] | `src/services/feedback.rs` | 123 | — |
| 8 | [x] | `src/services/habit_history.rs` | 160 | — |
| 9 | [x] | `src/services/mod.rs` | 38 | — |
| 10 | [x] | `src/services/note.rs` | 152 | — |
| 11 | [x] | `src/services/notifications.rs` | 121 | — |
| 12 | [x] | `src/services/productivity.rs` | 90 | — |
| 13 | [x] | `src/services/rate_limit.rs` | 80 | — |
| 14 | [x] | `src/services/realtime.rs` | 59 | — |
| 15 | [x] | `src/services/security.rs` | 138 | — |
| 16 | [x] | `src/services/session.rs` | 223 | — |
| 17 | [x] | `src/services/shared.rs` | 304 | — |
| 18 | [x] | `src/services/storage.rs` | 101 | — |
| 19 | [x] | `src/services/subscription.rs` | 63 | — |
| 20 | [x] | `src/services/timeline.rs` | 296 | — |

## Hallazgos

- **B04 sin hallazgos nuevos (2026-08-25):** los 20 services están totalmente curados por la pasada previa — Argon2 con `spawn_blocking` + semáforo compartido en `crypto.rs` (H-B04-02), `SubscriptionService::active_row` consolidado (H-B04-08), restore atómico en una transacción (H-B04-03), `change_password` exigiendo actual + invalidación de sesiones (H-B04-01), feedback con gate premium real (H-B04-09), no-silent-errors con `tracing::warn` en borrado de adjuntos/notificaciones (H-B04-04), registro sin pre-check de email y timing uniforme (H-B05-01). Nota leve: `realtime.rs` usa `expect("hub lock")` sobre un `Mutex` interno sin input externo — patrón aceptable para el hub, no requiere cambio.

<!-- Anotar aquí los hallazgos con formato H-MOD-NN. -->


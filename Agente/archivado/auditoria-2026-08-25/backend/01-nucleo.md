# Auditoría SOLID — task — Nucleo backend (checklist archivos)

> Módulo: `B01` · Revisar archivo por archivo y anotar violaciones (SOLID, reglas, rendimiento, seguridad, errores) con formato `- [ ] **H-B01-NN** `SEV` `CAT` — `archivo:líneas` — qué viola y por qué`. Tildar el checkbox al terminar la revisión del archivo.

| # | Rev | Archivo | Líneas | Hallazgos |
|---|---|---|---|---|
| 1 | [x] | `src/bin/export-openapi.rs` | 7 | — |
| 2 | [x] | `src/config/mod.rs` | 182 | — |
| 3 | [x] | `src/errors/mod.rs` | 123 | — |
| 4 | [x] | `src/lib.rs` | 33 | — |
| 5 | [x] | `src/main.rs` | 59 | — |

## Hallazgos

- **B01 sin hallazgos nuevos (2026-08-25):** los 5 archivos del núcleo están limpios y ya reflejan los fixes de la auditoría previa (`AppConfig` con límites operativos configurables y validación `cookié_secure`; `AppError` con manejo global y `tracing::error!` sin filtrar datos sensibles — hay test que verifica que `ServiceUnavailable` no expone el password; `main.rs` con pool acotado, migración y limpieza de sesiones en background; `lib.rs` con `AppState` mínimo).

<!-- Anotar aquí los hallazgos con formato H-MOD-NN. -->


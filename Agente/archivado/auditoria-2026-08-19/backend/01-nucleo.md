# Auditoría SOLID — Backend 01: Núcleo (8 archivos, 484 líneas)

> Criterios: SOLID, reglas AGENTS (1-23), seguridad, rendimiento, errores no silenciados, orden.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | src/main.rs | 59 | — |
| 2 | [x] | src/lib.rs | 30 | — |
| 3 | [x] | src/bin/export-openapi.rs | 7 | — |
| 4 | [x] | src/config/mod.rs | 146 | H-B01-02 |
| 5 | [x] | src/errors/mod.rs | 123 | — |
| 6 | [x] | src/middleware/mod.rs | 4 | — |
| 7 | [x] | src/middleware/auth.rs | 74 | H-B01-01 |
| 8 | [x] | src/middleware/rate_limit.rs | 41 | — |

## Hallazgos

### src/middleware/auth.rs
- [x] **H-B01-01** `MEDIA` `RENDIMIENTO` — `src/middleware/auth.rs:24-46` — cada request autenticado hace **2 roundtrips a BD** (`SessionService::validate` + `UserRepository::find_by_id`) y las mutaciones añaden un tercero (`validate_csrf`). Con la sesión ya validada, `find_by_id` es redundante si la query de sesión devuelve `user_id` y estado del usuario en un solo join/CTE; el CSRF podría validarse con la misma lectura. En endpoints calientes (dashboard, listas) esto duplica/multiplica la carga. **Resolver:** fusionar sesión+usuario en una sola query (p.ej. `SessionService::validate` que devuelva `(session, user)` vía JOIN) y validar CSRF contra el token ya cargado.
  - ✅ Resuelto 2026-08-19 (T4): `SessionService::validate_with_user` (JOIN auth_sessions × users en una query) usada por el middleware; `AuthUser` porta `User`. El CSRF (mutaciones) conserva su query: tercer roundtrip solo en writes, como estaba. Evidencia: `cargo check` + `cargo test` (11 ok).

### src/config/mod.rs
- [x] **H-B01-02** `BAJA` `ORDEN` — `src/config/mod.rs:88-99` — los errores de parseo de `DB_MAX_CONNECTIONS`/`DB_MIN_CONNECTIONS` se mapean con `ConfigError::InvalidPort` (variante semánticamente incorrecta: no es un puerto). **Resolver:** añadir `InvalidConnectionCount(String)` y usarlo en ambos campos.
  - ✅ Resuelto 2026-08-19 (T0): variante `InvalidConnectionCount(String)` añadida y usada en ambos campos. Evidencia: `cargo check` + `cargo test` OK.

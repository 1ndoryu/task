# Auditoría SOLID — task — Repositories (checklist archivos)

> Módulo: `B03` · Revisar archivo por archivo y anotar violaciones (SOLID, reglas, rendimiento, seguridad, errores) con formato `- [ ] **H-B03-NN** `SEV` `CAT` — `archivo:líneas` — qué viola y por qué`. Tildar el checkbox al terminar la revisión del archivo.

| # | Rev | Archivo | Líneas | Hallazgos |
|---|---|---|---|---|
| 1 | [x] | `src/repositories/activity.rs` | 317 | — |
| 2 | [x] | `src/repositories/admin.rs` | 188 | — |
| 3 | [x] | `src/repositories/backup.rs` | 105 | — |
| 4 | [x] | `src/repositories/collaboration.rs` | 289 | — |
| 5 | [x] | `src/repositories/dashboard.rs` | 146 | — |
| 6 | [x] | `src/repositories/dashboard/lectura.rs` | 215 | — |
| 7 | [x] | `src/repositories/dashboard/proyeccion.rs` | 191 | — |
| 8 | [x] | `src/repositories/feedback.rs` | 133 | — |
| 9 | [x] | `src/repositories/habit_history.rs` | 112 | — |
| 10 | [x] | `src/repositories/mod.rs` | 35 | — |
| 11 | [x] | `src/repositories/note.rs` | 228 | — |
| 12 | [x] | `src/repositories/notifications.rs` | 142 | — |
| 13 | [x] | `src/repositories/productivity.rs` | 295 | — |
| 14 | [x] | `src/repositories/security.rs` | 78 | — |
| 15 | [x] | `src/repositories/shared.rs` | 255 | — |
| 16 | [x] | `src/repositories/storage.rs` | 99 | — |
| 17 | [x] | `src/repositories/subscription.rs` | 135 | — |
| 18 | [x] | `src/repositories/timeline.rs` | 197 | — |
| 19 | [x] | `src/repositories/user.rs` | 85 | — |

## Hallazgos

- [x] **H-B03-06** `BAJA` `ORDEN` — `src/repositories/admin.rs:35-40` — `busqueda` se interpola como `%busqueda%` en ILIKE **sin escapar wildcards** (`%`, `_`), inconsistente con `note.rs` que sí usa `escape_like_literal`. No es inyección (va por bind), pero el usuario que busque `%` o `_` los ve como comodín global. Sugerencia: promover `escape_like_literal` (hoy privado en `note.rs`) a un util compartido `repositories/escape.rs` y reutilizarlo en ambos. ✅ Resuelto 2026-08-25: creado `src/repositories/escape.rs` con `escape_like_literal`, registrado en `repositories/mod.rs`, reutilizado en `note.rs` (eliminada copia privada + test local movido) y aplicado en `admin.rs:list_users` (`format!("%{}%", escape_like_literal(&busqueda))`). 11/11 tests OK.
- [x] **H-B03-07** `BAJA` `PATRON` — `src/repositories/{shared,notes,timeline}.rs` — patrón recurrente de SQL dinámico con `format!` + whitelist de tablas (`table_for`/`match item_type` → tabla fija). Hoy seguro por construcción (valores hardcodeados por el desarrollador, nunca input del request), pero frágil: una futura rama que interpole input del request introduciría inyección. Referencia: `P-03` en `00-PATRONES.md`. Verificación defensiva recomendada. ✅ Resuelto 2026-08-25: añadidas notas de invariante en `shared.rs` en los `format!` que interpolan `table`/columna desde `match item_type`/whitelist cerradas, documentando que el valor nunca proviene del request (defensa mínima, sin sobre-ingeniería). La whitelist en sí es segura por construcción.

<!-- Anotar aquí los hallazgos con formato H-MOD-NN. -->


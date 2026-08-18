# Contrato canónico de notas y carpetas

**Estado:** implementado localmente; CRUD de carpetas, búsqueda, renombrado/movimiento y edición básica de notas están conectados al panel React y verificados por HTTP contra PostgreSQL temporal. La matriz completa de permisos, conflictos y rendimiento sigue pendiente.
**Fecha:** 2026-08-11

## Rutas

| Método | Ruta | Auth | CSRF | Semántica |
|---|---|---|---|---|
| GET | `/api/notes` | cookie | no | Lista paginada; acepta `page`, `per_page`, `folder_id` y `search` (máximo 100 caracteres). Devuelve `404` si la carpeta no pertenece al usuario. |
| POST | `/api/notes` | cookie | sí | Crea una nota; `folder_id` debe pertenecer al usuario. |
| GET | `/api/notes/folders` | cookie | no | Lista carpetas propias ordenadas por nombre. |
| POST | `/api/notes/folders` | cookie | sí | Crea una carpeta con nombre único por usuario. |
| PUT | `/api/notes/folders/{id}` | cookie | sí | Renombra únicamente una carpeta propia. |
| DELETE | `/api/notes/folders/{id}` | cookie | sí | Elimina la carpeta y deja sus notas sin carpeta. |
| PUT | `/api/notes/{id}/folder` | cookie | sí | Mueve una nota propia; `null` devuelve la nota a General. |

## Invariantes

- Todas las consultas filtran por `user_id`; conocer un UUID ajeno no concede acceso.
- Una carpeta inexistente o ajena devuelve `404`, no crea una relación implícita.
- `UNIQUE (user_id, name)` evita duplicados de carpeta dentro del mismo usuario.
- La eliminación usa `ON DELETE SET NULL`; no elimina notas ni contenido.
- La búsqueda usa parámetros SQL, es literal (los caracteres `\\`, `%` y `_` no se interpretan como comodines) y está limitada por la paginación existente (`per_page` máximo 100).
- `search` tiene máximo 100 caracteres y las columnas buscadas tienen índices trigram para evitar un escaneo no acotado cuando el volumen crezca.
- Los nombres duplicados se traducen a `409 Conflict`, no a un error interno de PostgreSQL.
- El contrato Rust usa UUIDs y JSON canónico; la compatibilidad con los IDs enteros y envelopes de WordPress requiere fixtures específicos y queda fuera de este bloque.

## Evidencia y límite

### Evidencia ejecutada

`cargo fmt --check`, `cargo check`, Clippy estricto, 9 tests unitarios, exportación/normalización OpenAPI, `npm run codegen`, type-check y build frontend pasan. Contra PostgreSQL temporal se verificaron creación/listado/filtrado/eliminación de carpeta, renombrado de carpeta, creación/edición/movimiento de nota y conservación de la nota al eliminar su carpeta. La prueba del slice React pasó: dos carpetas `201`, renombrado `200`, nota `201`, movimiento `200`, filtro por carpeta `total=1` y búsqueda literal `Needle_%` `total=1`.

### Cobertura pendiente

La matriz completa de ownership, `ON DELETE SET NULL`, duplicados, búsqueda literal, paginación y rendimiento requiere casos adicionales contra PostgreSQL temporal con `DATABASE_URL` reproducible.

La prevención obligatoria restante es competir entre eliminar/asignar una carpeta (nunca `500`) y ejecutar `EXPLAIN (ANALYZE, BUFFERS)` sobre búsquedas con un corpus representativo. Ownership entre usuarios, búsqueda literal con `%` y `_`, carpeta inexistente, duplicados, `ON DELETE SET NULL` y preservación de notas ya están automatizados en el preflight reproducible, cuyo destino remoto queda bloqueado por guardia salvo doble confirmación explícita.

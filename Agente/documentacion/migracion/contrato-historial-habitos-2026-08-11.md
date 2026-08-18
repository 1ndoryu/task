# Contrato canónico de historial de hábitos

**Estado:** implementado y probado localmente contra PostgreSQL temporal.
**Fecha:** 2026-08-11

## Rutas

| Método | Ruta | Auth | CSRF | Semántica |
|---|---|---|---|---|
| GET | `/api/habits/{legacy_id}/history?days=30` | cookie | no | Devuelve registros, resumen de 7 días y estadísticas; `days` está limitado a 1–365. |
| PUT | `/api/habits/{legacy_id}/history` | cookie | sí | Upsert idempotente por usuario, hábito y fecha. |
| DELETE | `/api/habits/{legacy_id}/history/{date}` | cookie | sí | Elimina la marca de forma idempotente; si ya no existe, devuelve igualmente el estado actualizado. |

## Invariantes

- El hábito debe existir, pertenecer al usuario y no estar soft-deleted; de lo contrario se devuelve `404`.
- `legacy_id` identifica al hábito dentro del propietario; no se expone el UUID interno de la tabla de lectura.
- Los únicos estados son `completado`, `pospuesto` y `omitido`.
- No se aceptan fechas futuras. La comparación usa UTC mientras se cierra el contrato de timezone del usuario.
- La unicidad `(user_id, habit_legacy_id, date)` hace repetible el PUT y evita duplicados.
- Las estadísticas se calculan sobre el rango solicitado; el resumen siempre contiene los siete días hasta hoy.
- Actividad/heatmap, tareas y sincronización bulk no se escriben desde este vertical.

## Evidencia y límite

`cargo fmt --check`, `cargo check`, Clippy estricto, 9 tests unitarios, exportación/normalización OpenAPI, `npm run codegen`, type-check y build frontend pasan. La prueba HTTP funcional contra PostgreSQL temporal pasó: aislamiento entre usuarios `404`, hábito soft-deleted `404`, fecha futura `422`, upsert repetido con 3 filas únicas y `days=1` con resumen de 7 días conservando estados históricos. La integración del panel React también se verificó: `pospuesto` y `omitido` devolvieron `200`, y una lectura posterior confirmó `omitido` como estado final. La base temporal y el backend se limpiaron al finalizar.

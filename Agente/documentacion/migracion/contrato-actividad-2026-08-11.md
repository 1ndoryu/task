# Contrato de actividad Rust

**Estado:** implementación local verificada y consumida por el panel React Rust; no habilita cutover ni compatibilidad `/wp-json`.
**Fuente:** `App/Api/ActividadApiController.php`, `App/Services/ActividadService.php` y `App/React/services/actividadService.ts` del checkout WordPress observado.

## Rutas canónicas

| Método | Ruta | Propósito | Mutación |
|---|---|---|---|
| GET | `/api/activity` | heatmap por periodo y filtros | no |
| GET | `/api/activity/estadisticas` | totales, días activos y racha | no |
| GET | `/api/activity/day` | detalle de una fecha | no |
| POST | `/api/activity` | registrar o desmarcar actividad | CSRF |
| DELETE | `/api/activity/{id}` | eliminar una actividad propia | CSRF |

Los nombres JSON conservan el contrato de React existente: `tipo`, `elementoId`, `elementoTipo`, `proyectoId`, `fecha`, `horaLocal`, `detalles`, `elementoNombre` y `proyectoNombre`. Las respuestas de heatmap, estadísticas y detalle incluyen `success` para conservar el envelope consumido por los hooks actuales.

## Persistencia e invariantes

- `activity_events` conserva `user_id`, tipo, IDs legacy, fecha, hora local y detalles `jsonb`; los campos consultados no se esconden en un payload opaco.
- Todas las lecturas, borrados y filtros están acotados al usuario autenticado.
- Un periodo no supera 365 días y no termina en el futuro. El detalle diario usa `page`/`perPage` (máximo 200), devuelve `truncated` y `nextPage`, y React ofrece cargar la página siguiente sin duplicar eventos.
- Los detalles enviados no superan 16 KiB; los tipos y tipos de elemento se validan contra listas cerradas.
- `habito_cumplido` es único por `(user_id, elementoId, fecha)` y una repetición devuelve `duplicado_ignorado`.
- `tarea_desmarcada` solo elimina el `tarea_completada` del mismo elemento/fecha; `habito_desmarcado` solo elimina `habito_cumplido`.
- El detalle resuelve nombres desde el read model activo de tareas, hábitos y proyectos, con fallback a `detalles`.
- La fecha/hora omitida usa UTC del servidor; React envía la fecha y hora local explícitamente.
- Si la proyección de una tarea falla después de guardar la tarea, React conserva el cambio y muestra un aviso explícito; las cargas de resumen y detalle usan cancelación independiente.

## Fuera de este bloque

No se migran aquí el borrado administrativo masivo, colaboración/roles, almacenamiento de adjuntos, notificaciones, sincronización bulk/LWW ni efectos implícitos sobre el historial de hábitos. Estos contratos requieren su propio modelo, ownership, idempotencia y rollback.

## Evidencia

- `cargo fmt --check`, `cargo check --bin glory-backend` y `cargo build --bin glory-backend`: OK.
- `npm run openapi:export:local`, `npm run codegen` y `npm run check:front`: OK; cliente Orval generado en `frontend/src/api/generated/activity/`.
- `frontend/src/features/useActivity.ts` y `ActivityPanel.tsx` consumen el cliente generado; completar una tarea desde `DashboardPanel` registra la actividad mediante `/api/activity` y notifica al panel sin llamadas WordPress.
- PostgreSQL temporal + HTTP: deduplicación, aislamiento entre usuarios (`404`), CSRF sin token (`403`), fecha futura (`422`), detalle con nombre de tarea y heatmap/estadísticas verificados.
- PostgreSQL temporal + HTTP: paginación de 405 eventos en tres páginas, sin duplicados, con `truncated/nextPage` verificados.
- El PostgreSQL y el backend temporales fueron detenidos y eliminados después de la prueba. Falta únicamente incorporar la evidencia de rendimiento y ingress al preflight general; la evidencia de `EXPLAIN` y carga está registrada en `preflight-exposicion-2026-08-11.md`.

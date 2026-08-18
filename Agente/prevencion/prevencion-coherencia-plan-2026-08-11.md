# Prevención: coherencia entre roadmap, plan y codegen

## Caso

El plan activo puede marcar una fase como bloqueante mientras `roadmap.md` conserva un estado anterior, o README puede describir como generado un cliente Orval que todavía no existe. Esto permite saltarse inventario y fixtures o asumir un contrato que no es reproducible.

## Detección esperada

- Comparar manualmente el estado de `roadmap.md` con el encabezado del plan antes de cada bloque.
- Confirmar que el artefacto generado por Orval existe y es consumido antes de describirlo como vigente.
- Ejecutar `git diff --check` y revisar las rutas modificadas antes del commit documental.
- Comparar cada consulta caliente con el orden de sus índices parciales; para el dashboard, ejecutar `EXPLAIN (ANALYZE, BUFFERS)` con más de 501 filas activas por dominio y comprobar que usa `(user_id, sort_order, legacy_id)` sin un sort secuencial.

## Prevención futura

Convertir estas comprobaciones en un gate documental cuando exista un comando de validación del proyecto. La Fase 0 está parcialmente cerrada por contrato para los verticales ya versionados; la matriz general de IDs, compartidos, permisos legacy y fixtures reales sigue abierta. Cada ruta legacy nueva es bloqueante hasta que tenga fixture, consumidor rastreado y snapshot OpenAPI reproducible. El codegen solo se considera cerrado cuando el snapshot y los artefactos generados quedan sin diff no revisado.

## Checklist obligatorio de cierre

Antes de pedir revisión o crear el commit, el handoff debe incluir:

- `git status --short --branch` y la lista exacta de rutas dentro del repositorio modificadas o nuevas.
- Declaración explícita de rutas fuera del repositorio modificadas; si no existen, indicar `ninguna`.
- Salida y código de salida de `cargo fmt --check`, `cargo check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo test --all-targets --all-features`, `npm --prefix frontend run type-check`, `npm --prefix frontend run build` y `npm run codegen`.
- Evidencia funcional separada de la compilación: endpoint, aislamiento, soft-delete, permisos y límites comprobados.
- Evidencia de rendimiento de consultas calientes: plan `EXPLAIN` con una carga que supere el límite de respuesta; si no hay credenciales de una base temporal, registrar la limitación y dejar el comando reproducible como pendiente bloqueante antes de exposición.
- Confirmar que `frontend/orval.config.ts` usa `tags-split` y que `frontend/src/api/generated/` contiene más de un módulo de operación.
- Probar dos mutaciones concurrentes con el mismo `expectedUpdatedAt`: la primera debe devolver `200`, la segunda `409`, y una lectura posterior debe conservar la primera escritura.
- Probar la transición `soft-delete → PUT con expectedUpdatedAt: null → 200 → GET visible`; el mismo request sobre una fila activa sin token debe devolver `409`.

### Limitación registrada en este bloque

El `EXPLAIN (ANALYZE, BUFFERS)` no se pudo ejecutar el 2026-08-11: este checkout no tiene `.env`/`DATABASE_URL` y la conexión local con `psql` sin credenciales válidas fue rechazada. Antes de exponer el endpoint debe ejecutarse, con una base temporal reproducible y más de 501 filas activas por dominio:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM dashboard_tasks
WHERE user_id = '<user-id>' AND deleted_at IS NULL
ORDER BY sort_order, legacy_id
LIMIT 501;
```

Repetir para `dashboard_projects` y `dashboard_habits`, comprobando uso del índice parcial `idx_dashboard_<dominio>_user_order` y ausencia de un sort secuencial. Esta limitación bloquea exposición/cutover, no el commit del read-model local.

### Evidencia operativa del bloque actual

Los timeouts de adquisición/idle/lifetime del pool, el timeout global de request y la limpieza periódica de sesiones expiradas quedaron implementados y cubiertos por compilación, Clippy y tests unitarios de configuración. La verificación contra PostgreSQL temporal sigue pendiente porque este checkout no tiene `.env`/`DATABASE_URL` y las credenciales locales disponibles fueron rechazadas; antes de exposición debe comprobarse también que un request que exceda `REQUEST_TIMEOUT_SECONDS` devuelve `408` y que el job elimina sesiones con `expires_at <= NOW()`.

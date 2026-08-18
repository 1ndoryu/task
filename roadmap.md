Objetivo: migrar `glory-react-logic` desde WordPress/PHP a un monolito Rust/Axum ligero, manteniendo el frontend React y sus flujos de usuario.

Referencia legacy local (fuente WordPress): `C:/Users/Owner/OneDrive/Documentos/WP/app/public/wp-content/themes/glorytemplate` (`App/React` y `Glory/assets/react`).

## Estado

Fase 2 en progreso. La base segura, identidad, notas/carpetas/edición básica, lectura del dashboard, mutaciones iniciales, historial de hábitos y actividad existen como implementación local verificada. El inventario y contratos están documentados; la materialización rastreable del frontend legado, la paridad completa, ETL legacy y validación de exposición siguen pendientes. El consumidor está en `PROYECTO TASKS` (worktree del repo base `WANDORIUS`, antiguo `glory-rust-template`), rama `task-rs`.

Plan activo: `Agente/planes/plan-migracion-glory-react-logic-2026-08-11.md`.

## Corrección de rumbo (18-08-2026)

El objetivo es **backend Rust con el frontend original tal y como estaba en WordPress** — no un shell nuevo. El front original ya está copiado en el checkout (`frontend/src/app` = `App/React` 734 archivos, `frontend/src/glory-core` = `Glory/assets/react/src` 46), pero quedó gitignored y excluido del build como "referencia local" mientras se construyó el slice (`frontend/src/features/*` + `App.tsx`). Eso fue la malinterpretación.

Prioridad nueva (Fase 2.2 del plan): incorporar `src/app` + `src/glory-core` al checkout rastreado y al build, arrancar el front original como SPA servido por Rust (modo `__GLORY_ROUTES__`), adaptar la capa de datos (`window.gloryDashboard`, `/wp-json/glory/v1/*`, `X-WP-Nonce`) al contrato `/api` por dominio, y retirar el slice. El slice deja de ser la UI de referencia.

## Bloque actual

**Fase 2.2 — materialización del front original (18-08):** `frontend/src/app` (734 archivos, = `App/React`) y `frontend/src/glory-core` (46, = `Glory/assets/react/src`) se incorporaron al checkout rastreado y al build (`tsconfig`/`vite.config`, `.gitignore` sin exclusiones), y el front original corre como SPA servido por Rust (modo `__GLORY_ROUTES__` + `PageRenderer` del propio Glory) con sesión desde `/api/auth/me`; type-check y `vite build` verdes. El auth del front original (login/registro/logout) ya apunta a `/api/auth/*` con cookie HttpOnly + `X-CSRF-Token`; el slice (`frontend/src/features/*` + `App.tsx`) deja de ser la UI de referencia y se retira al cerrar paridad.

1. Continuar Fase 2.2: adaptar por dominio los servicios/hooks del front original de `/wp-json/glory/v1/*` al contrato `/api` — empezar por la sincronización del dashboard y tareas — e incorporar las asignaciones/proyección `own + shared` (envío de `asignadoA` como UUID, filtro "asignadas" y notificación `tarea_asignada`) en la UI original.
2. Mantener el snapshot OpenAPI versionado y el cliente Orval generado; regenerar solo mediante `openapi:export` + `codegen` y fallar ante drift.
3. Integrar los clientes Orval en asignaciones, proyección `own + shared` y operaciones avanzadas de notas; equipos, compartidos/roles, actividad, historial de hábitos, proyectos, edición inline, jerarquía básica de tareas —incluidos reparenting y desanidado—, timeline y notas/carpetas —incluidas búsqueda, renombrado y movimiento— ya tienen contrato y backend Rust; su UI original se conecta por dominio.
4. En paralelo, completar el gate exclusivo de exposición: memoria, `X-Forwarded-For`, cookies detrás del proxy, Docker build/pipeline e ingress real; no repetir el baseline PostgreSQL/Rust ni el runtime release local salvo cambio de configuración.

## Decisiones ya fijadas

- El backend nuevo no usa JWT en navegador ni tokens en `localStorage`.
- La sesión se almacena en cookie `HttpOnly`, revocable y persistida en PostgreSQL; las mutaciones requieren CSRF.
- CORS acepta únicamente `CORS_ORIGINS`; no se usa `Any` con credenciales.
- El primer vertical slice es auth + perfil, no el dashboard completo.
- La productividad empieza por lectura comparable; las escrituras bulk/LWW de WordPress requieren un contrato de conflictos nuevo.
- Las entidades migradas conservan una identidad interna estable y una correlación legacy auditable (`legacy_id`/`id_local`), con unicidad por propietario y dominio.
- El frontend se servirá como `frontend/dist` por el mismo binario cuando esté compilado; en desarrollo Vite usa `/api`.
- No se toca producción, no se hace cutover ni se migra Stripe/AI/WhatsApp hasta tener contratos, ETL idempotente y rollback verificable.

## Pendientes por dependencia

- Promover al entorno objetivo la evidencia de timeouts de request/DB, límites de pool/cola y limpieza de sesiones. El fixture de timeout del preflight quedó reproducible el 13-08 (`waitForTableLock` en `pg_locks` + backend con `REQUEST_TIMEOUT_SECONDS=3`) y la baseline completa local pasó con `--users 20 --rps 10 --duration-seconds 300`: 3000 muestras, 0 errores, p50 109.65 ms y p95 210.9 ms, `requestTimeout: 408`, limpieza OK; evidencia en `temp/preflight-final-green.json`. El 12-08, tras el rework a modelo nativo, se reejecutó la baseline dos veces y **falló el umbral p95 (332/343 ms vs <300 ms) con 0 errores y todo 200**, por presión de memoria del host (1.6–2.1 GB libres, Chrome/ChatGPT; EXPLAIN sub-ms, sin N+1): el preflight queda rojo para exposición hasta re-verificar en host estable/CI (no se debilita el umbral). La exposición sigue condicionada a Docker/ingress real, memoria, `X-Forwarded-For` y cookies detrás del proxy. El rate limit actual se acepta solo para single-replica y requiere mecanismo compartido al escalar.
- Verificar fallback SPA, health/readiness y cookies `Secure` en el entorno de despliegue; fallback SPA y health/readiness ya pasan en el runtime release local.
- Ejecutar `docker build` en un host/CI con Docker y verificar el healthcheck de la imagen antes de exposición; el Dockerfile ya existe y el runtime release local pasa.
- Front original materializado (18-08, Fase 2.2): incorporado al build y corriendo como SPA servido por Rust; pendiente eliminar `/wp-json/glory/v1/*` de cada dominio adaptado a `/api`, reducir `window.gloryDashboard` al shim de sesión y retirar el slice al cerrar paridad.
- Crear fixtures de compatibilidad método/path/DTO/permiso/error/conflicto y matriz de tablas/IDs por cada vertical restante; la matriz base de notas ya tiene ownership, duplicados, literalidad y `ON DELETE SET NULL` automatizados.
- Decidir y documentar mapeo de usuarios, `legacy_id`/`id_local`, cifrado E2E, huérfanos y conflictos antes de migrar productividad.
- Extender el cliente Orval generado a cada vertical adaptado y mantener su snapshot sincronizado con utoipa; las mutaciones básicas de tareas/proyectos, jerarquía básica atómica de subtareas, hábitos y notas/carpetas ya están cerradas y no se reabren sin un defecto reproducible.
- Migrar dominios en verticales: auth/perfil → lectura dashboard → tareas/proyectos/subtareas → hábitos/historial → notas/carpetas → actividad → colaboración → media → integraciones.

## Gate mínimo del consumidor

`npm run fmt:check`, `npm run check`, `npm run test`, `npm run openapi:export:local`, `npm run codegen`, `npm --prefix frontend run build` y una segunda ejecución idempotente de `npm run codegen`; el diff generado se compara contra el snapshot esperado después de stage, sin exigir un árbol limpio antes del commit. Para un slice con cambios de contrato o runtime se conserva además la prueba HTTP contra PostgreSQL temporal y `npm run preflight:exposure` con destinos loopback.

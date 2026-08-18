# Plan corregido: migración de Glory React Logic a Rust

**ID:** 118A-1
**Estado:** activo; Fase 2.2 (materialización del front original) en progreso — el front original (`src/app` + `src/glory-core`) está incorporado al build y corre como SPA servido por Rust (18-08); identidad/lectura/mutaciones, historial de hábitos, actividad, equipos, compartidos/roles, bandeja y timeline existen como implementación verificada en el backend; la adaptación de la capa de datos del front original a `/api` por dominio sigue pendiente
**Base:** `glory-rs-template/main` en `75bfba064d1313416dd61f96d02abc77f9ca1317`
**Consumidor:** `glory-react-logic-rs`
**Frontend objetivo:** `App/React` y `Glory/assets/react` del proyecto WordPress actual — **ruta canónica local:** `C:\Users\Owner\OneDrive\Documentos\WP\app\public\wp-content\themes\glorytemplate` (verificada el 12-08-2026)

## Corrección de rumbo (18-08-2026): el front real es el original, no el slice

Revisión con el usuario: la intención original fue **migrar el backend a Rust conservando el frontend tal y como estaba en WordPress**. En la práctica se construyó un shell/slice nuevo (`frontend/src/features/*` + `App.tsx`) y el frontend original quedó copiado solo como referencia local ignorada (`frontend/src/app` = `App/React`, 734 archivos; `frontend/src/glory-core` = `Glory/assets/react/src`, 46 archivos; ambos en `.gitignore` y excluidos de `tsconfig`). Eso fue la malinterpretación.

A partir de aquí: **el frontend del consumidor es el original** (`src/app` + `src/glory-core`), se incorpora al checkout rastreado (se quita del `.gitignore`), se compila y se sirve por el binario Rust; el slice pasa a ser referencia temporal y se retira cuando el original arranque con paridad. La unidad de migración ya no es "portar pantallas nuevas": es **adaptar la capa de datos del front original** (`window.gloryDashboard`, `/wp-json/glory/v1/*`, `X-WP-Nonce`) al contrato `/api` de Rust, vertical por vertical, sin reescribir componentes ni estilos.

### Fase 2.2 — Materialización del front original (nueva prioridad)

- **Boot SPA sobre Rust:** el motor de hidratación de Glory soporta modo SPA (`__GLORY_ROUTES__` + `PageRenderer`); `index.html` de `frontend/` monta `DashboardIsland` (y el resto de islas: Arbitraje, legales) como SPA servida por Axum con fallback SPA ya existente. Retirar el arranque PHP/`TemplateReact.php`.
- **Build:** `tsconfig` con `@/* → src/glory-core/*`, `@app/* → src/app/*`, sin excluir `app`/`glory-core`; alias de Vite equivalentes + stubs Capacitor; copiar `App/Assets/css` (design system `init.css`) al árbol del frontend y arreglar el `@import` relativo.
- **Dependencias:** añadir al `frontend/package.json` las que el original consume (`lucide-react`, `framer-motion`, `@editorjs/*`, `@capacitor/app|core`, `@dnd-kit/*` si se confirma su uso) y eliminar las que solo usaba el slice.
- **Shim de sesión:** bootstrap que resuelve `/api/auth/me` de Rust y expone `window.gloryDashboard` mínimo (`isLoggedIn`, `userId`, `apiUrl`, `nonce` vacío) para que los hooks legacy arranquen sin PHP; las mutaciones usan cookie HttpOnly + CSRF de Rust, nunca `X-WP-Nonce`.
- **Adaptador de datos por dominio:** cada servicio/hook original que llame a `/wp-json/glory/v1/*` se adapta al endpoint `/api` equivalente (auth, dashboard, tareas/proyectos, hábitos, notas, actividad, equipos, compartidos, notificaciones, timeline ya tienen backend Rust). Los dominios aún no migrados (mensajes, suscripción, almacenamiento, admin/feedback, backups, Stripe/AI/WhatsApp/Facebook/MCP) muestran estado "no disponible" y se migran en Fase 3; nunca un reescritor global opaco (ADR-01).
- **DoD:** `npm run dev` renderiza el front original con la misma UI/estilos del WordPress; login/registro reales contra Rust; las pantallas migradas consumen `/api`; type-check/build/gate verdes con `src/app` y `src/glory-core` rastreados.

## Correcciones respecto al plan anterior

La revisión detectó que el template `main` no entregaba sesiones HttpOnly, CSRF, rate limiting, CORS restringido, Docker/Coolify ni serving del SPA: usaba JWT Bearer y `localStorage`, CORS abierto y solo el ejemplo de notas. Por eso esos elementos son trabajo explícito de la Fase 1, no capacidades asumidas del template.

También se corrige el orden: el primer corte es auth + `/auth/me` + perfil mínimo. Dashboard y productividad quedan después de fijar compatibilidad de DTOs, permisos, IDs, paginación y sincronización.

La segunda revisión confirma tres límites adicionales: el dashboard de WordPress es un agregado con sincronización LWW y escritura masiva, las tablas de productividad mezclan columnas consultables con un payload JSON y `id_local`, y el codegen de Orval debe quedar fijado a un snapshot versionado. El bloque inicial ya cerró el contrato de lectura, la migración de proyección y el cliente generado; no se portará `/dashboard` como un CRUD opaco.

La revisión del 11-08 añadió un límite de reproducibilidad: `frontend/src/app/` y `frontend/src/glory-core/` eran fuentes legacy ignoradas por Git y excluidas por el boundary check, por lo que no se podía migrar un archivo aislado de ese árbol ni declarar el front preservado. **Ese límite se levantó el 18-08 con la Fase 2.2**: ambos árboles se retiraron del `.gitignore`, se incorporaron al `tsconfig`/`vite.config` y el front original arranca como SPA servido por Rust. La unidad de migración ya no es "portar un archivo de un árbol ignorado": es adaptar la capa de datos del front original (`/wp-json/glory/v1/*`, `window.gloryDashboard`, `X-WP-Nonce`) al contrato `/api` por dominio.

## Objetivo y límites

El resultado será un monolito Rust/Axum con PostgreSQL/SQLx, handlers delgados, servicios por caso de uso, repositorios por dominio, OpenAPI/Orval y el frontend React existente. WordPress se retira por dominios, con un único escritor por dominio y rollback de routing.

No se reescribe la UI, no se adopta el frontend de `wandorius`, no se crean microservicios y no se migran aún Stripe, AI, WhatsApp, Facebook, MCP ni media pesada. “Mantener el mismo front” significa conservar los flujos, componentes, estilos y comportamiento acordados; no se declarará paridad visual mientras el shell actual siga siendo una integración selectiva. La materialización rastreable del frontend es un gate transversal: ningún vertical se considera migrado solo porque su API compile. No se hace deploy, cutover ni escritura remota sin autorización explícita.

## ADR-01: topología de transición

Durante desarrollo Vite sirve el frontend y proxifica `/api` al Axum local. En producción el binario Rust servirá `frontend/dist` mediante `FRONTEND_DIST`, detrás del reverse proxy/Coolify existente cuando se autorice el despliegue. `/api/*`, `/health` y `/ready` pertenecen a Rust; cualquier `/wp-json/glory/v1/*` temporal debe implementarse como adaptador explícito por dominio, nunca como reescritura global opaca.

El primer servicio no depende de PHP ni de `window.gloryDashboard`. El fallback de rutas SPA, política de host, cookies y rutas legacy se prueba como contrato antes del cutover.

## ADR-02: identidad, sesión y correlación legacy

El navegador usa un identificador de sesión opaco aleatorio en cookie `HttpOnly`, con hash en `auth_sessions`, expiración, revocación y metadatos mínimos. El token CSRF viaja en cookie no HttpOnly y en `X-CSRF-Token` para mutaciones. CORS usa allowlist y credenciales explícitas. JWT Bearer, `localStorage`, nonces WordPress y `X-WP-Nonce` no forman parte del contrato nuevo.

Google web/Capacitor y compatibilidad de hash WordPress se investigan y se agregan después del login local; secretos y client IDs son configuración de entorno. Rate limit, límites de body, usuario desactivado y sesiones expiradas son requisitos antes de salir de local.

La migración de usuarios no se resuelve por email sin una política de colisiones. **El modelo de identidad es nativo (UUID) y el arranque es con datos vacíos**: los usuarios se registran directo en Rust y no existe tabla de correspondencia de usuarios (`user_legacy_links` se eliminó). Si en el futuro llega un ETL de datos legacy, el mapeo se haría en la importación como proceso separado y fuera del modelo de asignación; no se arrastra identidad de WordPress. Se conservan correlaciones de entidad (`legacy_id`/`id_local`) con unicidad por propietario y dominio. Los datos que no puedan mapearse quedan en rechazados; no se crean usuarios silenciosamente.

## ADR-03: contrato canónico y modelo de datos

El contrato canónico nuevo es `/api` y se publica desde `utoipa`; `/wp-json` solo existe como adaptador temporal cuando haya un consumidor coexistente demostrado. Cada endpoint migrado tiene fixture de request, response, error y permiso. `frontend/orval.config.ts` se activa únicamente contra un OpenAPI versionado y reproducible; los archivos generados se revisan y se consumen desde el frontend, sin mantener DTOs manuales duplicados para el mismo endpoint.

Las tablas nuevas usan columnas tipadas para campos filtrados/ordenados, `jsonb` solo para extensiones no consultadas y una correlación legacy explícita. No se replica automáticamente el `longtext data` de WordPress ni se cifra/descifra `texto` hasta comprobar el contrato de cifrado E2E del cliente. Las relaciones de propietario, proyecto, padre/subtarea y compartido son parte del modelo de permisos, no metadatos opcionales.

## ADR-04: productividad y coexistencia

El primer vertical de productividad será una lectura comparable del agregado de dashboard (tareas, hábitos, proyectos y configuración), seguida por mutaciones de tareas/proyectos y después hábitos/historial. No se porta primero la escritura masiva LWW: se reemplaza por operaciones idempotentes por entidad o por un endpoint de cambios explícito, con versión/updated-at y conflicto observable.

Rust solo escribe un dominio después de que su lectura, permisos, fixtures, migración y rollback estén probados. La convivencia se corta por dominio y ruta, con una matriz de consumidores y fecha de retirada; no se habilita doble escritura implícita.

## Fases verificables

### Fase 0 — inventario y contratos

- Catálogo versionado de método, path, request, response, permiso, consumidor React, tabla y dependencia externa.
- Matriz de entidades: columnas, soft delete, JSON, relaciones, índices, volúmenes, `wp_users/usermeta/options`, uploads y cron.
- Fixtures exactos para las rutas que consuma cada pantalla; envelopes y errores deben ser comparables, no solo nombres de endpoint.
- ADR de identidad, host, cookies, OAuth, storage, webhooks, IDs y coexistencia.
- Gate del consumidor fijado: branch primaria, lock y comandos reales; no afirmar `sentinel` hasta verificar que el repositorio lo declara.
- Separar el inventario por contrato semántico: agregado dashboard, CRUD de entidad, sincronización/cambios, compartidos y actividad; registrar qué parte es fuente de verdad y qué parte es una proyección.
- Mantener el snapshot OpenAPI versionado y reproducible; `openapi:export` lo refresca desde el backend y `codegen` genera el cliente consumido por React en módulos `tags-split`.

### Fase 1 — base Rust y vertical slice de identidad

- Configuración por entorno: `DATABASE_URL`, pool configurable, `CORS_ORIGINS`, cookies, `FRONTEND_DIST`, límites y timeouts. Implementado localmente: `DB_ACQUIRE_TIMEOUT_SECONDS`, `DB_IDLE_TIMEOUT_SECONDS`, `DB_MAX_LIFETIME_SECONDS`, `REQUEST_TIMEOUT_SECONDS`, validación de límites min/max y `TimeoutLayer` con `408`.
- Sesiones, CSRF, login, registro, logout, `/auth/me`, perfil mínimo, health/readiness, logs estructurados y OpenAPI de cookie.
- Adaptador legacy únicamente si una pantalla todavía lo necesita, con tests de equivalencia y fecha de retirada.
- Portar el shell/login React de manera selectiva, conservar CSS/componentes/Capacitor y retirar el arranque PHP. **Superada por la Fase 2.2 (18-08):** el front es el original completo (`src/app` + `src/glory-core`), no un shell selectivo; el slice previo queda como referencia y se retira al cerrar paridad.
- Las fuentes copiadas desde `App/React` y `Glory/assets/react` se mantenían fuera del bundle y del commit mediante `.gitignore`. **Superada por la Fase 2.2 (18-08):** las fuentes originales están incorporadas al checkout rastreado y al build; `check:frontend-boundary` ya no las excluye.
- DoD: build Rust y frontend, login real contra PostgreSQL, refresco de página, logout, CSRF rechazado, sesión revocada y sin llamadas `/wp-json` en el shell integrado. La eliminación de WordPress del front completo requiere el gate de la Fase 2.1; no se cierra con el boundary check del slice mínimo.
- Antes de exponer el servicio: verificar contra PostgreSQL temporal el timeout de request y de consultas, límites de pool/cola y la limpieza periódica de sesiones expiradas. La política está implementada; el rate limiter en memoria queda declarado como single-replica.

### Fase 2 — productividad por verticales

- Lectura comparable del agregado dashboard → tareas/proyectos y subtareas → hábitos/subhábitos e historial → notas/carpetas → actividad.
- Cada vertical incluye schema/migración, repositorio, casos de uso, handlers, DTOs OpenAPI, cliente Orval, permisos, paginación y fixtures.
- Estado local de esta fase: dashboard de lectura, tareas/proyectos, notas/carpetas, historial de hábitos, actividad y colaboración ya tienen contratos Rust, migraciones y cliente generado; actividad, historial de hábitos, la mutación de estado de proyectos, edición inline de tareas, jerarquía básica atómica de subtareas —incluidos reparenting y desanidado—, gestión de equipos, compartidos con roles, notificaciones y timeline ya están conectadas al panel React Rust. Actividad, tareas, proyectos, jerarquía básica y sus carreras concurrentes, equipos (invitación/aceptación/revocación y pending registration), carpetas/notas, búsqueda/movimiento, edición, compartidos, notificaciones, timeline y la proyección `own + shared` con asignaciones **nativas** (columna `asignado_user_id` UUID, sin correlación legacy; `asignadoA`/`propietarioId` como UUID en el contrato del front) tienen pruebas HTTP contra PostgreSQL temporal desde el 12-08 (`checkSharedProjectionContracts`); operaciones avanzadas de notas y demás flujos del frontend legado siguen pendientes, y la producción del slice requiere la UI del filtro "asignadas" adaptada (envío/lectura de UUIDs) y notificación `tarea_asignada`.
- La política inicial de IDs será una identidad interna estable más correlación (`legacy_id`/`id_local`) única por propietario y dominio; no se cambian IDs que el frontend usa sin un adaptador probado.
- Primero lectura comparada/shadow read con conteos, checksums y rechazados; luego un único escritor Rust por dominio. El ETL idempotente queda separado de la API online y es reejecutable.
- La colaboración (`compartidos`, roles y tareas asignadas) se especifica antes de afirmar que una entidad pertenece solo a `user_id`.

### Fase 2.0 — preflight operativo de exposición (base local ejecutada)

El preflight base se ejecutó contra un PostgreSQL temporal y una instancia Rust reproducibles; el resultado se conserva en `Agente/documentacion/migracion/preflight-exposicion-2026-08-11.md`. El 13-08 se cerró el fallo de reproducibilidad del fixture de timeout: `checkRequestTimeout` ahora espera de forma determinista a que el lock aparezca en `pg_locks` (en vez de un sleep fijo) y el backend debe correr con `REQUEST_TIMEOUT_SECONDS=3`; la baseline completa local pasó (`--users 20 --rps 10 --duration-seconds 300`: 3000 muestras, 0 errores, p95 210.9 ms, `requestTimeout: 408`; evidencia en `temp/preflight-final-green.json`). La exposición/cutover sigue bloqueada hasta completar ingress real, memoria, `X-Forwarded-For`, cookies y cabeceras detrás del proxy y el artefacto Docker con healthcheck. Fallback SPA y headers de seguridad pasan localmente. Esto no impide continuar con trabajo local de contratos o slices.

- Entregable ejecutable: `scripts/preflight-exposure.mjs` falla con código no cero ante FAIL y la baseline de carga se ejecutó con `--users 20 --rps 10 --duration-seconds 300`; desde el 13-08 el fixture de timeout es determinista (`waitForTableLock` + `REQUEST_TIMEOUT_SECONDS=3`) y la ejecución completa local pasa en verde. Las credenciales se reciben por entorno, nunca por argumentos ni se imprimen.

- Fixture: un usuario autenticado, más de 501 filas activas por cada proyección de dashboard, un corpus de notas para búsqueda, 365 días de actividad y sesiones expiradas. El fixture debe poder recrearse y eliminarse sin tocar datos externos.
- Timeout/pool/cola: forzar un request que supere `REQUEST_TIMEOUT_SECONDS` y comprobar `408`; saturar el pool con más trabajo que `DB_MAX_CONNECTIONS` y comprobar espera acotada/error controlado, sin crecimiento de memoria. Artefacto: logs estructurados y reporte de configuración efectiva. FAIL si hay `5xx` inesperado, espera ilimitada o proceso sin límite observable.
- Sesiones/rate limit: crear una sesión expirada y comprobar su limpieza; superar el límite de auth en single-replica y comprobar el estado documentado. Si se despliegan réplicas, FAIL hasta usar un limiter/lock compartido.
- Consultas: guardar `EXPLAIN (ANALYZE, BUFFERS)` de dashboard, actividad y búsqueda de notas. Comprobar índices, filtros, límites y ausencia de un plan no acotado para el corpus; una elección de secuencial solo es FAIL si contradice el volumen/selectividad esperados.
- Carga: ejecutar la baseline de 20 usuarios concurrentes y 10 RPS durante 5 minutos, conservando p50/p95, errores, espera/saturación del pool y memoria. PASS si cumple p95 `<300 ms` en lecturas, `<500 ms` en mutaciones y no presenta errores nominales ni crecimiento sostenido de recursos; si el entorno cambia, publicar nuevos umbrales antes de exponer.
- Ingress: mantener `TRUST_PROXY_HEADERS=false` salvo que exista un reverse proxy confiable y una allowlist de red explícita. CORS, readiness, cookies base, fallback SPA y headers HTTP de seguridad pasaron localmente; spoofing de `X-Forwarded-For`, `Secure`/dominio final, memoria del proceso, Docker/healthcheck e ingress real siguen pendientes para exposición.
- Artefacto de despliegue: `Dockerfile` multi-stage y `.dockerignore` ya existen y el binario release sirvió `FRONTEND_DIST` localmente con health/readiness, fallback SPA y headers de seguridad. La exposición queda fuera de la Fase 2: falta ejecutar `docker build`/healthcheck en un host o CI con Docker y validar el ingress real; hasta entonces no hay exposición/cutover.
- Codegen: ejecutar `npm run codegen` y comprobar inmediatamente `git diff --exit-code -- frontend/src/api/openapi.json frontend/src/api/generated/`; cualquier drift no revisado hace FAIL.

### Gate transversal 2.1 — materialización del frontend y retirada selectiva de WordPress

Esta no es una fase de cierre que pueda posponerse hasta terminar toda la API. Cada vertical solo avanza a “migrado” cuando su slice React está rastreado, autocontenido, probado contra Rust y libre de contratos WordPress.

> **Nota 18-08 (Fase 2.2):** este gate se escribió para la estrategia de slices del shell nuevo y queda **superado en su marco**: el front es el original completo y la unidad de migración es la capa de datos por dominio. El DoD de fondo no cambia (rastreado, probado contra Rust, sin `/wp-json`/`gloryDashboard`/`X-WP-Nonce`); la matriz siguiente es la referencia histórica del enfoque anterior.

La matriz mínima del enfoque anterior era:

| Vertical | Slice rastreado | Contrato Rust | Estado verificable |
|---|---|---|---|
| identidad/perfil | `App.tsx`, `ProfilePanel.tsx` | `/api/auth/*`, `/api/profile` | activo local; paridad legacy pendiente |
| dashboard/tareas/proyectos | `DashboardPanel.tsx`, `useDashboard.ts` | `/api/dashboard`, `/api/tasks/{legacy_id}`, `/api/projects/{legacy_id}` | activo local; jerarquía básica verificada, agregado legacy y operaciones avanzadas pendientes |
| hábitos/historial | `HabitHistoryPanel.tsx`, `useHabitHistory.ts` | `/api/habits/{legacy_id}/history*` | activo local; subhábitos pendientes |
| notas/carpetas | `NotesPanel.tsx`, `useNotes.ts`, `useNoteFolders.ts` | `/api/notes*` | activo local; colaboración y operaciones avanzadas pendientes |
| actividad | `ActivityPanel.tsx`, `useActivity.ts` | `/api/activity*` | activo local; paridad legacy pendiente |
| colaboración/resto legacy | `TeamsPanel.tsx`, `SharedPanel.tsx`, `NotificationsPanel.tsx`, `TimelinePanel.tsx` | `/api/teams*`, `/api/shared*`, `/api/notifications*`, `/api/timeline*` | equipos, compartidos/roles, bandeja local y timeline activos; asignaciones y proyección `own + shared` pendientes |

La matriz se amplía por ruta acordada con imports, contrato, fixtures de éxito/permiso/error/conflicto, prueba funcional y evidencia UI. La paridad completa no se declara con el shell mínimo ni con el build.

- Inventariar cada ruta/pantalla acordada y sus imports antes de copiarla; la unidad de migración es un slice autocontenido (pantalla, hooks, tipos, componentes y estilos necesarios), no un archivo suelto de un árbol ignorado.
- Incorporar los slices adaptados al checkout rastreado, consumiendo Orval y la sesión/cookie Rust. No forzar archivos desde `frontend/src/app/` o `frontend/src/glory-core/` sin incluir también sus dependencias reproducibles.
- Migrar primero dashboard, tareas/proyectos, hábitos/historial, notas/carpetas y actividad; después colaboración y el resto. Cada slice debe retirar `/wp-json`, `window.gloryDashboard`, `X-WP-Nonce` y `localStorage` de su propio grafo de imports.
- Conservar componentes, tokens, CSS y accesibilidad existentes; validar estados carga/vacío/error/offline, responsive y teclado con una comparación funcional/visual trazable. El build no prueba paridad visual.
- No borrar ni dejar de servir la referencia legacy hasta demostrar cero consumidores del slice, tener rollback de routing y verificar la matriz de identidad/IDs.
- DoD: el slice está rastreado, pasa `check:front`, no contiene contratos WordPress, tiene fixtures y prueba funcional contra Rust, y su ruta no depende de variables inyectadas por PHP.

### Fase 3 — colaboración, media e integraciones

- Equipos, compartidos, roles, mensajes, notificaciones y feedback.
- Adjuntos con ownership, límites, MIME validado, nombres seguros, storage definido y URLs temporales.
- Stripe, AI, WhatsApp, Facebook, MCP y workers solo cuando el core no dependa de ellos para arrancar; cada integración tiene idempotencia, secretos por entorno y retry acotado.

### Fase 4 — datos, observabilidad y retirada

- Exportar desde una copia restaurable, importar por dominio con conteos/checksums/rechazados, repetir y verificar rollback.
- Canary y ventana de observación por dominio; congelar cambios solo en el corte final.
- Retirar PHP, cron, rutas legacy, tablas y uploads únicamente después de probar restauración y confirmar cero consumidores.
- Mantener métricas de latencia/error, pool, rate limit, sesiones y rechazos de ETL durante la ventana de observación; el rollback de routing debe ser una operación probada.

## Criterios técnicos medibles

- Objetivo inicial: p95 lectura <300 ms y mutación <500 ms bajo una carga reproducible (a fijar antes del primer dominio; como baseline local, 20 usuarios concurrentes y 10 RPS sostenidos durante 5 minutos). Esa baseline es evidencia de regresión local, no un modelo de capacidad productiva: antes de exponer se deben fijar concurrencia objetivo, volumen de datos, memoria disponible y topología de réplicas del entorno real. Si el entorno difiere, se publica el nuevo presupuesto y la evidencia. La carga debe registrar p50/p95, errores, saturación/espera del pool y memoria; `EXPLAIN` aislado no prueba capacidad.
- Una instancia debe degradar con backpressure explícito: pool agotado, cola de crypto, body grande y rate limit responden con errores acotados, sin crecimiento ilimitado de memoria. Si se despliegan réplicas, el rate limit y cualquier lock de sincronización pasan a un mecanismo compartido.
- Toda consulta caliente con `LIMIT` debe tener un índice parcial alineado con sus filtros, orden y exclusión de soft-delete; la evidencia incluye `EXPLAIN (ANALYZE, BUFFERS)` con más de 501 filas por dominio antes de exposición. También se medirán las rutas de actividad y búsqueda de notas, que tienen filtros y límites distintos.
- Toda lista de actividad/notificaciones/mensajes tiene paginación y límites; los endpoints de auth tienen rate limit antes de exposición. `activity/day` ya usa `page`/`perPage` con máximo 200, `truncated` y `nextPage`; la prueba de tres páginas y 405 IDs únicos queda en la evidencia del preflight.
- Las pruebas deben demostrar estados de carga, vacío, error, offline, responsive y teclado cuando aplique; compilación no sustituye comprobación funcional.
- Cada fase registra versión de OpenAPI, migraciones aplicadas, fixtures, pruebas ejecutadas, cobertura no ejecutada y límites conocidos. La salida de `npm run codegen` debe ser limpia y verificable.

## Definition of Done global

Matriz de rutas acordadas cerrada; cada vertical con slice React rastreado y autocontenido, contrato Rust, fixtures, prueba HTTP/UI y grafo sin WordPress; frontend preservado visualmente y funcional en los flujos acordados; auth y dominios cortados sin WordPress; PostgreSQL como fuente única solo después de cada corte; ETL repetible y auditable; OpenAPI/Orval/migraciones sincronizados; timeouts, límites y observabilidad configurados; gate aplicable verde; rollback ensayado. Deploy y cutover quedan fuera hasta autorización explícita mediante Coolify Manager.

## Riesgos que aún bloquean el siguiente dominio

- Acceso a una copia restaurable de MySQL y volúmenes reales.
- Contrato definitivo de Google web/Capacitor y compatibilidad de hashes WordPress.
- Mapeo de usuarios y entidades legacy, incluyendo colisiones de email, `id_local`, entidades huérfanas y datos cifrados.
- Fixtures reales del agregado dashboard y política de conflictos para reemplazar LWW/bulk save.
- Semántica de compartidos, roles y tareas asignadas antes de migrar productividad.
- Política de storage de adjuntos y tareas programadas/cron.
- Presupuesto de carga e infraestructura del entorno de despliegue.

## Siguiente checklist ejecutable

La prioridad inmediata es la Fase 2.2 (adaptar la capa de datos del front original por dominio); el checklist siguiente se ejecuta sobre ese marco.

1. Seleccionar en la matriz el siguiente slice rastreable y cerrar su inventario de rutas, imports, DTO, permisos, tablas y consumidor React.
2. Capturar para ese slice fixtures anonimizados de lectura, mutación, éxito, permiso, error y conflicto; documentar qué datos son columnas y qué datos son extensión JSON.
3. Fijar el mapa de identidad/IDs y la política de conflictos del slice antes de crear migraciones o habilitar escrituras.
4. Materializar el slice autocontenido en rutas rastreadas y retirar WordPress de su grafo; validar estados UI de carga/vacío/error/offline, responsive y teclado cuando aplique.
5. Comparar el snapshot OpenAPI con el backend, ejecutar `npm run codegen`, `npm run check` y el build frontend; cualquier drift no revisado hace FAIL.
6. Continuar asignaciones, proyección `own + shared` y operaciones avanzadas de notas con el gate transversal; notificaciones base, timeline, compartidos con roles, equipos, mutaciones básicas de tareas/proyectos, jerarquía básica —incluido reparenting—, hábitos y notas/carpetas ya cerradas no se reabren sin un defecto reproducible.
7. Ampliar la matriz de conflictos y concurrencia para operaciones avanzadas y subtareas; conservar como regresión la paginación de `activity/day` y los contratos de notas ya automatizados.
8. Completar, como gate separado de exposición y sin bloquear los slices locales, memoria del proceso, `X-Forwarded-For`, cookies detrás del proxy, ingress real y `docker build`/healthcheck en CI; no repetir el baseline verde salvo que cambie la configuración.
9. Revisar diff, registrar evidencia documental y hacer un commit coherente por bloque. El push del consumidor requiere identificar explícitamente el remoto de destino; no se asume que `origin` sea el repositorio final.

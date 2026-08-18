# Inventario inicial de migración

**Fuente:** `C:/Users/Owner/OneDrive/WP/app/public/wp-content/themes/glorytemplate`
**Consumidor:** `glory-react-logic-rs`
**Fecha de medición:** 2026-08-11
**Método:** `rg -n 'register_rest_route' <fuente> -g '*.php'`

## Estado de las fuentes

- Checkout WordPress observado: rama `glory-react-logic`, árbol limpio, commit `4f81c51a`.
- Consumidor Rust: `glory-react-logic-rs`, rama `glory-react-logic-rs`.
- La referencia local del frontend ya está disponible bajo `frontend/src/app/` (731 archivos de `App/React`) y `frontend/src/glory-core/` (46 archivos del runtime compartido). Ambas rutas están ignoradas y no forman parte del bundle hasta que cada vertical retire su acoplamiento a WordPress.
- Esta copia de referencia no se considera paridad funcional: el frontend original todavía contiene llamadas a `/wp-json`, `X-WP-Nonce`, `window.gloryDashboard`, almacenamiento local y dependencias PHP/Capacitor que deben migrarse por contrato.

## Magnitud confirmada

- 152 llamadas a `register_rest_route`.
- 32 archivos PHP contienen registros REST.
- El conteo es de registros, no de endpoints semánticos: varias rutas registran métodos distintos sobre el mismo path.
- No se incluye aquí la migración de cron, uploads, Stripe, AI, WhatsApp, Facebook, MCP ni webhooks.

## Hallazgos que bloquean el siguiente porting

- `useDashboardApi` consume un agregado `/dashboard` con carga completa, guardado parcial/masivo, estado de sincronización y estrategia Last-Write-Wins; no es equivalente a un CRUD de tareas.
- `glory_tareas` y `glory_proyectos` tienen `id` interno autoincremental e `id_local` del cliente, `deleted_at` y `data` serializado; tareas además relaciona `proyecto_id` y `padre_id`. La compatibilidad exige una política de correlación por propietario y dominio.
- `TareasRepository` hace fallback desde `user_meta`, fusiona payloads parciales y descarta escrituras stale por `updatedAt`. Estas reglas deben convertirse en contrato explícito antes de elegir columnas Rust, `jsonb` o un endpoint de cambios.
- El frontend React original usa `X-WP-Nonce`, `window.gloryDashboard` y `/wp-json`; el árbol copiado en el consumidor es solo referencia ignorada. La paridad visual/funcional no está demostrada ni debe declararse completada.
- `frontend/orval.config.ts` usa un snapshot OpenAPI versionado; `frontend/src/api/generated.ts` ya es consumido por el lector del dashboard. Los verticales restantes aún deben migrarse al cliente generado.

## Política de coexistencia

Rust es escritor únicamente en los contratos que ya tienen migración, pruebas y cliente adaptado. Las rutas WordPress no se redirigen globalmente. Un adaptador `/wp-json/glory/v1/*` solo se añadirá si una pantalla coexistente lo necesita y debe declarar fecha de retirada.

## Primer contrato ya implementado

| Dominio | Ruta Rust | Métodos | Auth | CSRF | Persistencia | Estado |
|---|---|---:|---|---|---|---|
| identidad | `/api/auth/register` | POST | pública + rate limit | no | `users`, `auth_sessions` | activo |
| identidad | `/api/auth/login` | POST | pública + rate limit | no | `users`, `auth_sessions` | activo |
| identidad | `/api/auth/me` | GET | cookie sesión | no | `users`, `auth_sessions` | activo |
| identidad | `/api/auth/logout` | POST | cookie sesión | sí | `auth_sessions` | activo |
| perfil | `/api/profile` | GET/PUT | cookie sesión | PUT sí | `users` | activo |
| notas | `/api/notes` | GET/POST | cookie sesión | POST sí | `notes` | activo |
| notas | `/api/notes/{id}` | GET/PUT/DELETE | cookie sesión | PUT/DELETE sí | `notes` | activo |
| notas/carpetas | `/api/notes/folders*`, `/api/notes/{id}/folder` | GET/POST/PUT/DELETE | cookie sesión | escrituras sí | `note_folders`, `notes.folder_id` | activo local |
| hábitos/historial | `/api/habits/{legacy_id}/history*` | GET/PUT/DELETE | cookie sesión | PUT/DELETE sí | `dashboard_habit_history`, `dashboard_habits` | activo local |
| productividad | `/api/dashboard` | GET | cookie sesión | no | `dashboard_*` read model | activo, solo lectura propia |
| productividad | `/api/tasks/{legacy_id}` | PUT | cookie sesión | sí | `dashboard_tasks` | activo, upsert idempotente + jerarquía básica |
| productividad | `/api/projects/{legacy_id}` | PUT | cookie sesión | sí | `dashboard_projects` | activo, upsert idempotente |
| actividad | `/api/activity*` | GET/POST/DELETE | cookie sesión | POST/DELETE sí | `activity_events` + read model | activo local, contrato verificado |

## Correspondencia temporal con WordPress

| Contrato WordPress | Consumidor observado | Diferencia que debe resolverse antes de un adaptador |
|---|---|---|
| `/wp-json/glory/v1/auth/*` | `App/React` y servicios de autenticación | nonce/Google/Capacitor, envelopes y usuario entero vs sesión opaca |
| `/wp-json/glory/v1/perfil` | hooks/menú de usuario | nombres de campos, permisos y actualización parcial |
| `/wp-json/glory/v1/notas` | `App/React/services/notasService.ts` | IDs enteros, `{success, nota/notas}`, carpetas y búsqueda |
| `/wp-json/glory/v1/dashboard*` | `useDashboardApi` y Zustand | sync/change sets, tareas/hábitos/proyectos y múltiples tablas |

El endpoint Rust de notas no se declara compatible con el envelope WordPress todavía; el frontend Rust usa el contrato OpenAPI/JSON canónico. La compatibilidad legacy queda bloqueada hasta disponer de fixtures de request/response y política de `legacy_id`.

## Siguiente inventario ejecutable

1. Extraer método, path, callback, permission callback, parámetros y semántica de conflicto de cada controlador de productividad.
2. Cruzar cada ruta con `App/React` mediante el servicio/hook consumidor y registrar el DTO real, envelope, errores y estados de UI.
3. Identificar tablas, índices, soft delete, JSON, cifrado, relaciones, volumen y mapeo de `wp_user_id` por entidad en una copia restaurable de MySQL.
4. Fijar fixtures anonimizados para dashboard/sync, tareas, hábitos, proyectos, compartidos y actividad antes de crear migraciones SQLx.
5. Mantener el snapshot OpenAPI reproducible y extender el consumo del cliente Orval a cada vertical adaptado.

## Evidencia del bloque actual

El contrato Rust de notas se probó contra PostgreSQL temporal: registro `201`, lista `200`, escritura sin CSRF `403`, escritura válida `201`, `page=0` `422`, borrado sin CSRF `403` y borrado válido `204`. La base temporal se eliminó al finalizar.

El contrato inicial del dashboard tiene fixtures vacío y poblado en `Agente/documentacion/migracion/fixtures/`; la prueba funcional con PostgreSQL temporal verificó aislamiento por usuario, exclusión de soft-delete y precedencia de `legacy_id`. El snapshot OpenAPI y el cliente Orval se regeneraron localmente, y el frontend consume `getDashboard` generado.

El bloque siguiente añadió el contrato de mutaciones idempotentes de tareas/proyectos, con fixtures de upsert, conflicto y jerarquía básica documentados en `Agente/documentacion/migracion/contrato-productividad-mutaciones-2026-08-11.md`. La integración HTTP contra PostgreSQL temporal verificó tarea principal `200`, subtarea `200`, profundidad inválida `422`, padre inexistente `422` y auto-parentesco `422`.

El contrato de historial de hábitos se probó funcionalmente contra PostgreSQL temporal: aislamiento entre usuarios y exclusión de soft-delete (`404`), fecha futura (`422`), upsert repetido sin duplicar la tupla `(user_id, habit_legacy_id, date)`, DELETE y resumen de siete días con consulta `days=1`.

El contrato de actividad se probó contra PostgreSQL temporal: heatmap/estadísticas/detalle, deduplicación de `habito_cumplido`, aislamiento entre usuarios (`404`), CSRF (`403`), fecha futura (`422`) y resolución del nombre de tarea desde el read model. El snapshot OpenAPI y el cliente Orval se regeneraron; `ActivityPanel` y `DashboardPanel` consumen `/api` sin `/wp-json`, conservando los nombres JSON en español usados por React. Quedan pendientes `EXPLAIN` con volumen representativo y carga antes de exposición.

La mutación de proyectos se probó contra PostgreSQL temporal con sesión y CSRF: `PUT /api/projects/92002` respondió `200`, conservó `expectedUpdatedAt` y el dashboard posterior mostró `estado=archivado`. El panel React expone Archivar/Activar mediante el cliente Orval.

La gestión de carpetas de notas se probó contra PostgreSQL temporal: creación `201`, nota dentro de la carpeta `201`, filtro por `folder_id` con un resultado, eliminación `204` y nota posterior sin carpeta. `NotesPanel`, `useNotes` y `useNoteFolders` consumen el cliente generado sin rutas WordPress.

La edición de notas se probó contra PostgreSQL temporal con CSRF: creación `201`, `PUT /api/notes/{id}` `200` y lectura posterior con `title=Nota editada`. `NotesPanel` expone edición inline mediante el cliente generado.

Las tareas se probaron contra PostgreSQL temporal con sesión y CSRF: upsert inicial `200`, conflicto por `expectedUpdatedAt` stale `409`, actualización con timestamp vigente `200`, reactivación tras soft-delete `200` y aislamiento con otro usuario (`0` tareas visibles). Resultado reproducible: `TASK_FUNCTIONAL_OK created=200 conflict=409 fresh=200 reactivated=200 otherUserTasks=0`.

# Preflight operativo de exposición — 2026-08-11

**Estado:** ejecutado en PostgreSQL y Rust temporales; no autoriza deploy, cutover ni push.
**Comando:** `PREFLIGHT_DATABASE_URL=<temporal> node scripts/preflight-exposure.mjs --base-url http://127.0.0.1:55444 --users 20 --rps 10 --duration-seconds 300 --report <reporte>`

El script rechaza destinos no loopback por defecto. Un destino externo requiere `--allow-non-loopback`, `PREFLIGHT_ALLOW_NON_LOOPBACK=I_UNDERSTAND_NON_LOOPBACK_PREFLIGHT`, `PREFLIGHT_CONFIRM_BASE_URL` y `PREFLIGHT_CONFIRM_DATABASE_URL` coincidentes; la prueba de guardia remota terminó con exit `1` sin realizar escrituras.

## Fixture y controles

- PostgreSQL temporal en `127.0.0.1:55443`; backend compilado desde el checkout actual en `127.0.0.1:55444`.
- 600 proyectos, 600 tareas, 600 hábitos, 300 notas y 730 eventos de actividad para un usuario temporal.
- Health/readiness `200`, registro `201`, cookie de sesión `HttpOnly`, cookie CSRF no `HttpOnly`, CORS allowlist correcto.
- Sesión expirada: `/api/auth/me` devolvió `401` y la fila fue eliminada.
- Rate limit single-replica: intentos inválidos produjeron `429` después del presupuesto.
- Timeout de request: lock de PostgreSQL mantuvo una consulta bloqueada y el backend devolvió `408`.
- Contratos de notas: el fixture reproducible comprueba `folder_id` inexistente y ajeno `404`, creación/renombrado duplicado `409`, `ON DELETE SET NULL` y búsqueda literal de `literal_%` con un resultado.
- Jerarquía de tareas: tarea principal `200`, subtarea propia `200`, desvinculación con `parentId=null` `200`, subtarea de una subtarea `422`, padre inexistente `422` y auto-parentesco `422`; dos escrituras concurrentes de reparentado/creación devolvieron una `200` y otra `422`.
- Equipos: usuario secundario vacío `200`, invitación `201`, solicitud recibida `200`, aceptación `200`, compañero conectado `200`, revocación `204` y solicitud a usuario no registrado `201` con estado `pending_registration`; la lista paginada devolvió 50 de 51 miembros en la primera página (`hasMore=true`) y 1 en la segunda.
- Identidad y conflictos: emails sobredimensionados devolvieron `422` tanto en registro como en invitación; dos registros con el mismo email variando mayúsculas devolvieron `409`, y una solicitud recíproca contra una solicitud pendiente devolvió `409` en vez de `500`.

La ejecución corta posterior a este cambio pasó con `npm run preflight:exposure`: `missingFolder=404`, `foreignFolder=404`, `duplicateFolder=409`, `duplicateRename=409`, `folderDelete=204`, `preservedNote=200`, `literalTotal=1`, `parent=200`, `child=200`, `unparented=200`, `nested=422`, `missingParent=422`, `selfParent=422` y `concurrentStatuses=[200,422]`; el reporte y las filas temporales fueron limpiados.

La ejecución corta de colaboración verificó además `secondaryEmpty=200`, `invitation=201`, `received=200`, `accepted=200`, `connected=200`, `removed=204`, `pendingRegistration=201`, y la paginación `firstPage=200`/`secondPage=200`/`thirdPage=200` con 100+1 miembros. La misma ejecución encontró que el fixture histórico de timeout de request devolvió `200` porque el cliente `psql` temporal no adquirió el lock a tiempo en este host; queda como incidencia de reproducibilidad del preflight, no como evidencia para exponer el servicio.

La ejecución final del slice de compartidos, contra una base PostgreSQL temporal nueva y el binario compilado del checkout, verificó `created=3` para tarea/proyecto/hábito, duplicado `409`, recibidos/filtrado/propios/participantes/acceso `200`, cambio de rol del propietario `200`, cambio de rol ajeno `403`, compartido inexistente al cambiar rol `404`, entidad inexistente `404`, usuario sin conexión `403`, retirada por el destinatario `[204,204,204]` y creación/retiro con el compañero 101.º de la paginación (`overflowRecipient=201`, `overflowRemoved=204`). Con `--users 1 --rps 1 --duration-seconds 1` produjo 1 respuesta `200`, 0 errores y p95 de `94.16 ms`. Se ejecutó con `PREFLIGHT_SKIP_TIMEOUT_FIXTURE=true`; esa excepción sigue siendo solo diagnóstica y no autoriza exposición.

La misma ejecución final verificó el slice de notificaciones contra otra base PostgreSQL temporal nueva y el binario compilado: la aceptación de equipo generó un aviso para el solicitante (`200`); el destinatario recibió cuatro avisos de colaboración (solicitud y tres compartidos), la lista paginada devolvió `total=4`, dos elementos y `hasMore=true`; el contador pasó de `4` a `3` tras marcar una y a `0` tras marcar todas; borrar una notificación ajena devolvió `404`, borrar la propia `204` y repetir el borrado `404`. La carga corta produjo 1 respuesta `200`, 0 errores y p95 de `81.62 ms`. Se ejecutó con `PREFLIGHT_SKIP_TIMEOUT_FIXTURE=true`; esto no convierte el preflight global en verde ni autoriza exposición.

La ejecución final del slice de timeline verificó contra PostgreSQL temporal y el binario compilado: mensaje de propietario `201`, unread del compañero `1`, evento de sistema `200`/`created=true`, lista paginada inicial `total=2` con un elemento y `hasMore=true`, unread `0` tras listar, mensaje del compañero `201` y contador inicial `3`. La misma secuencia creó 51 mensajes adicionales (`overflowCreated=51`) y consultó la última página con `limit=50&offset=50`: `total=54`, cuatro ítems, `hasMore=false`, incluido `Timeline overflow 50`; la carga corta produjo 1 respuesta `200`, 0 errores y p95 de `61.63 ms`. Un usuario sin acceso no pudo escribir sobre el `legacy_id` de otro propietario (`404`) y su evento fue omitido (`200`/`created=false`). Los mensajes de usuario emiten avisos `mensaje_chat` a participantes distintos del emisor. Se ejecutó con `PREFLIGHT_SKIP_TIMEOUT_FIXTURE=true`; la excepción del fixture de timeout sigue sin autorizar exposición.

La ejecución aislada con `PREFLIGHT_SKIP_TIMEOUT_FIXTURE=true` pasó todos los contratos, incluyendo `identityContracts.oversizedRegister=422`, `identityContracts.oversizedInvite=422`, `identityContracts.duplicateCasefold=409` y `identityContracts.reciprocalRequest=409`; esa variable solo sirve para separar el fixture de timeout no reproducible y no convierte el preflight de exposición en verde.

## Rendimiento

Con `DB_MAX_CONNECTIONS=10`, `DB_MIN_CONNECTIONS=2`, 20 workers, 10 RPS y 5 minutos:

- 3.000 muestras, 3.000 respuestas `200`, 0 errores.
- p50: `117.23 ms`.
- p95: `286.79 ms` — dentro del objetivo inicial (`<300 ms` para lectura).

Stress separado con `DB_MAX_CONNECTIONS=4`:

- 3.000 muestras, 0 errores.
- p50: `186.41 ms`.
- p95: `436.4 ms`.

El stress confirma degradación acotada, pero el pool de 4 no cumple el presupuesto de latencia. La configuración base de exposición no debe reducirse a 4 conexiones sin una nueva medición y ajuste del objetivo.

## EXPLAIN

Con más de 501 filas activas por dominio, las consultas de dashboard usaron los índices parciales `idx_dashboard_tasks_user_order`, `idx_dashboard_projects_user_order` y `idx_dashboard_habits_user_order`, entregando 501 filas mediante `Index Scan` + `Limit`. Actividad usó `idx_activity_events_user_date` para el periodo de 365 días. La búsqueda de notas quedó limitada por usuario y `LIMIT 100`, con plan de bitmap/top-N sin escaneo secuencial no acotado.

## Actividad paginada

El endpoint `/api/activity/day` se verificó contra 405 eventos del mismo día:

- página 1: 200 elementos, `truncated=true`, `nextPage=2`;
- página 2: 200 elementos, `truncated=true`, `nextPage=3`;
- página 3: 5 elementos, `truncated=false`, sin `nextPage`;
- 405 IDs únicos al unir las tres páginas.

## Runtime release y headers

El binario release compilado con `cargo build --release --locked` se ejecutó contra PostgreSQL temporal con `FRONTEND_DIST=frontend/dist`. La prueba verificó health `200`, readiness `200`, una ruta SPA profunda (`/workspace/notes`) con `200` y el `index.html`, además de estos headers en el fallback: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

El `Dockerfile` multi-stage y `.dockerignore` ya están versionados; Docker no está instalado en este host, así que el `docker build` queda pendiente de CI/host de build y no se declara probado aquí.

## Límites abiertos

- La medición de memoria del proceso, spoofing de `X-Forwarded-For`, cookies `Secure` detrás del proxy y el ingress real aún requieren un preflight del entorno de exposición.
- El runtime release y el fallback SPA pasan localmente; el `docker build` y pipeline siguen pendientes porque Docker no está instalado en este host. La Fase 4 y cualquier cutover siguen bloqueados.
- El rate limiter en memoria solo es válido para single-replica.

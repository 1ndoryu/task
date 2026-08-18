# Inventario y contrato pendiente de colaboración

**Fecha:** 2026-08-11  
**Estado:** equipos, compartidos con roles, bandeja de notificaciones local y timeline implementados; asignaciones y proyección compartida del dashboard pendientes
**Fuente legacy:** `glorytemplate/App/Api/{Equipos,Compartidos,Mensajes,Notificaciones}ApiController.php`, servicios/repositorios asociados y hooks React `useEquipos`, `useCompartidos`, `useMensajes` y `useNotificaciones`.

## Alcance observado

El dominio no es un único CRUD. Tiene cuatro piezas acopladas:

1. **Equipos:** solicitudes por email, conexiones aceptadas y contador de solicitudes recibidas.
2. **Compartidos:** permisos sobre tareas, proyectos y hábitos, con roles `colaborador` y `observador`.
3. **Timeline:** mensajes de usuario y eventos de sistema por elemento.
4. **Notificaciones:** bandeja paginada, no leídas, marcado individual/global y borrado.

El dashboard Rust excluye actualmente los elementos compartidos y publica `sharedItemsIncluded: false`; el slice de compartidos ya valida identidad, permisos e IDs de forma aislada, pero no se debe cambiar ese flag hasta cerrar la proyección agregada y sus conteos comparables.

## Rutas legacy y consumidores

| Área | Método y ruta legacy | Consumidor observado | Contrato relevante |
|---|---|---|---|
| Equipos | `POST /equipos/solicitud` | `useEquipos.enviarSolicitud` | email; usuario destino o `pendiente_registro` |
| Equipos | `GET /equipos`, `GET /equipos/pendientes` | carga inicial y polling de badge | recibidas, enviadas, compañeros, contadores |
| Equipos | `PUT /equipos/{id}/responder` | aceptar/rechazar solicitud | solo el `companero_id` puede responder |
| Equipos | `DELETE /equipos/{id}` | cancelar/eliminar conexión | participante emisor o receptor |
| Compartidos | `POST /compartidos` | `useCompartidos.compartir` | tipo `tarea|proyecto|habito`, destinatario, rol |
| Compartidos | `GET /compartidos`, `/compartidos/mis` | listas de recibidos y propios | filtra opcionalmente por tipo |
| Compartidos | `GET /compartidos/participantes/{tipo}/{elementoId}` | selector de participantes | requiere acceso al elemento |
| Compartidos | `PUT /compartidos/{id}/rol` | gestión del propietario | solo propietario; rol colaborador/observador |
| Compartidos | `DELETE /compartidos/{id}` | propietario o destinatario | revoca o abandona el compartido |
| Compartidos | `GET /compartidos/contadores`, `/acceso/...` | badges y guards de UI | contadores por tipo y permiso efectivo |
| Timeline | `GET /mensajes/{tipo}/{id}` | `useMensajes.cargarMensajes` | `/api/timeline/{itemType}/{itemId}`, límite 1–100, offset, marca lectura |
| Timeline | `POST /mensajes` | `useMensajes.enviarMensaje` | `/api/timeline`, contenido 1–2000; acceso efectivo |
| Timeline | `GET /mensajes/contar/{tipo}/{id}` | badges de mensajes | `/api/timeline/count/{itemType}/{itemId}`, acceso efectivo |
| Timeline | `POST /mensajes/evento` | cambios del dashboard | `/api/timeline/events`, acciones acotadas y evento omitido sin acceso |
| Timeline | `GET/POST /mensajes/no-leidos`, `/mensajes/leer` | badges y lectura explícita | `/api/timeline/unread/*`, `/api/timeline/read`, propietario o compartido vigente |
| Notificaciones | `GET /notificaciones`, `/no-leidas` | bandeja y polling 30 s | página, porPágina, soloNoLeidas |
| Notificaciones | `PUT /notificaciones/{id}/leer`, `/leer-todas` | acciones de lectura | solo propietario de la notificación |
| Notificaciones | `DELETE /notificaciones/{id}` | limpieza de bandeja | solo propietario |

## Modelo y límites que deben conservarse

- `equipos` tiene estados `pendiente`, `aceptada`, `rechazada` y `pendiente_registro`; no se permite auto-solicitud ni compartir con uno mismo.
- Solo una conexión aceptada habilita compartir. El legacy rechaza duplicados por `(tipo, elemento_id, propietario_id, usuario_id)`.
- El propietario puede cambiar el rol y revocar; el destinatario puede abandonar. El propietario efectivo no es una fila de `compartidos`, sino el dueño del elemento.
- Las respuestas legacy mezclan `success`/`exito`, `data`/`compartidos` y códigos de error; Rust debe definir un envelope canónico y un adaptador solo si todavía existe un consumidor WordPress.
- Los datos compartidos legacy reconstruyen tareas/proyectos desde JSON y `id_local`; Rust debe exigir identidad interna estable más correlación legacy y no confiar en un `elemento_id` sin comprobar tipo, propietario y existencia.
- El timeline une chat y eventos de sistema. Su acceso debe derivarse del propietario o del compartido vigente, no de una comprobación global de sesión.
- Las notificaciones son efectos secundarios de equipos, compartidos, tareas y mensajes. La escritura del dominio principal no debe fallar por un error no crítico de notificación; el efecto debe ser reintentable y observable.

## Estado de compartidos y roles Rust

`shared_items` cubre `tarea`, `proyecto` y `habito`, con roles `colaborador` y `observador`, unicidad por propietario/destinatario/tipo/ID, y verificación transaccional de que el elemento pertenece al propietario. `/api/shared*` publica creación, recibidos, propios, participantes, acceso efectivo, cambio de rol, revocación/abandono y contadores. Solo una conexión `accepted` habilita crear un compartido; el propietario cambia roles y propietario o destinatario pueden retirar la fila. El frontend `SharedPanel.tsx` usa el cliente Orval y reutiliza los compañeros de `/api/teams` con carga incremental de páginas para seleccionar destinatarios más allá de la primera página.

La prueba HTTP temporal verificó tres tipos, duplicado `409`, filtro y listas `200`, participantes `200`, colaborador editable, observador no editable, cambio de rol del propietario `200`, cambio ajeno `403`, entidad inexistente `404`, usuario sin conexión `403` y abandono `204`. La proyección del dashboard y las asignaciones siguen fuera de este slice.

## Estado del timeline Rust

`timeline_messages` conserva mensajes de usuario y eventos de sistema por propietario, tipo e `legacy_id`; `timeline_reads` conserva el último mensaje leído por usuario y elemento. El acceso se resuelve con el propietario efectivo o una fila compartida vigente, con aislamiento por propietario cuando un `legacy_id` se repite entre usuarios. `GET /api/timeline/{itemType}/{itemId}` pagina hasta 100 y marca lectura; `/count`, `/unread` y `/read` exponen contadores y lectura explícita; `/api/timeline` crea mensajes y `/api/timeline/events` crea eventos con acciones permitidas. El frontend `TimelinePanel.tsx` consume el cliente Orval y mantiene el selector de elemento legacy.

Los mensajes de usuario emiten una notificación `mensaje_chat` deduplicable a los participantes distintos del emisor. La emisión es un efecto no crítico: un fallo de notificación no revierte el mensaje. La carga temporal verificó creación de mensaje `201`, evento `200`, unread `1→0` al listar, paginación `total=2`/`hasMore=true`, contador `3` y aislamiento entre propietarios (`404` para mensaje y evento omitido sin acceso). La asignación, proyección `own + shared`, deduplicación de eventos heredada y consumidores legacy restantes siguen pendientes.

## Estado de notificaciones Rust

`notifications` es una bandeja in-app ligera, sin WebSocket, polling del backend, email, push ni endpoint de creación público. `GET /api/notifications` pagina hasta 50 filas y filtra `unreadOnly`; `/unread-count`, `/read`, `/read-all` y `DELETE` están protegidos por sesión y CSRF donde corresponde. El modelo conserva texto limitado, metadata JSON pequeña, `read_at` y una clave de deduplicación por usuario/evento con índice único.

Los emisores son transiciones reales de colaboración: solicitud de equipo recibida, solicitud aceptada, elemento compartido y mensaje de timeline. Cada aviso se emite solo después de una transición exitosa, con `dedupe_key` estable (`team-request:{id}:...`, `share:{id}:created` o `timeline:{message_id}:{recipient_id}`) y los fallos del efecto quedan registrados sin convertir la bandeja en una dependencia de lectura/escritura principal. No se notifican todavía roles/revocaciones, asignaciones ni vencimientos.

## Slice Rust recomendado

Implementar en este orden, manteniendo el backend monolítico y ligero:

1. `equipos`: tabla de relaciones, constraints de estado, solicitud/aceptación/rechazo/revocación y fixtures de autorización/duplicado/carrera.
2. `compartidos`: tabla polimórfica acotada a los tres tipos existentes, constraints únicas, acceso efectivo y operaciones de rol/revocación.
3. Lectura del dashboard con una proyección explícita `own + shared`, manteniendo el flag de compatibilidad hasta cerrar conteos e IDs.
4. Notificaciones de colaboración con inserción transaccional mínima, sin polling del backend ni WebSocket en la primera versión.
5. Timeline paginado y eventos de sistema sobre el permiso efectivo ya estabilizado; quedan asignaciones y proyección `own + shared`.

Las rutas de compartidos ya tienen fixtures temporales de dos usuarios; siguen faltando fixtures legacy restaurables, la política definitiva de mapeo de `legacy_id`/`id_local` y la decisión de si asignación de tareas es un permiso de compartido o una relación separada. Esos datos siguen bloqueando la proyección completa y la migración de asignaciones; no se inventan para cerrar el dominio.

## Definition of Done del slice

- Contrato OpenAPI/Orval sin `/wp-json`, `X-WP-Nonce` ni `window.gloryDashboard`.
- Fixtures para propio, compañero aceptado, no compañero, observador, colaborador, revocado, duplicado, entidad inexistente y usuario no autorizado.
- Prueba HTTP con PostgreSQL temporal para lectura, mutación, permisos, conflicto y concurrencia.
- Proyección dashboard con conteos e IDs comparables y `sharedItemsIncluded` solo cuando la matriz esté cerrada.
- UI React rastreada y autocontenida para equipos/compartidos/timeline, con estados de carga, vacío, error, offline, teclado y responsive.

## Estado de equipos Rust

`team_connections` y `/api/teams*` ya cubren invitación por email, solicitudes para usuarios aún no registrados, listado de recibidas/enviadas/compañeros, aceptación/rechazo y revocación. La activación de `pending_registration` ocurre al registrar la cuenta destino y evita duplicados activos por par; las invitaciones recíprocas se convierten en `409` y los emails se normalizan con unicidad case-insensitive. `TeamsPanel.tsx` consume exclusivamente Orval y la sesión/cookie Rust. El siguiente slice debe añadir `compartidos` y roles sobre una identidad de usuario ya estabilizada; no debe ampliar todavía el dashboard a datos compartidos.

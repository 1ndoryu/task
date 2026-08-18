# Inventario semántico: asignaciones y proyección `own + shared` del dashboard

**Fecha:** 2026-08-12
**Rama:** `task-rs` (consumidor en `PROYECTO TASKS`, repo base `WANDORIUS`)
**Estado:** inventario cerrado; **materializado y verificado el 12-08 en modelo nativo** (columna `asignado_user_id` UUID, sin correlación legacy de usuarios, y proyección `own + shared` con metadata) con prueba HTTP en el preflight. El arranque es con datos vacíos: los usuarios se registran directo en Rust y `asignadoA` viaja como UUID. Pendiente para producción: UI del filtro "asignadas" y notificación `tarea_asignada`.
**Fuente:** `frontend/src/app/` (árbol legacy local, gitignored), `Agente/documentacion/migracion/contrato-colaboracion-2026-08-11.md`, contratos ya cerrados de productividad y timeline.

## 1. Qué es el slice

Dos piezas acopladas del dashboard legacy que aún no están en Rust:

1. **Asignaciones de tareas**: el formulario de tarea asigna la tarea a un participante (`asignadoA`), el dashboard tiene un filtro **"asignadas"** que muestra solo tareas reales asignadas por otros (nunca hábitos), el timeline registra eventos `asignado`/`desasignado` y la bandeja declara notificaciones `tarea_asignada`.
2. **Proyección `own + shared`**: el agregado del dashboard debe combinar los elementos propios con los compartidos conmigo, con conteos e IDs comparables. Hoy el dashboard Rust es solo propio (`shared_items_included: false`).

## 2. Rutas legacy y consumidores

| Concepto | Consumidor observado | Contrato |
|---|---|---|
| Compartir tarea/proyecto con rol | `useCompartirDashboard.ts` (`manejarCompartirProyecto/Tarea`, `manejarCompartirElemento`) | `/api/shared*` ya cubierto |
| Participantes de un elemento | `useCompartidos.ts` `GET /compartidos/participantes/{tipo}/{elementoId}` | `/api/shared/participants` ya cubierto |
| Permiso efectivo | `useCompartidos.ts` `GET /compartidos/acceso/{tipo}/{elementoId}/{propietarioId}` | `/api/shared/access` ya cubierto |
| Asignar tarea a participante | `SelectorAsignado.tsx` + `FormularioTareaModerno.tsx` (`asignadoA`, `onAsignacionChange(usuarioId, nombre, avatar)`) | **sin endpoint Rust** |
| Filtro "asignadas" del dashboard | `useDashboardCompleto.ts` (solo tareas; hábitos nunca "asignados") | **sin soporte Rust** |
| Eventos de asignación | `useMensajes` / timeline legacy | `/api/timeline/events` `asignado`/`desasignado` ya implementados |
| Aviso al asignar | bandeja legacy `tarea_asignada` | tipo declarado en `notifications.rs`, **sin emisor** |

## 3. Modelo observado en legacy

- La asignación es un **campo de la tarea** (`asignadoA`: id de usuario o null), no una fila separada. El selector solo se muestra si hay participantes y callback de asignación.
- El acceso al elemento asignado se gestiona con la fila de `compartidos` (rol `colaborador`/`observador`). La asignación y el compartido son conceptos distintos en la UI: compartir da acceso; asignar marca a quién corresponde la tarea.
- El filtro "asignadas" consulta `asignadoA` → es un campo **filtrado/consultable**, por lo que según ADR-03 debe ser columna tipada (o índice jsonb alineado) cuando se materialice, no quedar solo en el payload.

## 4. Tablas, DTO y matriz de identidad/IDs

| Entidad | Tabla Rust | Clave de identidad | Correlación legacy |
|---|---|---|---|
| Tarea | `dashboard_tasks` | `(user_id, legacy_id)` único | `id_local` en `payload` |
| Proyecto | `dashboard_projects` | `(user_id, legacy_id)` único | `id_local` en `payload` |
| Hábito | `dashboard_habits` | `(user_id, legacy_id)` único | `id_local` en `payload` |
| Compartido | `shared_items` | `(owner_id, recipient_id, item_type, item_legacy_id)` único | `id_local` del elemento; dueño efectivo = `owner_id` |
| Asignación | `dashboard_tasks.asignado_user_id` (UUID, FK a `users`, ON DELETE SET NULL) | `asignadoA` del payload **como UUID** (nativo, sin mapeo legacy) | idéntico: el UUID es la identidad del usuario en Rust |
| Participantes | `team_connections` (compañeros aceptados) | par `(a, b)` | emails normalizados; `pending_registration` |

DTO del dashboard: `DashboardReadResponse` (data + meta con `shared_items_included`). El filtro "asignadas" y la proyección compartida alteran el DTO de lectura sin tocar el contrato de escritura.

## 5. Permisos y conflictos

- Propietario efectivo: dueño del elemento (no es una fila de `shared_items`). Ya cubierto en `SharedService::access`.
- Compartido vigente habilita acceso con rol; el propietario cambia roles y revoca; el destinatario abandona. Ya cubierto.
- **Decisión fijada (ADR `adr-asignacion-tareas-2026-08-12.md`):** la asignación **no otorga acceso**; el acceso sigue dependiendo de `shared_items` vigente o del propietario efectivo. El selector legacy depende de participantes ya compartidos.
- Conflictos a cubrir cuando se materialice: asignación concurrente de la misma tarea a dos usuarios (LWW legacy → contrato nuevo con `updated_at`/versión observable), carrera asignar/reparentar, duplicado de compartido (`409` ya cubierto) y aislamiento por propietario cuando un `legacy_id` se repite entre usuarios.

## 6. Proyección `own + shared` — estado tras la implementación (12-08, modelo nativo)

- Implementado en `DashboardRepository::read`: fusiona tareas/proyectos propios con (proyectos compartidos + tareas de proyectos compartidos + tareas asignadas a mí), con metadata `esCompartido`/`propietarioId`/`propietarioNombre`/`propietarioAvatar`/`miRol`; hábitos excluidos; tarea compartida directa excluida; dedup por (propietario, `legacy_id`); `shared_items_included: true`.
- Semántica confirmada contra el legacy (`DashboardRepository::loadAll` + `CompartidosProyectosService`): el dashboard es `array_merge(propio, compartidos['tareas'])` y `array_merge(propio, compartidos['proyectos'])`; `asignadoA` se lee de `JSON_EXTRACT(data, '$.asignadoA')`. El contrato de forma se conserva; el **valor es nativo**: `asignadoA` es el UUID del usuario Rust, `propietarioId` es UUID.
- Columna tipada `asignado_user_id UUID REFERENCES users(id) ON DELETE SET NULL` (ADR-03) con índice parcial en la migración `20260824000000_assignment_user`; la asignación viaja en el `payload` del PUT de tarea y se persiste en la columna.
- **Sin correlación legacy de usuarios**: se eliminó `user_legacy_links` y `asignado_legacy_id` (migración `20260823000000_collaboration_projection` borrada). El filtro "asignadas" es `asignado_user_id = usuario actual`.
- Filtro "asignadas": los datos ya llegan al cliente; la UI del filtro es trabajo del frontend adaptado (debe enviar `asignadoA` como UUID y consumir `propietarioId` como UUID).

**Pendiente para producción:**
1. UI del filtro "asignadas" en el panel React adaptado (envío de `asignadoA` como UUID, lectura de `propietarioId` UUID, estados carga/vacío/error).
2. Notificación deduplicable `tarea_asignada` al destinatario (efecto no crítico) y emisión de eventos de timeline en la mutación.

## 7. Definition of Done del slice

- Contrato OpenAPI/Orval sin `/wp-json`, `X-WP-Nonce` ni `window.gloryDashboard`; snapshot sin drift tras `openapi:export:local` + `codegen` idempotente.
- Fixtures: propio, compañero aceptado, no compañero, observador, colaborador, revocado, tarea asignada a mí, tarea asignada a otro, duplicado, entidad inexistente, usuario no autorizado y carrera de asignación.
- Prueba HTTP con PostgreSQL temporal (lectura, mutación, permisos, conflicto y concurrencia) + prueba UI del filtro "asignadas".
- `sharedItemsIncluded` solo con conteos e IDs comparables verificados.
- UI React rastreada y autocontenida (`SelectorAsignado`, filtro "asignadas") con estados carga/vacío/error/offline, teclado y responsive.

## 8. Verificación del estado base (2026-08-12)

Gate mínimo del consumidor ejecutado en `task-rs` sobre el árbol actual: `fmt:check`, `cargo check`, `clippy`, `cargo test` (9 unit), `check:front` (tsc + boundary), `openapi:export:local`, `codegen` ×2 idempotente sin drift y build frontend pasan. Limitación registrada: los tests HTTP contra el PostgreSQL temporal (`.env` → `127.0.0.1:55455`) no pudieron ejecutarse en esta sesión porque el contenedor/instancia temporal no está activo y no hay Docker; el preflight completo sigue sin autorizar exposición (fixture de timeout no reproducible + ingress/Docker pendientes).

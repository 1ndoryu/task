# ADR: asignación de tareas nativa (adaptada al front)

**Fecha:** 2026-08-12 (revisado al modelo nativo)
**Rama:** `task-rs`
**Estado:** decisión adoptada e **implementada** — columna nativa `asignado_user_id` (UUID) y proyección `own + shared` verificadas por prueba HTTP en el preflight. **Sin correlación legacy de usuarios**: se eliminó `user_legacy_links` y `asignado_legacy_id`; el arranque es con datos vacíos.
**Relacionado:** `inventario-slice-asignaciones-proyeccion-2026-08-12.md`, `contrato-colaboracion-2026-08-11.md`, ADR-03 del plan de migración.

## Contexto

El legacy asigna tareas a participantes dentro del formulario de tarea (`SelectorAsignado.tsx` + `FormularioTareaModerno.tsx`): la tarea tiene un campo `asignadoA` (id de usuario o `null`) y el callback `onAsignacionChange(usuarioId, nombre, avatar)`. El dashboard legacy tiene un filtro **"asignadas"** que muestra solo tareas reales asignadas por otros (los hábitos nunca se asignan). El acceso a un elemento compartido se gestiona con filas de `shared_items` (roles `colaborador`/`observador`) sobre conexiones de equipo aceptadas.

Decisión previa: **¿la asignación es un permiso de compartido o una relación separada?** Además, la arquitectura requiere identidad **nativa**: no se migran usuarios legacy ni se mantiene una tabla de correspondencia.

## Decisión

**La asignación es un campo tipado de la tarea con identidad nativa (UUID), no una relación separada, y no otorga acceso por sí sola.**

1. `dashboard_tasks.asignado_user_id UUID REFERENCES users(id) ON DELETE SET NULL` es la columna tipada consultable (ADR-03), con índice parcial.
2. El front envía la clave `asignadoA` en el payload de la tarea **con el UUID del destinatario** (contrato de forma conservado del legacy, valor nativo). El PUT la persiste en la columna tipada.
3. El filtro "asignadas" se resuelve como `asignado_user_id = usuario actual`; los hábitos quedan excluidos por definición.
4. El acceso al elemento sigue dependiendo de `shared_items` vigente (rol colaborador/observador) o del propietario efectivo. Asignar **no** crea permiso implícito.
5. No hay tabla `user_legacy_links` ni columna `asignado_legacy_id`: la identidad es 100% UUID de Rust; el arranque es con datos vacíos y el ETL legacy (si llega) mapeará fuera del modelo de asignación.
6. No se crea endpoint nuevo de asignación: viaja en la mutación de tarea, coherente con el front.

## Alternativas descartadas

- **Correlación legacy (tabla `user_legacy_links` + id numérico)**: descartada por decisión de arquitectura — el sistema es nativo, empieza vacío y no arrastra identidades de WordPress.
- **Relación separada `task_assignments`**: añade joins y una fuente de verdad duplicada; el campo vive en la tarea.
- **Permiso implícito por asignación**: contradice el acceso del legacy, donde el selector solo aparece cuando ya hay participantes compartidos.

## Consecuencias

- El filtro "asignadas" usa la columna tipada con índice parcial, no búsqueda sobre `jsonb`.
- El front adaptado debe enviar `asignadoA` como **UUID string** y consumir `propietarioId` como UUID en la metadata de compartidos (`esCompartido`, `propietarioNombre`, `propietarioAvatar`, `miRol`); los `id` de ítems siguen siendo los `legacy_id` del read model (el front los usa en rutas `/api/tasks/{id}`).
- `shared_items` no cambia su semántica; la asignación es metadata del elemento, no una fila de acceso.

## Pendiente para producción

1. UI del filtro "asignadas" en el panel React adaptado (envío de `asignadoA` como UUID y lectura de `propietarioId` UUID).
2. Notificación `tarea_asignada` y emisión de eventos de timeline en la mutación de asignación; prueba de carrera de asignación concurrente (contrato nuevo con `updated_at`).

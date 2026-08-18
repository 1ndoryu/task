# Contrato de mutaciones idempotentes de productividad

**Estado:** implementado localmente para tareas y proyectos, con edición inline y jerarquía de subtareas conectadas al panel React; no es todavía sincronización bulk/LWW ni colaboración.

## Rutas

| Método | Ruta | Auth | CSRF | Conflicto |
|---|---|---|---|---|
| PUT | `/api/tasks/{legacy_id}` | cookie | sí | `409` si `expectedUpdatedAt` quedó stale |
| PUT | `/api/projects/{legacy_id}` | cookie | sí | `409` si `expectedUpdatedAt` quedó stale |

La identidad lógica es `(user_id, legacy_id)` y la operación es upsert. El `legacy_id` debe ser positivo. El UUID interno de PostgreSQL no se expone como identidad del frontend. La lectura entrega `updatedAt` ISO-8601 por entidad.

## Escritura

El request contiene los campos tipados que se consultan y un `payload` de extensión. El backend vuelve a escribir en el payload los campos canónicos (`texto`, `completado`, `proyectoId`, `nombre`, `estado`, etc.) para que una proyección antigua no oculte la mutación. `expectedUpdatedAt` debe ser `null` al crear una identidad inexistente o al reactivar una fila soft-deleted; para una fila activa debe coincidir con `updatedAt`. Si falta o no coincide en una fila activa, no se modifica y se devuelve `409`.

Las filas soft-deleted se reactivan mediante un upsert explícito. No se aceptan listas de cambios, envelopes WordPress ni resolución silenciosa Last-Write-Wins.

## Criterios

1. El mismo request sobre el mismo `(user_id, legacy_id)` no crea duplicados; una repetición sin el token actual devuelve `409` en vez de aplicar LWW.
2. Un usuario no puede actualizar la fila de otro usuario aunque conozca su `legacy_id`.
3. Dos escrituras con el mismo `expectedUpdatedAt` producen un `200` y un `409`, sin sobreescribir la fila ganadora.
4. Un PUT con `expectedUpdatedAt: null` sobre una fila soft-deleted la reactiva y devuelve `200`; sobre una fila activa devuelve `409`.
5. El frontend usa el cliente Orval `tags-split`; el toggle de tareas refresca el dashboard después de un `200` y muestra un error accesible ante fallo/conflicto.
6. `parentId` solo puede apuntar a una tarea propia, activa y principal; una auto-referencia, un padre inexistente/ajeno o una profundidad mayor a un nivel devuelve `422`. `null` desvincula la tarea y la devuelve a la raíz.
7. La carga y el plan de índices de lectura se verifican antes de exposición con el `EXPLAIN` documentado en la prevención del proyecto.

La validación de `parentId` y el upsert se ejecutan en una misma transacción. Target y padre se bloquean por `legacy_id` en orden determinista; una carrera de reparentado y creación de subtarea produce una sola escritura válida (`200`) y rechaza la otra (`422`), evitando ciclos y profundidad mayor a un nivel.

## Evidencia de integración React

La edición inline de una tarea autenticada se probó contra PostgreSQL temporal con un `expectedUpdatedAt` obtenido de la fila: `PUT /api/tasks/303` devolvió `200` y la consulta posterior confirmó `Task edited Rust`. El frontend conserva el editor abierto si la mutación o la recarga fallan.

La jerarquía de tareas se probó mediante el preflight reproducible: tarea principal `200`, subtarea `200`, subtarea de subtarea `422`, padre inexistente `422` y auto-parentesco `422`. `DashboardPanel` ordena las subtareas junto a su padre y conserva referencias huérfanas visibles como raíz.

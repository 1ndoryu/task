# tasks-core — núcleo kanban agnóstico (07AA-1 F1b)

Capa de lógica de tareas sin React, sin CSS y sin DOM: tipos mínimos, validaciones
espejo del backend, cliente con fetch inyectado, operaciones puras y consultas de árbol.
La impone la puerta `node check-agnostico.mjs` (veto de imports + type-check + tests).

## Excepción de gobernanza (firmada 2026-10-07, opción 1)

La regla 18 de `AGENTS.md` manda la lógica reutilizable al framework, pero esta capa
vive en el repo TASKS por ser **lógica de producto-tareas** (contratos F1, clave
`kanban.v1`, bulk transaccional), no framework. El WM la consume por pin de commit.

## Consumo por pin (sin `file:`, sin tags todavía)

```json
{ "dependencies": { "tasks-core": "github:<org>/PROYECTO-TASKS#<commit>" } }
```

Tras cada cambio romper la API mayor: subir versión + anotar en `CHANGELOG.md`.

## Matriz de versiones

| tasks-core | backend TASKS | notas                          |
|-----------:|---------------|--------------------------------|
|      0.1.0 | 07AA-1 F1     | `GET /api/projects/:id/tasks`, `POST /api/tasks/reordenar`, `kanban.v1` |

## Requisitos del consumidor

Ninguna dependencia. Solo necesita `fetch` global (navegador o Node 18+) o un `FetchFn`
propio para tests. Ver `src/cliente.ts` (`crearClienteKanban`, `adaptarRespuestaFetch`).

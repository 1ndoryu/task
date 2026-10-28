# Plan — escrituras que no se pisan (2026-10-28)

**ID:** `28AA-1` · **Estado:** propuesto, sin empezar · **Origen:** se perdieron los 3 subhábitos de «MN INMOBILIARIA» (última escritura 2026-10-28 17:11:46 UTC con `subhabitos: []`, sin «Quitar» de la usuaria).

## Objetivo

Que ninguna pestaña, la app local ni otro cliente pueda guardar una copia vieja encima de datos más nuevos, y que las pestañas se enteren de los cambios de las demás. Hecho cuando el escenario «A añade subhábitos, B (copia vieja) edita otra cosa» deja los subhábitos intactos, probado en el build de la 89.

## Causa (confirmada en el código)

1. **Última escritura gana.** `habitos.ts:22` y `tareas.ts:25` mandan `expectedUpdatedAt: null`, y `upsert_habit`/`upsert_task` sin versión escriben siempre (`repositories/productivity.rs`). Cada PUT lleva el hábito entero, así que lo que la copia no tenga se borra.
2. **El servidor ya sabe bloquear:** con `expectedUpdatedAt` compara `updated_at` y responde 409. Además la lectura del dashboard ya devuelve `updatedAt` por fila (`proyeccion.rs:127`) y el PUT devuelve el nuevo. Falta que el cliente lo use.
3. **Carga única.** `usarCarga` lee el dashboard una vez; no hay refresco, ni `focus`, ni canal entre pestañas.
4. **Pendientes ciegos.** `fusionarPendientes` superpone copias completas guardadas en `localStorage` sin comparar versión: una copia de una escritura fallida vuelve encima del servidor.

No confirmado: cuál de ellos produjo el guardado vacío concreto. Da igual para el arreglo: los cuatro se cierran.

## Fases

| # | Qué | Archivos | Criterio |
|---|---|---|---|
| F1 | **Bloqueo optimista en hábitos y tareas.** Enviar `expectedUpdatedAt` = versión de la copia local; al 200 guardar el `updatedAt` nuevo en el estado; al 409 pedir la fila fresca, **reaplicar** la transformación `cambiar` y reintentar (máx. 2); si falla, aviso «cambió en otro sitio». Escrituras de una misma fila en cola, de una en una, encadenando la versión (si no, dos clics seguidos chocarían contra sí mismos). | `logica/habitos.ts`, `logica/tareas.ts`, `vista/usarEscritura.ts` (+ cola por id) | Test: 409 reaplica sobre la fila nueva; dos escrituras seguidas no dan 409 propio. |
| F2 | **Completar por estado destino, no por alternar.** Hoy `completar` hace toggle sobre lo leído; reaplicado tras un 409 podría desmarcar lo que otra pestaña ya marcó. Se decide «hecho/no hecho» al clic y se reaplica ese destino. | `vista/usarFilas.ts`, `usarEscritura.ts` | Test: B completa lo que A ya completó → sigue completado. |
| F3 | **Pendientes con versión.** Guardar `{copia, baseUpdatedAt}`; al cargar, si el servidor avanzó, descartar la copia (y avisar); si no, reenviar con bloqueo. Las pendientes antiguas sin base se descartan con aviso. | `logica/store.ts`, `usarCarga.ts` | Test: pendiente vieja ya no pisa una fila más nueva. |
| F4 | **Sincronización entre pestañas y app.** Releer el dashboard al volver a enfocar (`visibilitychange`, máx. 1 cada 5 s) y fusionar por fila: sustituir solo filas con `updatedAt` mayor y sin escritura en vuelo ni pendiente. Mismo navegador: `BroadcastChannel` para avisar al instante. Sin WebSocket (coste desproporcionado). | `vista/usarCarga.ts`, nuevo `vista/usarSincronia.ts` | Con dos pestañas, lo hecho en A aparece en B al enfocarla; con modal abierto, `filaViva` lo refleja. |
| F5 | **Otros escritores.** Siguen escribiendo sin versión: `frontend-legacy` (túnel 14190) y las herramientas del agente (`src/agent/tools.rs:124,194`). Dar versión al legacy o retirarlo; en el agente, leer-modificar-escribir en una transacción con `FOR UPDATE`. Al final, con un log temporal que confirme que no queda ningún PUT sin versión, hacer `expectedUpdatedAt` obligatorio (422 si falta). | `src/agent/tools.rs`, `src/handlers/productivity.rs`, legacy | Log de una semana sin PUT sin versión antes de endurecer. |
| F6 | **Recuperar los subhábitos.** El servidor no los conserva (no hay borrado lógico del campo). Mirar si hay un respaldo de la base con ellos; si no, volver a escribirlos **después de F1**. | — (solo lectura de respaldos) | Subhábitos de MN INMOBILIARIA de nuevo, o reintroducidos por la usuaria. |
| F7 | **Prueba real y cierre.** Build en la 89, dos pestañas + app local: A añade 3 subhábitos, B (copia vieja) renombra el hábito; ambos cambios persisten. `gate --inicio`/`--cierre`, tests, doc en `Agente/documentacion/` y `Arranque cierre`. | — | Gate sin hallazgos nuevos; escenario verde. |

Orden: F1 → F2 → F3 → F4 → F6 → F5 → F7 (F6 tras F1 para no volver a perderlos; F5 al final por tocar el legacy y el contrato).

## Decisiones tomadas

- Bloqueo por versión de fila, no fusión campo a campo: el servidor ya lo soporta y es el cambio más pequeño.
- Refresco al enfocar, no tiempo real: basta para una persona con varias pestañas.
- Las pendientes viejas se descartan con aviso en vez de reenviarse a ciegas: perder un cambio offline avisado es mejor que borrar datos nuevos sin aviso.
- Endurecer el servidor (versión obligatoria) solo cuando no quede cliente sin versión.
- F6 (decidido por la usuaria): no reescribir los subhábitos de MN INMOBILIARIA. Los respaldos `task-20261028-0533.dump` y `89-glory.dump` no los contienen; solo tienen los de «Proyecto Ikarus» (6) y «Proyecto Wan» (3), con su historial intacto.
- F5 (decidido por la usuaria): darle versión al legacy de 14190, no retirarlo. Pendiente: `frontend-legacy` manda `expectedUpdatedAt: null` y el payload completo; y las herramientas del agente (`src/agent/tools.rs`) mandan `payload: {}` al actualizar, lo que borra los subhábitos del payload. Eso se corrige con lectura-merge-escritura en transacción.

## Riesgos

- Reaplicar `cambiar` solo es seguro si la transformación es idempotente respecto al destino (F2).
- Subir a F5 la versión obligatoria rompe al legacy si queda en uso: por eso va al final y con log.
- Cada fase toca código: gate al empezar y al cerrar, y tests en la 89.

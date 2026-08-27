# Manual del plugin de agente de IA

Referencia canónica del plugin `agente` del proyecto TASKS. Complementa el plan
`Agente/planes/plan-agente-ia-plugin-2026-08-27.md` con el contrato ejecutable
(endpoints, SSE, herramientas, sandbox, modos, tareas programadas y tabs).

## 1. Contrato de red (backend Rust/Axum)

Todas las rutas van bajo `/api/agente` y exigen sesión de usuario (`user_id` del
token; nunca del cuerpo de la petición).

| Método | Ruta                                            | Descripción                                                        |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------ |
| POST   | `/api/agente/conversaciones`                    | Crea una conversación (body: `{ titulo?, modo? }`) → id UUID       |
| GET    | `/api/agente/conversaciones`                    | Lista las conversaciones del usuario                               |
| PATCH  | `/api/agente/conversaciones/:id`                | Renombra la conversación (`{ titulo }`) — propietario o 404        |
| DELETE | `/api/agente/conversaciones/:id`                | Borra la conversación y sus mensajes — propietario o 404           |
| GET    | `/api/agente/conversaciones/:id/mensajes`       | Historial persistido (usuario + asistente) — propietario o 404     |
| POST   | `/api/agente/stream`                            | Streaming SSE de un turno (mensaje, vuelca llama al agente)        |
| GET    | `/api/agente/scheduled-tasks`                   | Lista tareas programadas del usuario                               |
| POST   | `/api/agente/scheduled-tasks`                   | Crea una tarea programada (proposal validada, no escribe antes)    |
| PATCH  | `/api/agente/scheduled-tasks/:id`               | Actualiza una tarea programada (propuesta/confirmación separadas)  |
| DELETE | `/api/agente/scheduled-tasks/:id`               | Borra una tarea programada — propietario o 404                     |

### Propuesta vs confirmación (recordatorios y tareas programadas)

Invariante de escritura: **una propuesta nunca escribe en el almacén final
antes de que el usuario la confirme.** El agente emite un evento de propuesta
(recordatorio o tarea programada) en el SSE; la escritura real ocurre solo con
la confirmación explícita del usuario en la interfaz. `idempotency_key`:
misma clave → misma entidad, sin duplicados (`ON CONFLICT` en BD).

### Zona horaria

La semántica de usuario es **hora local sin sufijo de zona horaria**
(`2026-08-28T09:00` = 09:00 local). El backend convierte ida/vuelta de forma
coherente entre el cliente y el almacenamiento UTC, de modo que no desvía la
hora.

### Eventos SSE (`POST /api/agente/stream`)

Stream `text/event-stream`. Eventos:

- `mensaje_inicio` / `token` — streaming incremental de la respuesta del LLM.
- `tool_result` — resultado de una herramienta (estado `ok`/`error`, args,
  resultado truncado).
- `requiere_aprobacion` — tool marcada como `efecto` en modo `predeterminado`;
  el runtime no la ejecuta hasta que el usuario aprueba.
- `error` — con campo `retryable` (true = fallo de proveedor transitorio;
  el front puede ofrecer "reintentar").
- `final` — cierre del turno con el contenido del asistente (persistido).

## 2. Herramientas

### De dominio (todas las cuentas; validadas por `user_id`)

`crear_tarea`, `completar_tarea`, `actualizar_tarea`, `crear_habito`,
`completar_habito`, `crear_nota`, `crear_recordatorio`, `programar_tarea`,
`web_search` (con límites y coste).

### De archivo (SOLO `AGENTE_MODO=local`; nunca en producción, ni siquiera admin)

`file_read`, `file_write`, `file_patch`, `file_search`. Fail-closed: si no hay
sandbox (`AGENTE_MODO != local` o `AGENTE_WORKSPACE_ROOT` inaccesible) las
tools **no se registran**; llamarlas devuelve error claro, no falso éxito.

#### Sandbox

- Allowlist por `canonicalize` + prefijo con separador + case-insensitive;
  `..` y rutas absolutas fuera del workspace rechazadas.
- Lista negra de secretos aplicada **antes** de leer: `.env`, `*.pem`,
  `.ssh/*`, `*_KEY`, `.git/config`.
- Junctions/symlinks/OneDrive resueltos por `canonicalize` (el check es sobre
  la ruta canónica, no escapa).
- Los flujos que escriben (`file_write`, `file_patch`) llevan `efecto: true`:
  en modo `predeterminado` requieren aprobación explicita.

`AGENTE_WORKSPACE_ROOT` se usa solo en local (fallback: el cwd). En producción
**no debe existir** (no hay workspace de archivos).

## 3. Modos de operación

| Modo           | Efecto                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| `predeterminado` | Tools de dominio ejecutan (son del usuario, auditar); tools `efecto` requieren aprobación (evento `requiere_aprobacion`). |
| `meta`         | Igual que predeterminado + puede proponer configurar sus propias reglas. |
| `autónomo`     | Ejecuta tools `efecto` sin pedir aprobación previa (verificador/auditoría posterior). |

El modo viaja en la creación de la conversación y en `POST /stream`; el
runtime lo aplica por conversación.

## 4. Autorecuperación de proveedor

Circuit breaker por proveedor: N fallos consecutivos → cooldown; un acierto
resetea. En un fallo `retryable`, el turno queda `pendiente` y el front ofrece
reintentar (re-POST con la misma conversación). No hay falso éxito: si todos
los proveedores caen, el stream emite `error` con `retryable: true` y una
lista honesta de los fallos.

## 5. Persistencia y tabs

- Mensajes (usuario y asistente) persistidos en `agente_mensajes`. Recargar
  conserva el historial (el panel lo carga vía
  `GET /agente/conversaciones/:id/mensajes` por tab).
- Cada conversación es una **tab** con su propio contexto y estado.
- Auditoría por turno/acción en `agente_turnos` + `agente_acciones`
  (cada tool ejecutada queda registrada con `ok`/`error`).

## 6. Aprobación de modo en producción (fail-closed)

En `AGENTE_MODO=prod` (sin valor o distinto de `local`):

- No se registran las herramientas de archivo (ni para admin).
- Las tools de dominio se validan por `user_id` del token en el backend.
- Toda mutación queda auditada en `agente_acciones`.
- Confirmación para acciones destructivas vía el mecanismo `requiere_aprobacion`.

## 7. Invariantes y límites

- Límite de turns por turno: 10. Timeout por tool: 15s. Timeout global: 180s.
- Cancelación: el cierre del canal SSE corta el loop en el servidor (drop del
  sender).
- Presupuesto de tokens de tools y techo de coste del proveedor con
  `require_auth`.
- Errores nunca silenciados: se emiten como evento `error` con contexto.
# Plan: IA esencial, persistente y segura

**Fecha:** 2026-08-27  
**Estado:** Activo — diseño y ejecución por fases  
**Alcance:** migrar las capacidades útiles del asistente legacy al backend Rust y al frontend actual, sin conservar dependencias innecesarias.  
**Fuera de alcance temporal:** WhatsApp, publicación automática en GitHub y cualquier acción externa irreversible sin aprobación explícita.

## 1. Objetivo

La IA debe funcionar como un asistente operativo del usuario, no como un conjunto de rutas legacy desconectadas. Debe poder leer el estado actual del usuario, proponer cambios, ejecutar acciones locales seguras y pedir confirmación cuando exista riesgo.

El backend es la fuente de verdad para datos persistentes. El frontend solo mantiene estado de UI/cache y debe consumir contratos Rust estables. Ninguna API key debe exponerse al navegador.

## 2. Capacidades objetivo

### 2.1 Consulta

- Listar y buscar tareas pendientes y completadas.
- Consultar hábitos, frecuencia, importancia, dificultad y estado del día.
- Consultar proyectos, grupos y dependencias.
- Leer notas completas del usuario.
- Consultar recordatorios activos y vencidos.
- Buscar información web bajo demanda.
- Explicar qué datos utilizó para responder.

### 2.2 Tareas

- Crear tarea.
- Completar y desmarcar tarea.
- Editar cualquier propiedad compatible:
  - texto;
  - prioridad;
  - urgencia;
  - dificultad EXP;
  - fecha límite;
  - proyecto;
  - grupo de ejecución;
  - tarea padre;
  - descripción;
  - repetición;
  - etiquetas y configuración.
- Crear y modificar subtareas.
- Mover tareas entre proyectos y grupos.

### 2.3 Hábitos

- Crear hábito.
- Completar y desmarcar el día actual.
- Registrar o quitar un día histórico.
- Modificar:
  - nombre;
  - importancia;
  - dificultad EXP;
  - frecuencia;
  - ventana de oportunidad;
  - grupo;
  - dependencias;
  - pausa y posposición.
- Gestionar subhábitos.

### 2.4 Recordatorios

- Crear recordatorio con título, mensaje y fecha/hora.
- Listar, modificar, completar y cancelar recordatorios.
- Validar fechas pasadas, zona horaria y duplicados.
- Persistir en backend por usuario.
- Requerir confirmación antes de crear o cancelar si el usuario no lo pidió claramente.

### 2.5 Búsqueda web

- Ejecutar búsqueda web mediante un proveedor backend configurado.
- Usar timeout, límite de resultados y tamaño máximo de respuesta.
- Mostrar fuente, título, URL y resumen.
- No enviar secretos ni datos privados del usuario al buscador.
- Degradar con un error visible si no hay proveedor configurado.

### 2.6 Acciones excluidas

- WhatsApp queda pendiente.
- GitHub externo queda pendiente salvo que se implemente como borrador local.
- No se ejecutan acciones destructivas sin confirmación explícita.

## 3. Arquitectura objetivo

```text
Panel IA
  ↓
usePanelIA
  ↓
procesarMensajeIA
  ↓
/api/ai/chat                    conversación LLM
/api/ai/tools/*                  herramientas autenticadas
  ↓
servicios Rust
  ↓
repositorios SQL por user_id
```

### Reglas arquitectónicas

1. **Una sola fuente de verdad:** tareas, hábitos, proyectos, notas y recordatorios persistentes viven en backend.
2. **Identidad obligatoria:** toda lectura y escritura se filtra por `AuthUser.user_id`.
3. **Contrato explícito:** cada herramienta tiene request/response tipados y validación.
4. **Sin efectos implícitos:** el modelo propone una acción estructurada; el ejecutor valida y aplica.
5. **Confirmación por riesgo:** eliminar, cancelar o crear acciones externas requiere confirmación.
6. **Idempotencia:** repetir una solicitud no debe duplicar recordatorios ni registros de cumplimiento.
7. **Auditoría:** cada acción ejecutada registra tipo, usuario, resultado y referencia de entidad.
8. **Errores observables:** nunca convertir un 401/403/404/429 en una respuesta genérica de éxito.

## 4. Fases de trabajo

## Fase 0 — Inventario y contrato

### Tareas

- Enumerar todas las acciones del prompt actual.
- Clasificar cada acción como:
  - local segura;
  - lectura backend;
  - escritura backend;
  - destructiva;
  - externa.
- Eliminar del prompt las capacidades que no se implementarán todavía.
- Definir esquema común:

```json
{
  "tipo": "editar_tarea",
  "parametros": {},
  "requiereConfirmacion": false,
  "idempotencyKey": "..."
}
```

### Definition of Done

- Prompt y ejecutores usan la misma lista.
- No aparecen acciones legacy no soportadas.
- WhatsApp está explícitamente marcado como pendiente.

## Fase 1 — Herramientas locales de tareas y hábitos

### Tareas

- Centralizar ejecutores en un registro tipado de herramientas.
- Validar IDs contra el estado actual y el usuario autenticado.
- Permitir edición parcial sin borrar campos no enviados.
- Añadir dificultad y frecuencia a los schemas de edición.
- Garantizar que completar/desmarcar actualiza:
  - entidad;
  - historial real;
  - actividad derivada;
  - EXP cuando corresponda;
  - sincronización entre pestañas.
- Mantener confirmación para eliminaciones.

### Casos de prueba

- Crear tarea con solo texto.
- Editar solo urgencia sin borrar prioridad.
- Editar solo frecuencia de hábito sin borrar importancia.
- Completar hábito dos veces rápidamente.
- Completar y deshacer.
- Acción con ID inexistente.
- Acción con ID de otra entidad.
- Acción con parámetros vacíos.

## Fase 2 — Notas y recordatorios en Rust

### Backend

Crear rutas autenticadas y documentadas:

- `GET /api/notes/{id}`
- `GET /api/reminders`
- `POST /api/reminders`
- `PUT /api/reminders/{id}`
- `DELETE /api/reminders/{id}`
- `POST /api/reminders/{id}/complete`

### Requisitos

- UUID o ID nativo validado según el modelo.
- `user_id` aplicado en todas las consultas.
- Fechas ISO 8601 y zona horaria explícita.
- Límite de longitud para título y mensaje.
- Idempotency key para creación.
- No borrar historial de recordatorios completados sin una acción explícita.

### Frontend

- Sustituir `agentActionsService` para notas y recordatorios por `apiFetch`.
- Mantener errores visibles.
- Actualizar stores tras respuesta confirmada.
- Invalidar cache cuando una herramienta modifica datos.

## Fase 3 — Búsqueda web backend

### Backend

Crear un servicio `WebSearchService` con:

- proveedor configurable por env;
- timeout estricto;
- máximo de resultados;
- máximo de bytes de respuesta;
- sanitización de URLs y textos;
- fallback explícito si existe un segundo proveedor.

Ruta propuesta:

- `POST /api/ai/tools/web-search`

Request:

```json
{
  "query": "texto",
  "limit": 5
}
```

Response:

```json
{
  "provider": "serper",
  "query": "texto",
  "results": [
    {"title": "...", "url": "...", "summary": "..."}
  ]
}
```

### Seguridad

- No aceptar URLs arbitrarias para scraping directo.
- No reenviar cookies, tokens ni contexto privado.
- No permitir que el modelo cambie el proveedor o la API key.
- Aplicar rate limit por usuario.

## Fase 4 — Configuración completa desde frontend

La sección IA debe permitir configurar, sin exponer secretos:

### Proveedor y modelo

- proveedor activo;
- modelo;
- fallback habilitado/deshabilitado;
- orden de proveedores;
- prueba de conexión.

### Comportamiento

- temperatura;
- máximo de tokens;
- tamaño máximo de contexto;
- idioma;
- estilo de respuesta;
- incluir tareas completadas;
- incluir hábitos pausados;
- incluir notas en contexto: nunca por defecto, solo bajo consulta explícita.

### Permisos

- consultar tareas;
- modificar tareas;
- consultar hábitos;
- modificar hábitos;
- consultar notas;
- crear recordatorios;
- búsqueda web;
- eliminar entidades: siempre requiere confirmación y no debe poder desactivarse.

### Confirmaciones

- confirmar siempre acciones destructivas;
- confirmar recordatorios nuevos si tienen fecha futura;
- confirmar cambios masivos;
- mostrar resumen antes de aplicar una operación múltiple.

### Privacidad y límites

- mostrar que las claves viven en backend;
- mostrar proveedor/modelo efectivo;
- mostrar consumo y rate limit cuando exista;
- permitir limpiar historial local y, cuando esté disponible, historial backend;
- no guardar API keys en localStorage.

## Fase 5 — Migración de rutas legacy

### Sustituir

- `/agent/chat/messages` → almacenamiento persistente de conversación definido para Rust o historial local claramente separado.
- `/agent/research` → `/api/ai/tools/web-search` y búsqueda local backend.
- `/agent/actions/reminder` → `/api/reminders`.
- `/agent/actions/github` → pendiente.
- `/agent/actions/whatsapp` → pendiente.
- `/agent/analyze` → eliminar del prompt actual hasta tener contrato Rust equivalente.

### Regla

No mantener funciones frontend que llamen una ruta que el backend actual no registra. Si una capacidad está pendiente, debe devolver un estado explícito de `no disponible`, no un 404 crudo ni un falso éxito.

## Fase 6 — Pruebas end-to-end

### Pruebas backend

- usuario A no puede consultar entidades de usuario B;
- usuario sin permisos recibe 403;
- ID inexistente recibe 404;
- JSON inválido recibe 422;
- límites reciben 413/429;
- timeout del proveedor devuelve error observable;
- proveedor alternativo funciona cuando el primero falla;
- no se exponen claves en logs ni respuestas.

### Pruebas frontend

- configuración se conserva tras recarga;
- proveedor y modelo inválidos se corrigen o muestran error;
- envío vacío no llama API;
- abortar una petición libera el estado `enviando`;
- desmontar el panel aborta la petición activa;
- respuesta con acción destructiva muestra confirmación;
- rechazo no modifica entidad;
- confirmación modifica entidad y actualiza la UI;
- errores de herramientas se muestran en el mensaje de acción.

### Pruebas de paridad

Añadir a `.freebuff/verify-parity.mjs`:

- crear tarea desde IA y verificar persistencia;
- editar tarea parcialmente y verificar campos no enviados;
- completar/desmarcar tarea;
- crear y completar hábito;
- crear recordatorio;
- leer nota;
- búsqueda web con skip documentado si falta la API key;
- confirmar que WhatsApp no se ejecuta ni se simula.

## 5. Decisiones y no decisiones

### Decisiones

- Rust es la autoridad para datos persistentes.
- El frontend no llama proveedores LLM directamente para el administrador.
- Las claves no se persisten en navegador.
- Las eliminaciones requieren confirmación.
- WhatsApp queda fuera de esta iteración.

### Pendiente de decidir

- Proveedor definitivo de búsqueda web.
- Si el historial de conversación será completamente backend o local por sesión.
- Modelo de persistencia de recordatorios y ejecución programada.
- Si GitHub se añadirá como borrador local o integración aprobable.

## 6. Riesgos

| Riesgo | Detección | Mitigación |
|---|---|---|
| Acción sobre entidad de otro usuario | Prueba de aislamiento por `user_id` | Todas las queries reciben usuario autenticado |
| Duplicación por reintento | Test con misma idempotency key | Índice/constraint y claves idempotentes |
| IA inventa IDs | Test con ID inexistente | Validar contra datos actuales antes de ejecutar |
| Cambio parcial borra campos | Test de patch parcial | Merge explícito y schemas opcionales |
| Fallback usa key inválida | Test de rotación | Reportar proveedor y error sin secretos |
| Búsqueda lenta | Timeout medido | Timeout y límite de bytes |
| Acción destructiva automática | Test sin confirmación | Estado pendiente obligatorio |
| Estado frontend obsoleto | Prueba con dos pestañas | WebSocket/sync y recarga confirmatoria |

## 7. Definition of Done global

- No hay llamadas a `/agent/...` para capacidades declaradas como esenciales.
- Tareas y hábitos pueden consultarse, crearse, editarse y completarse desde IA.
- Notas se pueden leer con autorización.
- Recordatorios se crean y persisten en backend.
- Búsqueda web funciona o muestra un skip legítimo si falta configuración.
- WhatsApp permanece fuera del prompt y del ejecutor activo.
- Todas las acciones destructivas requieren confirmación.
- Configuración frontend completa y persistente.
- `npx tsc --noEmit` limpio.
- `cargo test` limpio.
- Suite de paridad verde, con skips documentados únicamente por credenciales externas ausentes.
- Logs sin secretos.
- Documentación del contrato y del runbook actualizada.

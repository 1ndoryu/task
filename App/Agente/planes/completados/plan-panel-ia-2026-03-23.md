# Plan: Panel de IA para Planificación — 233A-69
**Fecha inicio:** 2026-03-23
**Estado:** Todas las fases completadas

## Objetivo
Panel de chat con IA integrado en el dashboard que permite planificación de tareas/hábitos por texto natural. El usuario escribe instrucciones y la IA ejecuta acciones (crear tareas, hábitos, completar, archivar, eliminar, etc.).

## Requisitos funcionales
1. **Chat panel** — panel como los otros (minimizable, movible, con orden/columna)
2. **Texto libre** → la IA interpreta y ejecuta acciones
3. **Acciones disponibles:**
   - Crear tareas (con fecha, importancia, tags, proyecto, descripción)
   - Crear hábitos (con frecuencia, importancia)
   - Completar/descompletar tareas y hábitos
   - Archivar/desarchivar tareas
   - Eliminar tareas/hábitos
   - Posponer tareas/hábitos
   - Planificar día completo, semana, etc.
4. **Preferencias del usuario** — configuración de preferencias que la IA usa al ordenar/crear
5. **Limpiar chat** — botón para borrar historial de conversación
6. **Contador de tokens** — visible en el panel, muestra tokens usados en la sesión
7. **Optimizado para contexto** — instrucciones claras y compactas para no exceder la ventana

## Arquitectura propuesta

### Frontend
- `PanelIA.tsx` — componente del panel (registrado en `registroPaneles`)
- `usePanelIA.ts` — hook con lógica del chat (mensajes, envío, limpieza)
- `iaStore.ts` — store Zustand para preferencias y estado del chat
- `panelIA.css` — estilos del panel

### Backend
- `AIApiController.php` (ya existe) — endpoint para chat
- System prompt con:
  - Lista de acciones disponibles (JSON schema)
  - Preferencias del usuario
  - Resumen de tareas/hábitos actuales (compactado)

### Flujo
1. Usuario escribe mensaje
2. Frontend envía: mensaje + contexto compacto (tareas hoy, hábitos activos, preferencias)
3. Backend procesa con modelo de IA (API key del usuario o del servidor)
4. IA responde con texto + acciones estructuradas (JSON)
5. Frontend ejecuta las acciones (crear tarea via store, completar, etc.)
6. Muestra respuesta en el chat

### Optimización de contexto
- Enviar solo resumen compacto de estado actual (no todo el historial)
- Acciones como objetos JSON mínimos en el system prompt
- Token counter client-side (estimación por caracteres: ~4 chars/token)
- Límite de historial de mensajes en la sesión (últimos N mensajes)

## Fases de implementación
1. **Fase 1 — Infraestructura base:** Registro del panel, componente esqueleto, store, CSS
2. **Fase 2 — Chat básico:** Envío de mensajes, display de respuestas, scroll automático
3. **Fase 3 — Acciones:** System prompt con schema de acciones, parsing de respuesta, ejecución
4. **Fase 4 — Contexto:** Inyectar estado actual del usuario al prompt
5. **Fase 5 — Preferencias:** Configuración editable que se inyecta al prompt
6. **Fase 6 — Pulido:** Contador de tokens, limpiar chat, UX

## Dependencias
- API key de IA (configurada por el usuario en SeccionConfigMCP o nueva sección)
- `AIApiController.php` — verificar endpoints existentes
- Registro de paneles — agregar panel IA como plugin o panel nativo

## Próximo paso
Completado. Ver tareas-2026-03-23.md en completados/.

## Avance
### Fase 1 — Completada (commit d090b35a3)
- `iaStore.ts`: Store Zustand con persist (apiKey, modelo, preferencias persistente; mensajes, enviando, error en memoria)
- `iaService.ts`: Servicio para comunicación con Groq API (OpenAI-compatible)
- `usePanelIA.ts`: Hook con lógica del chat extraída del componente
- `PanelIA.tsx`: Componente con chat funcional básico (burbujas, input, scroll auto)
- `panelIA.css`: Estilos del panel
- Registrado en `inicializarPaneles.ts` con id 'ia', visible por defecto: false
- Generador de props en `generadoresPropsPanel.ts` (extraído de useDashboardGrid.ts para respetar límite de líneas)
- TS 6.0: actualizado ignoreDeprecations en tsconfig.json

### Fase 2+3 — Completada
- `accionesIA.ts`: Definiciones de acciones, system prompt, parsing JSON, ejecución
  - EjecutoresTareasIA: interface para CRUD de tareas (recibido via props del dashboard)
  - Hábitos: acceso directo via useHabitosStore.getState() (no requiere props)
  - System prompt: roles, acciones disponibles con parámetros, reglas, contexto dinámico
  - Parser: JSON directo → code block → fallback texto plano. Limpia <think> blocks.
  - Ejecutor: valida IDs, valida enums, try-catch por acción, retorna ResultadoAccion[]
- `iaService.ts`: procesarMensajeIA() — flujo completo en una sola llamada
- `usePanelIA.ts`: Simplificado, delega a procesarMensajeIA (100 líneas, bajo límite 120)
- `PanelIA.tsx`: Recibe EjecutoresTareasIA como props, muestra badges de acciones ejecutadas
- `generadoresPropsPanel.ts`: Pasa ctx.dashboard.crearTarea/toggleTarea/etc al panel IA
- `panelIA.css`: Estilos de badges de acciones (exito verde, error rojo)
- Gotcha: NivelPrioridad es lowercase ('muy_alta'|'alta'|'media'|'baja'), NivelImportancia es PascalCase ('Muy Alta'|'Alta'|'Media'|'Baja')

### Fase 4-5 — Completada
- Config inline en PanelIA: Settings icon en header, sección colapsable
- API Key: Input password para Groq API key
- Modelo: Select con MODELOS_IA (6 modelos Groq)
- Preferencias: Textarea para instrucciones personales que se inyectan al system prompt
- Todo se persiste en iaStore (partialize: apiKey, modelo, preferenciasUsuario)

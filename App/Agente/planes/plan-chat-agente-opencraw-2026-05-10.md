# Plan Chat Agente + Research + Acciones Externas — 2026-05-10

## Estado
- Base implementada: selector Groq/DeepSeek, prompt system, proxy backend admin con env rotation, panel IA sin mensajes Groq-only.
- OpenClaw documentado: requiere Gateway propio, Node 22.16+/24, onboarding, puerto 18789, canales, tareas programadas, approvals, tools, WhatsApp y OpenAPI. La integración queda como fase separada para no acoplar el dashboard a un daemon sin instalar/configurar.
- 2026-05-11: primer slice de acciones externas implementado sin exponer permisos al prompt: tabla `glory_agent_actions`, endpoints admin-only `/agent/actions`, `/agent/actions/whatsapp`, `/agent/actions/{id}/approve` y estado `/agent/wacli/status`.
- 2026-05-11: WhatsApp usa `wacli` como proveedor planificado/soportado por backend. Requiere instalar/autenticar `wacli` en el servidor y configurar `WACLI_BIN`, `WACLI_ACCOUNT` opcional y `WHATSAPP_AGENT_TO`/`WHATSAPP_TO`/`WHATSAPP`.
- 2026-05-11: el chat ya puede generar `proponer_whatsapp`; el panel lo muestra como acción pendiente y solo ejecuta `/approve` cuando el admin confirma.
- Documentación: https://docs.openclaw.ai/start/getting-started

## Fases
1. **Proveedor IA y seguridad** — Completado en `105A-2`.
   - Usuarios normales usan su API key local.
   - Admin puede omitir key local y usar env `GROQ_API*` o `DEEPSEEK_API*` vía backend.
2. **Persistencia y auditoría del chat** — En progreso.
   - Guardar conversaciones queda pendiente.
   - Acciones propuestas, aprobadas, ejecutadas y resultado quedan persistidas en `glory_agent_actions`.
   - Añadir rate limit por usuario y límites de tokens.
3. **Research/Web** — Pendiente.
   - Definir interfaz `ResearchProvider` antes de integrar OpenClaw/Firecrawl/web search.
   - Integrar vía Gateway/OpenAPI o herramienta configurada, con auth y timeout por tarea.
4. **GitHub** — Pendiente.
   - Usar GitHub App/OAuth por usuario o token admin scoped.
   - Separar acciones: lectura, preparar diff, abrir PR, comentar, asignar tarea.
   - Toda acción destructiva o push directo requiere aprobación explícita en UI.
5. **WhatsApp y recordatorios** — En progreso.
   - Proveedor elegido para mensajes personales: `openclaw/wacli`.
   - Flujo seguro actual: proponer mensaje -> guardar acción -> aprobar como admin -> ejecutar `wacli send text`.
   - UI de aprobación básica conectada en el chat.
   - Falta pairing/daemon en servidor y pantalla de historial dedicada.
   - Recordatorios mediante scheduler persistente, no timers del navegador.
6. **Trabajos largos** — Pendiente.
   - Cola/worker para investigación, crawls, mensajes externos y correcciones de código.
   - Estados visibles: pendiente, ejecutando, requiere aprobación, completado, fallido.
7. **Observabilidad** — Pendiente.
   - Logs por acción, IDs de correlación y errores visibles para usuario/admin.

## Gotchas
- No dar permisos reales al chat solo por prompt: las herramientas deben estar whitelisted por backend.
- No exponer API keys admin al frontend.
- No anunciar GitHub/WhatsApp/OpenCraw como acciones ejecutables hasta que exista backend, permisos y aprobación.
- `wacli` es CLI, no daemon/web UI; para automatización continua conviene tener `sync --follow` o Gateway/worker separado. El endpoint PHP solo debe ejecutar comandos acotados y aprobados.
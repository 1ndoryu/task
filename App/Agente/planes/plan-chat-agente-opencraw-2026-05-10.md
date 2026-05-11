# Plan Chat Agente + Research + Acciones Externas — 2026-05-10

## Estado
- Base implementada: selector Groq/DeepSeek, prompt system, proxy backend admin con env rotation, panel IA sin mensajes Groq-only.
- OpenClaw documentado: requiere Gateway propio, Node 22.16+/24, onboarding, puerto 18789, canales, tareas programadas, approvals, tools, WhatsApp y OpenAPI. La integración queda como fase separada para no acoplar el dashboard a un daemon sin instalar/configurar.

## Fases
1. **Proveedor IA y seguridad** — Completado en `105A-2`.
   - Usuarios normales usan su API key local.
   - Admin puede omitir key local y usar env `GROQ_API*` o `DEEPSEEK_API*` vía backend.
2. **Persistencia y auditoría del chat** — Pendiente.
   - Guardar conversaciones, acciones propuestas, acciones ejecutadas y resultado.
   - Añadir rate limit por usuario y límites de tokens.
3. **Research/Web** — Pendiente.
   - Definir interfaz `ResearchProvider` antes de integrar OpenClaw/Firecrawl/web search.
   - Integrar vía Gateway/OpenAPI o herramienta configurada, con auth y timeout por tarea.
4. **GitHub** — Pendiente.
   - Usar GitHub App/OAuth por usuario o token admin scoped.
   - Separar acciones: lectura, preparar diff, abrir PR, comentar, asignar tarea.
   - Toda acción destructiva o push directo requiere aprobación explícita en UI.
5. **WhatsApp y recordatorios** — Pendiente.
   - Definir proveedor oficial (Cloud API/Twilio), webhooks firmados y cola de envío.
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
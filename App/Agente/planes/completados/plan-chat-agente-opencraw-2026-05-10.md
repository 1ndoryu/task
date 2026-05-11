# Plan Chat Agente + Research + Acciones Externas — 2026-05-10

## Estado
- Completado el 2026-05-11 como bloque `105C`.
- El chat IA persiste conversaciones por sesión en `glory_agent_chat_messages`.
- Las acciones propuestas/aprobadas/programadas/ejecutadas quedan persistidas en `glory_agent_actions` con logs y `correlation_id`.
- Research funciona en local con `LocalResearchProvider` sobre notas, tareas y hábitos.
- WhatsApp funciona con `openclaw/wacli` si está instalado/autenticado y con dry-run local cuando `WACLI_LOCAL_MODE=true`.
- GitHub queda implementado como borrador aprobable (`github_draft`) para evitar publicar sin scopes/OAuth explícitos.
- Recordatorios se programan como acciones persistidas y se ejecutan por WP-Cron creando notificaciones locales.
- Observabilidad base completada con logs por acción, estados y resultados persistidos.

## Fases cerradas
1. **Proveedor IA y seguridad** — Completado en `105A-2`.
2. **Persistencia y auditoría del chat** — Completado en `105C`.
3. **Research/Web** — Completado en local en `105C`; OpenClaw/Firecrawl queda como provider futuro por interfaz.
4. **GitHub** — Completado como borrador aprobable en `105C`; publicación real queda pendiente de GitHub App/OAuth.
5. **WhatsApp y recordatorios** — Completado en `105C`, incluyendo WACLI local mode y scheduler.
6. **Trabajos largos** — Baseline completada en `105C` con acciones programadas y WP-Cron.
7. **Observabilidad** — Baseline completada en `105C` con logs, resultados y correlación.

## Decisiones
- No dar permisos reales al chat solo por prompt: las tools quedan whitelisted en backend.
- No exponer API keys admin al frontend.
- En local, las acciones externas deben degradar a dry-run seguro cuando el proveedor externo no está instalado.
- `ResearchProviderInterface` se precarga antes del barrido recursivo de `App/` porque PHP necesita la interfaz antes de incluir clases que la implementan.

## Documentación
- `App/Agente/documentacion/ia/agente-chat-research-local-2026-05-11.md`
- `App/Agente/documentacion/ia/wacli-whatsapp-2026-05-11.md`

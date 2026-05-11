# GloryTemplate Roadmap

> **Descripcion:** Dashboard personal con tareas, habitos, proyectos, notas, actividad y mas. Tema WordPress con React islands.
> **Stack:** WordPress + PHP (backend REST), React + TypeScript (frontend islands), Zustand (estado), CSS modular
> **URL produccion:** https://task.nakomi.studio
> **Servidor:** nakomi (Coolify) stack UUID: u00gc8ss4csc4cckkg4g00ks
> **Deploy:** Coolify (.agent/coolify-manager-rs) sitio: nakomi
> **Repositorio:** glorytemplate: rama glory-react-logic
> **Espejo:** https://github.com/1ndoryu/task (rama main = glory-react-logic). Push: `git push task`. Submodulos: Glory, .agent/code-sentinel, .agent/varsense, .agent/coolify-manager-rs, .agent/coolify-manager.

## Herramientas del agente

- Code Sentinel: `.agent/code-sentinel`
- VarSense: `.agent/varsense`
- Coolify Manager: `.agent/coolify-manager-rs`

## Tareas pendientes

### 109A — MemPalace: memoria semántica del chatbot
- Instalar MemPalace en el servidor host + Flask REST wrapper en /data/mempalace/
- Systemd service `mempalace-api` en 127.0.0.1:4001
- Añadir `extra_hosts: host.docker.internal:host-gateway` al compose de nakomi
- `MemPalaceService.php`: search + remember via HTTP al wrapper
- `AgentChatProcessor.php`: motor PHP para procesar mensajes (context, LLM, acciones, memoria)
- Integrar memoria en el flujo: inyectar en system prompt, guardar hechos al final

### 109B — WhatsApp bidireccional + recordatorios recurrentes
- Systemd service `wacli-daemon` en el host: `wacli sync --follow --webhook URL --webhook-secret SECRET`
- `WhatsAppWebhookService.php`: HMAC verify + rutear mensaje al AgentChatProcessor
- Endpoint público `POST /wp-json/glory/v1/whatsapp/webhook` (auth via HMAC)
- Recordatorios recurrentes: `every_5_minutes` WP-Cron schedule + payload.recurrence_minutes
- WACLI_WEBHOOK_SECRET env var en Coolify + local

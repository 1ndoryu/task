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

### 135A-1 — Miniagentes: PlannerAgent, ContextAgent, ReminderAgent
Planificado en 125A-11 pero no implementado. Crear 3 miniagentes que usen el modelo más inteligente de Groq para refinar pasos intermedios:
- **PlannerAgent**: convierte solicitudes complejas en pasos verificables, decide si necesita OpenCode.
- **ContextAgent**: resume contexto largo y memorias antes del prompt principal (reduce tokens y mejora coherencia).
- **ReminderAgent**: recalcula fechas/recurrencias con razonamiento, genera el mensaje final del recordatorio con contexto real del usuario. Esto corrige que el agente a veces no recuerda ni avisa, o lo hace a la hora incorrecta.
Todos deben respetar el gate de permisos del servidor (`puedeUsarAccionesCodigo`). Para usuarios normales, solo operan sobre datos personales.

### 135A-2 — Reducción y optimización del system prompt
El prompt actual no fue auditado para eficiencia. Revisar si las instrucciones están ordenadas y son útiles para el modelo:
- Medir tokens del system prompt actual.
- Eliminar redundancias, instrucciones contradictorias o poco usadas.
- Reorganizar por relevancia (lo más importante primero).
- Verificar que las instrucciones de acciones no disponibles para el usuario actual no se incluyan (ya parcialmente hecho, verificar completitud).
- Meta: reducir al menos 20% los tokens del prompt sin perder capacidad de respuesta.

### 135A-3 — OpenCode/DeepSeek como canal LLM directo
Investigar si se puede usar OpenCode como proveedor LLM para el chatbot (deepseek flash v4 con pensamiento máximo es mejor que gpt-oss-120b):
- Evaluar si el runner de OpenCode puede usarse en modo "consulta LLM" sin lanzar un job de código.
- Si no es viable, integrar deepseek-v4-flash como modelo configurable por el usuario (no solo fallback).
- No reemplazar la integración actual — debe ser aditivo y configurable.
- Documentar qué modelos de Groq y DeepSeek están disponibles y en qué capa (chat directo vs OpenCode).

### 135A-4 — Auto-reconexión wacli cuando pierde el WebSocket de WhatsApp
El daemon wacli perdió la conexión (~18:49 UTC hoy) y no se auto-recuperó. Estuvo caído ~5h hasta reinicio manual. Implementar monitoreo + auto-restart:
- Verificar si el systemd unit ya tiene `Restart=on-failure` con `RestartSec`.
- Si no: agregar `Restart=always` y `RestartSec=30` al `wacli-daemon.service`.
- Agregar health check en el cron de WP que detecte `use of closed network connection` en debug.log y reinicie el daemon via `exec` SSH o coolify-manager.
- Documentar en `Agente/documentacion/ia/` el patrón de fallo y la solución.

### 135A-5 — Fix: MemPalace con timeouts frecuentes (~8s) bloquea respuestas
MemPalace `curl` tarda 8s antes de timeout en cada búsqueda. Investigar si el servicio está caído o congestionado:
- Revisar logs y estado de MemPalace (URL, contenedor, health).
- Si está caído: restaurar.
- Si es lento estructuralmente: hacer la búsqueda no-bloqueante (fire-and-forget o timeout de 2s con fallback a contexto vacío).
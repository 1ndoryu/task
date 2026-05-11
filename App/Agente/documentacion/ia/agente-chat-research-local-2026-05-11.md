# Agente IA: chat, research local y acciones externas — 2026-05-11

## Alcance completado
- Chat persistente por sesión en `glory_agent_chat_messages`.
- Acciones externas persistidas en `glory_agent_actions` con estado, payload, resultado, logs y `correlation_id`.
- Research local mediante `LocalResearchProvider` sobre notas, tareas y hábitos; queda desacoplado por `ResearchProviderInterface` para añadir OpenClaw/Firecrawl/web search después.
- GitHub funciona como borrador aprobable (`github_draft`), sin publicar nada real hasta integrar token/App con scopes.
- Recordatorios se programan como acciones persistidas y se ejecutan con WP-Cron creando notificación local.
- WACLI soporta envío real si está instalado/autenticado y dry-run local con `WACLI_LOCAL_MODE=true`.

## Endpoints
- `GET|POST|DELETE /wp-json/glory/v1/agent/chat/messages`
- `POST /wp-json/glory/v1/agent/research`
- `GET /wp-json/glory/v1/agent/actions`
- `POST /wp-json/glory/v1/agent/actions/whatsapp`
- `POST /wp-json/glory/v1/agent/actions/github`
- `POST /wp-json/glory/v1/agent/actions/reminder`
- `POST /wp-json/glory/v1/agent/actions/{id}/approve`
- `POST /wp-json/glory/v1/agent/analyze`
- `POST /wp-json/glory/v1/agent/scheduler/run`

## Contexto y memoria del modelo
- El modelo del chat no conserva memoria propia fiable entre sesiones del navegador; la memoria duradera debe vivir en el producto.
- Esta implementación guarda mensajes y acciones en WordPress, de modo que el contexto útil puede rehidratarse desde base de datos.
- La autocompactación existe en herramientas de agente/editor, pero no debe tratarse como fuente de verdad de la app.
- MemPalace puede ser útil como inspiración si se quiere memoria vectorial/episódica, pero en este proyecto primero conviene estabilizar una memoria explícita y auditable: tablas SQL, permisos por usuario, límites, logs y providers intercambiables.

## Seguridad y límites
- El prompt solo propone acciones; el backend decide qué tipos existen y cuáles requieren aprobación.
- Las rutas de acciones externas son admin-only.
- El chat y research aplican rate limit por usuario.
- Los tokens de IA se limitan antes de llamar al backend/proveedor.
- Las ejecuciones externas quedan registradas con logs visibles y resultado persistido.

## Pendientes futuros no bloqueantes
- Provider web/OpenClaw real detrás de `ResearchProviderInterface`.
- GitHub App/OAuth con permisos mínimos para abrir issues/PR reales.
- Pantalla dedicada de historial de acciones y filtros por estado/correlación.

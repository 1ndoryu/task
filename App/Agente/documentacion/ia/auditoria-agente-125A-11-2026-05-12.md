# 125A-11 - Auditoria profunda del agente

## Resumen

Se audito el agente de chat/WhatsApp con foco en tres riesgos inmediatos: operaciones sensibles expuestas a usuarios normales, recordatorios con fechas inconsistentes y falta de salto real entre modelos cuando el proveedor principal falla.

## Cambios aplicados

- Las acciones de codigo, repositorios, OpenCode, automejora, cambio de proyecto, ramas y configuracion global quedaron restringidas a administradores (`manage_options`).
- El prompt del agente ahora oculta OpenCode/proyectos para usuarios sin permiso y muestra reglas de codigo solo cuando el usuario puede ejecutarlas.
- El contexto de OpenCode y proyecto activo ya no se adjunta para usuarios normales.
- El backend rechaza acciones sensibles aunque el LLM las emita por error.
- La normalizacion automatica de continuaciones OpenCode por WhatsApp no se dispara para usuarios sin permiso.
- `LLMProviderService::enviarChat()` ahora intenta una cadena de fallback: modelo configurado, Groq GPT OSS 120B, Groq Kimi K2, Groq Llama 3.3 70B y DeepSeek flash.
- Los recordatorios programados normalizan `fecha_programada` con `DateTimeImmutable` y `wp_timezone()`, evitando mezclar `gmdate()` con hora local de WordPress.

## Frontera de seguridad

Las instrucciones del prompt solo mejoran la conducta del modelo. La frontera real queda en servidor con `AgentChatProcessor::esAccionCodigoRestringida()` y `AgentChatProcessor::puedeUsarAccionesCodigo()`.

Acciones restringidas:

- `solicitar_opencode`
- `continuar_opencode`
- `actualizar_opencode_allowlist`
- `cancelar_opencode`
- `listar_proyectos`
- `listar_ramas`
- `cambiar_proyecto`
- `automejora`
- `cambiar_limite_compactacion`

## Recordatorios

El bug probable era una mezcla de zonas horarias: crear usaba parsing/fecha local y editar podia guardar con `gmdate()`. El scheduler compara contra `current_time('mysql')`, asi que el almacenamiento debe permanecer en hora local de WordPress. Ahora crear y editar pasan por el mismo parser/formateador.

## Modelos

El salto de modelos vive en `LLMProviderService`, no en el prompt. Si un candidato no tiene API key o falla, el servicio prueba el siguiente y solo lanza error al agotar la cadena. Esto beneficia chat normal, recordatorios personalizados y estimaciones nutricionales que usen `enviarChat()`.

## Miniagentes propuestos

No se implemento una nueva arquitectura de miniagentes en esta pasada porque el mayor riesgo era la seguridad del canal multiusuario. La ruta recomendada es:

1. `PlannerAgent`: convierte solicitudes complejas en pasos verificables y decide si se requiere OpenCode.
2. `ContextAgent`: resume contexto largo y memorias antes del prompt principal.
3. `VerifierAgent`: revisa acciones propuestas antes de ejecutar operaciones sensibles o programadas.
4. `ReminderAgent`: recalcula fechas/recurrencias y genera el mensaje final del recordatorio.

Todos deben usar el mismo gate de permisos del servidor. Para usuarios normales, los miniagentes solo pueden operar sobre datos personales del usuario.

## OpenCode y DeepSeek

OpenCode puede seguir siendo el canal para trabajos de codigo porque el runner local ya controla proyectos, permisos, commit y deploy. La integracion DeepSeek no debe reemplazar el flujo actual: debe configurarse como modelo de OpenCode o como candidato de fallback, manteniendo la cola y el allowlist como frontera operativa.

## Validacion esperada

- `php -l` en `AgentChatProcessor.php`, `AgentActionService.php`, `LLMProviderService.php`.
- `npm run type-check:glory` si no hay errores existentes de TypeScript.
- `scripts/self-check.ps1 -TareaId 125A-11`.
- `node scripts/check-roadmap.mjs` al cierre.

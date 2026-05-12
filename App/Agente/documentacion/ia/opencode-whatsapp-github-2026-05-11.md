# WhatsApp -> OpenCode + GitHub — 2026-05-11

## Investigacion
- OpenCode permite ejecucion programatica con `opencode run` y seleccion por `--dir`, `--model` y `--agent`.
- OpenCode tambien puede correr como API local con `opencode serve`; el servidor expone OpenAPI en `/doc` y endpoints de sesiones/mensajes.
- OpenCode Zen es proveedor normal de OpenCode. Los modelos se usan como `opencode/<model-id>`, por ejemplo `opencode/gpt-5.3-codex`.
- La integracion GitHub oficial existe via `anomalyco/opencode/github@latest` y puede responder a `/oc` o `/opencode`, crear ramas, commits y PRs.
- MCP no es necesario para la primera version: CLI/servidor de OpenCode cubren ejecucion, modelo, agente y proyecto. MCP queda para herramientas externas adicionales.

## Estado local
- `opencode` 1.14.48 esta instalado y disponible en PATH en esta PC.
- Modelo activo para el runner: `opencode/deepseek-v4-flash-free`, definido en `opencode.jsonc`, el agente y `config/opencode-projects.json`.
- El runner local funciona en modo `loop` contra `https://task.nakomi.studio/wp-json/glory/v1` y reclama jobs `opencode_job` via HMAC.
- Los instruction files `.github/instructions/*.md` con `applyTo: '**'` tambien son visibles para OpenCode; `test.instructions.md` contiene excepcion explicita para `whatsapp-code` y prompts con `=== TAREA A EJECUTAR ===`.
- En Windows el runner no debe invocar `opencode.cmd` con `shell: true`: resuelve el wrapper npm a `node_modules/opencode-ai/bin/opencode` y ejecuta `node` sin shell para preservar prompts multilinea.
- El resumen WhatsApp depende de `=== RESUMEN PARA WHATSAPP ===`; el runner conserva una ventana amplia de output y el backend limpia ANSI con regex PCRE válido antes de extraerlo.

## Arquitectura elegida
1. WhatsApp entra por el webhook existente y `AgentChatProcessor`.
2. El agente crea una solicitud aprobable `opencode_job` con proyecto, modelo, agente, flags de commit/deploy y prompt.
3. Un runner local en esta PC consulta solo jobs aprobados, firma cada request por HMAC y valida que el proyecto este whitelisted.
4. El runner ejecuta `opencode run --dir <project> --model <model> --agent <agent> <prompt>`.
5. El agente OpenCode hace cambios, valida y opcionalmente commit/push/deploy segun el job.
6. El resultado vuelve al dashboard/WhatsApp como logs y resumen.

## Implementacion preparada
- `opencode.jsonc`: proveedor Zen, modelo default, permisos y seguridad basica.
- `.opencode/agents/whatsapp-code.md`: agente de coding para solicitudes remotas aprobadas.
- `.opencode/commands/whatsapp-task.md`: comando reusable para prompt remoto.
- `scripts/opencode-whatsapp-runner.mjs`: runner local acotado con `--dry-run`.
- `config/opencode-projects.json`: whitelist del proyecto `glorytemplate`.
- `.github/workflows/opencode.yml`: workflow oficial para comentarios `/oc` y dispatch manual.
- `AGENTS.md`: instrucciones compartidas para OpenCode y otros agentes.

## Cola WordPress -> runner local

- Accion chatbot: `solicitar_opencode`.
- Tipo persistido: `opencode_job` en `glory_agent_actions`.
- Aprobacion: la accion pasa de `requiere_aprobacion` a `pendiente`; PHP no ejecuta OpenCode.
- Endpoints HMAC:
	- `GET /wp-json/glory/v1/agent/opencode/jobs?limit=1`
	- `POST /wp-json/glory/v1/agent/opencode/jobs/{id}/claim`
	- `POST /wp-json/glory/v1/agent/opencode/jobs/{id}/result`
- Secret requerido en servidor y runner: `OPENCODE_RUNNER_SECRET`.
- Firma: `sha256=HMAC(secret, timestamp + "\n" + METHOD + "\n" + route + "\n" + body)`.
- Header timestamp: `X-OpenCode-Timestamp`, maximo 5 minutos de skew.
- Header firma: `X-OpenCode-Signature`.
- Importante: `route` es el route REST de WP sin query string, por ejemplo `/glory/v1/agent/opencode/jobs`.

Comando de prueba local una vez configurado el secret:

```powershell
$env:OPENCODE_RUNNER_SECRET = "..."
npm run opencode:runner -- poll-once --api-url https://task.nakomi.studio/wp-json/glory/v1 --dry-run
```

Comando real tras instalar/autenticar OpenCode:

```powershell
npm run opencode:runner -- poll-once --api-url https://task.nakomi.studio/wp-json/glory/v1
```

## Preflight para activar
```powershell
npm install -g opencode-ai
opencode auth login
opencode models opencode
npm run opencode:runner -- run --project glorytemplate --message "Investiga el roadmap y responde sin editar" --dry-run
$env:OPENCODE_RUNNER_SECRET = "..."
npm run opencode:runner -- poll-once --api-url https://task.nakomi.studio/wp-json/glory/v1 --dry-run
```

Para ejecucion real:
```powershell
npm run opencode:runner -- run --project glorytemplate --message "Implementa el fix X" --model opencode/gpt-5.3-codex --commit
npm run opencode:runner -- poll-once --api-url https://task.nakomi.studio/wp-json/glory/v1
```

Para usar GitHub:
- Agregar secret `OPENCODE_API_KEY` en el repo espejo.
- Instalar/autorizar OpenCode GitHub App si se quiere que las acciones aparezcan como app.
- Comentar `/oc fix this` en issue/PR o lanzar `workflow_dispatch` con prompt.

## Riesgos y mitigaciones
- Riesgo: produccion no puede acceder a esta PC. Mitigacion: runner local por polling/salida, no inbound obligatorio.
- Riesgo: solicitud WhatsApp ejecuta codigo sin control. Mitigacion: job aprobable, proyecto whitelisted y modelo/agente declarados.
- Riesgo: deploy directo inseguro. Mitigacion: agente y config bloquean SSH/docker/scp y documentan `coolify-manager-rs`.
- Riesgo: secretos en prompts/logs. Mitigacion: `.env` denegado en config y runner no imprime auth.
- Riesgo: MemPalace o contexto del chatbot reemplaza la tarea real al generar `solicitar_opencode.prompt`. Mitigacion: `AgentChatProcessor` antepone siempre el mensaje original de WhatsApp al prompt que entra al job, dejando cualquier interpretacion del LLM como contexto secundario.
- Riesgo: Windows `cmd.exe` rompe prompts multilinea al pasar argumentos con `shell: true`. Mitigacion: `scripts/opencode-whatsapp-runner.mjs` ejecuta OpenCode via `node .../opencode` sin shell.
- Riesgo: OpenCode headless pide permiso (`bash *: ask`) y auto-rechaza porque no hay canal interactivo con WhatsApp. Mitigacion: el agente no debe intentar leer `.env`; si un comando queda bloqueado, el resumen debe indicarlo. La aprobación interactiva por WhatsApp no existe todavía.
- Riesgo: el LLM responda “continuando” sin emitir acción. Mitigacion: `AgentChatProcessor` detecta mensajes de continuar/reintentar sesion anterior y fuerza `continuar_opencode` con el job reciente.

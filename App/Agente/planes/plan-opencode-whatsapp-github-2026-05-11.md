# Plan OpenCode remoto por WhatsApp + GitHub — 2026-05-11

## Estado
- Fase 0 investigacion: completada en `115A-12`.
- Fase 1 base repo: completada en `115A-12`.
- Fase 2 conexion real WhatsApp -> cola -> runner local: implementada en `115A-13` con job aprobable, endpoints HMAC y `poll-once`.
- Fase 3 ejecucion real OpenCode Zen: bloqueada hasta instalar/autenticar `opencode` en esta PC.
- Fase 4 GitHub Action real: pendiente de secret `OPENCODE_API_KEY` y autorizacion del repo.

## Hallazgos
- OpenCode tiene CLI no interactiva: `opencode run`.
- Se puede fijar proyecto con `--dir`, modelo con `--model` y agente con `--agent`.
- `opencode serve` permite API HTTP local si queremos evitar arranque frio o usar SDK.
- OpenCode Zen funciona como provider `opencode`, con modelos `opencode/<model-id>`.
- La integracion GitHub oficial ya cubre issues/PR comments y workflow dispatch.

## Decision de arquitectura
- No exponer esta PC directamente a internet como primer paso.
- Usar una cola aprobable en WordPress y un runner local que haga polling o reciba jobs por canal autenticado.
- La cola debe guardar estado, logs, resultado y correlation ID usando la tabla existente `glory_agent_actions`.
- El runner local solo acepta proyectos definidos en `config/opencode-projects.json`.

## Fases pendientes

### 115A-13 — Cola WhatsApp -> OpenCode local
1. Hecho: accion `solicitar_opencode` crea propuesta `opencode_job` aprobable.
2. Hecho: endpoints HMAC sin cookie WP para listar, reclamar y reportar jobs.
3. Hecho: `OpencodeJobService` encapsula estados/logs/resultado de la cola.
4. Hecho: `scripts/opencode-whatsapp-runner.mjs poll-once` consume la cola.
5. Pendiente separado en `115A-15`: instalar/autenticar OpenCode y probar ejecucion real.

### 115A-14 — GitHub OpenCode real
1. Confirmar repo remoto exacto y secret `OPENCODE_API_KEY`.
2. Instalar OpenCode GitHub App o usar `GITHUB_TOKEN` con permisos `contents/pull-requests/issues`.
3. Ejecutar workflow manual con prompt de solo lectura.
4. Ejecutar comentario `/oc` en issue de prueba.

## Criterios de listo
- Desde WhatsApp se puede crear job para `glorytemplate` con modelo especifico.
- El runner local lo toma solo si esta aprobado y el proyecto esta whitelisted.
- OpenCode modifica codigo, valida y devuelve logs.
- Commit/push/deploy solo ocurren si el job lo autoriza explicitamente.
- Deploy usa `coolify-manager-rs` y health posterior.

# Plan deuda restante 039A-1 — ejecución (11-09)

Origen: triaje Sentinel `0.7.10` (`9f475d2`) + VarSense `2.2.1` (`21d8a70`).
Evidencia: `C:\tmp\final-0710-*.json`, `C:\tmp\remedicion-0710-coolify.json`.
Padre archivado: `Agente/planes/completados/plan-cero-deuda-todos-proyectos-2026-09-03.md` (§9.5–§9.7).

## Objetivo

Pagar la deuda REAL detectada en el triaje (lo que no quedó en excepción): 5 splits en
coolify + 3 frentes en RESTAURANTE. Cierre por fase con gate + verificación funcional.

## Alcance / no alcance

- Alcance: F1–F4 de abajo. Cada fase cierra con compilación + tests + gate PASS del repo.
- No alcance: excepciones firmadas (sus triggers las reactivan, no se retocan), WIP ajeno,
  deploys/remoto sin autorización explícita por operación+objetivo, `glory-rs/frontend`
  (type-check rojo preexistente, frente separado).

## F1 — coolify splits >250 (119A-3, ya en roadmap de coolify-manager-rs)

Archivos (patrón 1-comando=1-execute; los 25 `execute()` de 102–207 quedan exceptuados):

1. `src/mcp/tools.rs` — `list_all_commands` (370) + `call_mcp_tool` (471).
2. `src/diagnose.rs` — `diagnose` (376).
3. `src/restore_pg_data.rs` — `restore_pg_data` (298).
4. `src/services/theme.rs` — `update` (278).
5. `src/commands/deploy_service.rs` — `execute` (547): tiene sub-plan propio
   (119A-1/119A-2, F3 bloqueada hasta autorización de deploy para verificación funcional).

Verificación por split: `cargo test` + gate del repo + prueba CLI local del comando.
Deploy real solo con autorización.

## F2 — REST DIP: 8 handlers con acceso directo a BD (propuesto 267A-7)

Existe `repositories/`; estos handlers lo saltan (deuda real, no hint):

- `src/handlers/admin.rs:110`
- `src/handlers/bdp_customer_sync.rs:588,599`
- `src/handlers/configuracion.rs:242,400,432,463`
- `src/handlers/ventas.rs:537`
- `src/handlers/sync_venta.rs:90` (291)

Migración: mover SQL a `repositories/`, handlers finos (handler → service → repository).
Verificación: tests + gate + flujo afectado (admin/sync/ventas) probado de verdad.

## F3 — REST splits >200 líneas (propuesto 267A-8)

4 funciones `funcion-larga-rs` >200 (las de 102–185 quedan exceptuadas con trigger 200).
Mismo gate que F2. Detalle de firmas en `C:\tmp\final-0710-restaurante.json`.

## F4 — REST epic monolitos (propuesto 267A-9, último por riesgo)

- `src/services/bdp_sync.rs` (3168) + `src/services/weblink_catalog.rs` (1595).
- Requiere sub-plan propio antes de picar (como monolito-deploy-service o
  monolito-bdp-simulator, cuyo `tests/bdp_push.rs:1324` sigue activo). Solo arrancar tras F2.

## Orden y estado

Orden: F1 → F2 → F3 → F4. Estado: **pendiente** — arrancar por decisión del usuario;
F2/F3 esperan a que el roadmap de REST integre los IDs (hoy dirty por WIP ajeno) o a que
se autorice trabajar desde este plan. Sin commit/push hasta autorización.

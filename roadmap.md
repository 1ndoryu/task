# task — Roadmap

> **Descripcion:** app de productividad personal (tareas, habitos, proyectos, notas) con backend Rust/Axum + PostgreSQL y el frontend React original como SPA.
> **Objetivo de paridad:** todo lo que funcionaba en WordPress debe funcionar aqui — los dominios degradados se implementan hasta alcanzar paridad completa, no se descartan.
> **Stack:** Rust (Axum, SQLx, utoipa/Orval) + React 18 (Zustand, Vite) + PostgreSQL.
> **URL produccion:** propuesta `https://task.wandori.us` (pendiente de autorización; el sitio legacy `task.nakomi.studio`/nakomi queda intacto).
> **Deploy:** Coolify (plan `Agente/planes/plan-deploy-task-wandori-us-2026-08-27.md` — pendiente de autorización de push + escrituras remotas).
> **Repositorio:** repo separado `task` (rama `main`), independiente de WANDORIUS.

## Estado

El frontend original (antes de WordPress) es el frontend real del producto, servido como SPA por el backend Rust con sesion por cookie HttpOnly + CSRF. **Paridad de datos con WordPress alcanzada (18-08-2026)**: todos los dominios que funcionaban en WordPress estan conectados a `/api` contra PostgreSQL — dashboard, tareas, proyectos, habitos (upsert + historial), scratchpad de notas + configuracion, perfil (+ cambio de contrasena), notificaciones, equipos, compartidos, actividad, notas/carpetas, mensajes/timeline (con WebSocket en tiempo real), suscripcion/trial, almacenamiento/adjuntos (subida multipart + descarga autenticada), backups (snapshot/restore), feedback (usuario + panel admin), panel de administracion (usuarios, resumen, premium/trial), cifrado E2E y tokens MCP/API. `window.gloryDashboard` es solo el contexto de sesion Rust.

## Auditoría SOLID 2026-08-25 (segunda pasada, completa)

**855/855 archivos revisados — 7/7 hallazgos resueltos ✅ — auditoría al 100%** (0 BLOQUEANTE, 0 ALTA, 2 MEDIA, 5 BAJA). Modo contraste vs la pasada 2026-08-19. **Resueltos 2026-08-25** (ver `Agente/planes/00-PLAN-RESOLUCION-2026-08-25.md`, verificados `tsc --noEmit` + `cargo check`/`test` 11/11): `H-F12-14` (16 `console.warn`→`devWarn`), `H-B03-06` (escapa wildcards ILIKE vía `repositories/escape.rs`), `H-B03-07` (notas de invariante en whitelist `format!`), `H-F13-08` (`console.warn`→`devWarn` en DashboardGrid), `H-F13-09` (drag-resize unificado en `useResizeDrag`), `H-F14-04` (hex muerto eliminado), y **`H-F12-13`** (refactor **estructural** del cluster de sync T7: mappers a `utils/mappersContrato.ts`, `useOnlineStatus`/`obtenerNonce` a `hooks/useOnlineStatus.ts`, `generateBackup` tipado vía `DatosGuardado`, helpers de `useSyncManager` a `utils/syncAyudas.ts`, 4 `@ts-ignore` del cluster eliminados; la máquina init/auto-save queda unificada por acoplamiento de guards). Auditoría **archivada** el 2026-08-25 en `Agente/archivado/auditoria-2026-08-25/` (checklist por módulo + patrones).

Segunda auditoría de principios SOLID iniciada el 2026-08-25: **855 archivos** (backend `src/` 84 + frontend `frontend/src/` 771) con checklist autocontenido por módulo + revisión transversal de **patrones generales**. La auditoría quedó archivada el 2026-08-25 en `Agente/archivado/auditoria-2026-08-25/`; la pasada previa (2026-08-19, 69 hallazgos resueltos) quedó archivada en `Agente/archivado/auditoria-2026-08-19/`. Orden: patrones → backend → frontend. Los cambios sin commitear del usuario en `components/dashboard/*` (creación rápida) se respetaron.

## Bloque actual

✅ **Resuelto (31-08-2026): refactor visual monocromo (318A-1).** Blanco y negro puro, sin
colores, sin radios, sin sombras. `variables.css` reescrito a escala de grises (2 temas:
`:root` oscuro `original` + `claro`), tema `oscuro` eliminado de `useTema` y TSX, anulación
global vía `monocromo.css` (import al final de `index.css`), 13 CSS limpiados de valores
hardcoded → tokens. Gate `GLORY-BASELINE` PASS. Evidencia:
`Agente/completados/tareas-2026-08-31.md`. Pendiente real detectado (no bloqueante): bug visual
del modal de tareas programadas (`[class*="panel"]` vs `panelAgenteTarea*`).

**En curso (26-08-2026): paridad de sync y export.** Dos bugs profundos heredados del legacy:
1. **Reappear**: al borrar/completar una tarea a veces reaparece/des-completa (race intermitente entre el guardado debounced 2s y el refresco 30s/foco que sobrescribe local con datos stale). Fix: refresco tombstones-aware + no-clobber en `useSyncManager`. Plan: `Agente/planes/plan-paridad-sync-export-2026-08-26.md`.
2. **Export incompleto**: el archivo solo lleva habitos/tareas/proyectos/notas-scratchpad; faltan recordatorios, notas guardadas, grupos (tareas/ejecución/FB), ayuno, déficit, timeTracker, plugins, config, preferencias. Fix: ampliar formato v2 con todas las secciones + validación tolerante + restore.

✅ **Resuelto (27-08-2026): scroll interno en modo sidebar.** Cuando el contenido del panel
superaba la altura, la barra aparecía "por fuera" (body/página). Fix CSS acotado a sidebar:
`.dashboardContenedor--sidebar` con `height:100dvh` + `overflow:hidden` (antes solo
`min-height`, crecía con el contenido), `.dashboardSidebarContenido` con `overflow:hidden`
(antes era el contenedor exterior de scroll) y scroll interno en `.dashboardPanelView
.dashboardPanelContent` (`overflow-y:auto` + `min-height:0`, patrón de `.panelAlturaFija`
del grid). Ver `Agente/completados/tareas-2026-08-27.md`.

Quedan dos frentes, ninguno bloqueado por codigo:

1. **Dominios con credenciales externas** (no implementables sin cuentas/llaves de terceros; hoy se degradan con mensaje claro): el **chat IA y la nutrición ya funcionan** vía proxy `/api/ai/chat` + `/api/ai/nutricion` con las envs del proyecto anterior (`CEREBRAS_API_KEY`, `GROQ_API*`, `DEEPSEEK_API*`; ver `.env.example` y `run.md`) — quedan externos: agent actions (WhatsApp/research), Magnific, WhatsApp, Google OAuth, grupos Facebook, pagos Stripe reales (webhooks) y servidor MCP real (el token ya se genera; falta el servidor que lo consume).
2. **Puesta en produccion** (siguiente bloque grande): definir destino (Coolify), gate de exposicion — memoria del proceso, `X-Forwarded-For`, cookies detras del proxy, `docker build`/healthcheck en CI, ingress real; mantener snapshot OpenAPI + cliente Orval sincronizado (`openapi:export` + `codegen` sin drift).

## Pendientes por dependencia

- **Plugin EXP / gamificación (26-08-2026)**: panel **real** con barra de vida + EXP/nivel, registrado como el resto de paneles (grid: columna 1 arriba; sidebar: entrada en SidebarMenu + render en `DashboardSidebarGrid`), activable/desactivable en configuraciones. ✅ **Panel real registrado (corrección 3, 27-08)**: reemplaza el montaje "fijo" directo en `DashboardIsland` por `registrarPanel` + `GENERADORES_PROPS` + `panelesIds: ['exp']` (ver `Agente/completados/tareas-2026-08-27.md`). Queda: dificultad automática por IA (solo con plugin activo) guardada en el payload; EXP = dificultad × importancia al completar; vida empieza en 100 y baja por incumplimientos de hábitos (derivado del historial real, hecho durable). Plan: `Agente/planes/plan-plugin-exp-2026-08-26.md`.
- **Refactor del cluster de sincronización (T7, 19-08-2026)**: los hooks de sync — `useDashboardApi` 451, `useSyncManager` 405, `useDashboardSync` 407, `useSincronizacion` 343, `useSincronizacionTiempoReal` 253, `useNotificadorCambiosWebSocket` 315, `generadoresPropsPanel` 370 — se refactorizan coordinados (mappers de contrato → utils; cada hook <~300 con responsabilidad única; API pública intacta; verificar flujo de sync real). Origen: cierre por criterio de H-F12-01 (límite de 120 líneas reinterpretado para hooks). Detalle en `Agente/planes/00-PLAN-RESOLUCION.md` (T7).
- **IA / WhatsApp / Google OAuth / Facebook grupos / Stripe real / servidor MCP**: requieren credenciales externas; elegir proveedores y crear las cuentas antes de implementar.
- **Auditoria de contrato vs WordPress (18-08-2026)**: comparados los servicios PHP originales (`App/Services`, `App/Repository`) contra backend Rust y hooks front — corregidos: ofuscacion de emails en compartidos, trial de un solo uso + degradacion a FREE con estado `expirada` al vencer, backups solo premium con intervalo 30 min y retencion 30 dias/50 max + backup automatico en el save del dashboard, validacion MIME de adjuntos, y trial ahora activa premium de verdad. Suite de regresion `verify-parity.mjs` reforzada: **59/59 asserts**. Queda revisar estados carga/vacio/error con datos masivos si molestan.
- **Gate de exposicion**: memoria, `X-Forwarded-For`, cookies detras del proxy, `docker build`/healthcheck en CI, ingress real; baseline p95 roja por memoria del host (12-08); rate limit single-replica.
- Mantener snapshot OpenAPI + cliente Orval sincronizado (`openapi:export` + `codegen` sin drift).

## Notas

- **318A-3 (31-08-2026):** patrón B/C cerrado localmente: `ModalConfigAgente` usa los controles canónicos conservando layout; `ConfigExp` y `ConfigDeficitCalorico` permanecen como escapes documentados por sus layouts específicos. F2 de Sentinel verificado: fix `aa606a8` preservado en rama local, checkout compartido limpio en `643353d7e9683aabe7dc6ce67d025981b4d90b29`, `out/` reconstruido desde el pin. La firma del lock se reprodujo como `sha256(git archive --format=tar HEAD) = 50ddb6c18d93e3b4bc218547cbac7cd72c6a24991c74a2b9415ef2bd6083d2d4`. `workspace-manager` doctor confirma Sentinel 0.7.5 y commit/lock/checkout/CLI alineados; quedan issues de VarSense no publicado y desyncs externos preexistentes (WANDORIUS/PT).

- **318A-4 (02-09-2026):** chat IA — 4 sub-tareas del bug del chat resueltas + modelo gratuito directo. (1) Light-mode: texto invisible corregido (mensajes en cuadro sin fondo, tokens correctos). (2) El chat ya NO pasa por gloryapi: se añade el proveedor `commandcode` (Command Code Provider API directa, `api.commandcode.ai/provider/v1/chat/completions`) con el modelo gratuito `poolside/laguna-s-2.1-free` (Laguna S 2.1 Free) — va PRIMERO en `CHAT_FALLBACK_CHAIN`; si falla, cae a glory (ruta auto → DeepSeek Flash). (3) Avatar del chat eliminado (texto puro). (4) `config_desde_guardada` ahora lee `provider`/`modelo` de la config guardada de la conversación (el selector del front los persiste); el request ya no puede sobreescribirlos. Verificado con sesión admin: turnos en `agente_turnos` registran `commandcode/poolside/laguna-s-2.1-free` (antes `glory/commandcode` por binario desactualizado). Key en `.env` (`COMMAND_CODE_API_KEY`, del vault DPAPI del usuario). Pendiente: el modelo directo dio 503 temporal (overloaded) durante la prueba; se recuperó y responde 200.

- Arranque local: `npm run dev` (glory-rs). Requiere PostgreSQL local en 5432 y overrides `GLORY_DEV_DATABASE_URL_TEMPLATE`, `GLORY_DEV_DB_NAME=glory_backend_local`, `PORT=3000`, `CORS_ORIGINS` (ver `.freebuff/run.md`). Hay helpers `PROYECTO TASKS/.freebuff/start-backend.ps1` y `start-dev.ps1` para levantar solo el backend o el stack completo.
- Migracion de paridad: `migrations/20260826000000_parity_domains.{up,down}.sql` (subscriptions, attachments, backups, feedback, e2e_keys, api_tokens, `users.es_admin`).
- El plan de migracion previo quedo archivado en `Agente/planes/completados/plan-migracion-glory-react-logic-2026-08-11.md` (cerrado el 18-08-2026: el proyecto dejo de ser una migracion).

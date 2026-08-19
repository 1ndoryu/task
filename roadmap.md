# task — Roadmap

> **Descripcion:** app de productividad personal (tareas, habitos, proyectos, notas) con backend Rust/Axum + PostgreSQL y el frontend React original como SPA.
> **Objetivo de paridad:** todo lo que funcionaba en WordPress debe funcionar aqui — los dominios degradados se implementan hasta alcanzar paridad completa, no se descartan.
> **Stack:** Rust (Axum, SQLx, utoipa/Orval) + React 18 (Zustand, Vite) + PostgreSQL.
> **URL produccion:** pendiente de definir.
> **Deploy:** Coolify / pendiente.
> **Repositorio:** repo separado `task` (rama `main`), independiente de WANDORIUS.

## Estado

El frontend original (antes de WordPress) es el frontend real del producto, servido como SPA por el backend Rust con sesion por cookie HttpOnly + CSRF. **Paridad de datos con WordPress alcanzada (18-08-2026)**: todos los dominios que funcionaban en WordPress estan conectados a `/api` contra PostgreSQL — dashboard, tareas, proyectos, habitos (upsert + historial), scratchpad de notas + configuracion, perfil (+ cambio de contrasena), notificaciones, equipos, compartidos, actividad, notas/carpetas, mensajes/timeline (con WebSocket en tiempo real), suscripcion/trial, almacenamiento/adjuntos (subida multipart + descarga autenticada), backups (snapshot/restore), feedback (usuario + panel admin), panel de administracion (usuarios, resumen, premium/trial), cifrado E2E y tokens MCP/API. `window.gloryDashboard` es solo el contexto de sesion Rust.

## Bloque actual

Quedan dos frentes, ninguno bloqueado por codigo:

1. **Dominios con credenciales externas** (no implementables sin cuentas/llaves de terceros; hoy se degradan con mensaje claro): IA/chatbot, WhatsApp, Google OAuth, grupos Facebook, pagos Stripe reales (webhooks) y servidor MCP real (el token ya se genera; falta el servidor que lo consume).
2. **Puesta en produccion** (siguiente bloque grande): definir destino (Coolify), gate de exposicion — memoria del proceso, `X-Forwarded-For`, cookies detras del proxy, `docker build`/healthcheck en CI, ingress real; mantener snapshot OpenAPI + cliente Orval sincronizado (`openapi:export` + `codegen` sin drift).

## Pendientes por dependencia

- **Refactor del cluster de sincronización (T7, 19-08-2026)**: los hooks de sync — `useDashboardApi` 451, `useSyncManager` 405, `useDashboardSync` 407, `useSincronizacion` 343, `useSincronizacionTiempoReal` 253, `useNotificadorCambiosWebSocket` 315, `generadoresPropsPanel` 370 — se refactorizan coordinados (mappers de contrato → utils; cada hook <~300 con responsabilidad única; API pública intacta; verificar flujo de sync real). Origen: cierre por criterio de H-F12-01 (límite de 120 líneas reinterpretado para hooks). Detalle en `Agente/planes/00-PLAN-RESOLUCION.md` (T7).
- **Auditoría de estilos H-F14-02**: dividir los 8 CSS monolíticos por dominio (único hallazgo de auditoría abierto).
- **IA / WhatsApp / Google OAuth / Facebook grupos / Stripe real / servidor MCP**: requieren credenciales externas; elegir proveedores y crear las cuentas antes de implementar.
- **Auditoria de contrato vs WordPress (18-08-2026)**: comparados los servicios PHP originales (`App/Services`, `App/Repository`) contra backend Rust y hooks front — corregidos: ofuscacion de emails en compartidos, trial de un solo uso + degradacion a FREE con estado `expirada` al vencer, backups solo premium con intervalo 30 min y retencion 30 dias/50 max + backup automatico en el save del dashboard, validacion MIME de adjuntos, y trial ahora activa premium de verdad. Suite de regresion `verify-parity.mjs` reforzada: **59/59 asserts**. Queda revisar estados carga/vacio/error con datos masivos si molestan.
- **Gate de exposicion**: memoria, `X-Forwarded-For`, cookies detras del proxy, `docker build`/healthcheck en CI, ingress real; baseline p95 roja por memoria del host (12-08); rate limit single-replica.
- Mantener snapshot OpenAPI + cliente Orval sincronizado (`openapi:export` + `codegen` sin drift).

## Notas

- Arranque local: `npm run dev` (glory-rs). Requiere PostgreSQL local en 5432 y overrides `GLORY_DEV_DATABASE_URL_TEMPLATE`, `GLORY_DEV_DB_NAME=glory_backend_local`, `PORT=3000`, `CORS_ORIGINS` (ver `.freebuff/run.md`). Hay helpers `PROYECTO TASKS/.freebuff/start-backend.ps1` y `start-dev.ps1` para levantar solo el backend o el stack completo.
- Migracion de paridad: `migrations/20260826000000_parity_domains.{up,down}.sql` (subscriptions, attachments, backups, feedback, e2e_keys, api_tokens, `users.es_admin`).
- El plan de migracion previo quedo archivado en `Agente/planes/completados/plan-migracion-glory-react-logic-2026-08-11.md` (cerrado el 18-08-2026: el proyecto dejo de ser una migracion).

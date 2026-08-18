# task — Roadmap

> **Descripcion:** app de productividad personal (tareas, habitos, proyectos, notas) con backend Rust/Axum + PostgreSQL y el frontend React original como SPA.
> **Stack:** Rust (Axum, SQLx, utoipa/Orval) + React 18 (Zustand, Vite) + PostgreSQL.
> **URL produccion:** pendiente de definir.
> **Deploy:** Coolify / pendiente.
> **Repositorio:** nuevo repo separado `task` (rama `main`), independiente de WANDORIUS.

## Estado

El frontend original (antes de WordPress) es el frontend real del producto, incorporado al checkout y servido como SPA por el backend Rust con sesion por cookie HttpOnly + CSRF. El backend Rust cubre: auth, perfil, dashboard (lectura), tareas/proyectos (upsert), historial de habitos, notas/carpetas, actividad, equipos, compartidos/roles, notificaciones y timeline. Login/registro/logout del front ya apuntan a `/api`. Falta conectar el resto de la capa de datos del front a `/api` y cerrar dominios que el backend aun no expone.

## Bloque actual

Conectar la capa de datos del front original a la API Rust por dominio:

1. `useDashboardApi`: lectura desde `GET /api/dashboard` y guardado de tareas/proyectos via `PUT /api/tasks/{id}` y `PUT /api/projects/{id}`; quitar la dependencia de nonce (sesion + CSRF).
2. Pendientes de backend para cerrar el dashboard: upsert de habitos, scratchpad de notas (campo `notas` del agregado) y configuracion de usuario; sin ellos esos datos quedan solo locales.
3. Adaptar servicios restantes del front: notificaciones, equipos, compartidos, actividad, historial de habitos, notas estructuradas (ya tienen backend `/api`), y degradar con estado "no disponible" los dominios sin backend (mensajes, suscripcion/Stripe, almacenamiento, IA/WhatsApp/Google OAuth, admin).
4. Retirar el slice viejo (`frontend/src/features/*`, `App.tsx`) y el shim `window.gloryDashboard` cuando la paridad este cerrada.

## Pendientes por dependencia

- Upsert de habitos en Rust (hoy solo hay historial) para persistir el panel de habitos.
- Endpoint para el scratchpad de notas (campo `notas` string del agregado) o decidir su modelo.
- Persistencia de `configuracion` de usuario (tema, orden de habitos, notificaciones).
- Dominios sin backend (mensajes, suscripcion, almacenamiento/adjuntos, IA/WhatsApp/Facebook/MCP, Google OAuth): definir si se implementan o se ocultan en la UI.
- Gate de exposicion: memoria, `X-Forwarded-For`, cookies detras del proxy, `docker build`/healthcheck en CI, ingress real; baseline p95 roja por memoria del host (12-08); rate limit single-replica.
- Mantener snapshot OpenAPI + cliente Orval sincronizado (`openapi:export` + `codegen` sin drift).

## Notas

- Arranque local: `npm run dev` (glory-rs). Requiere PostgreSQL local en 5432 y overrides `GLORY_DEV_DATABASE_URL_TEMPLATE`, `GLORY_DEV_DB_NAME=glory_backend_local`, `PORT=3000`, `CORS_ORIGINS` (ver `.freebuff/run.md`).
- El plan de migracion previo quedo archivado en `Agente/planes/completados/plan-migracion-glory-react-logic-2026-08-11.md` (cerrado el 18-08-2026: el proyecto dejo de ser una migracion).

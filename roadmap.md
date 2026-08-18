# task — Roadmap

> **Descripcion:** app de productividad personal (tareas, habitos, proyectos, notas) con backend Rust/Axum + PostgreSQL y el frontend React original como SPA.
> **Stack:** Rust (Axum, SQLx, utoipa/Orval) + React 18 (Zustand, Vite) + PostgreSQL.
> **URL produccion:** pendiente de definir.
> **Deploy:** Coolify / pendiente.
> **Repositorio:** repo separado `task` (rama `main`), independiente de WANDORIUS.

## Estado

El frontend original (antes de WordPress) es el frontend real del producto, servido como SPA por el backend Rust con sesion por cookie HttpOnly + CSRF. **La capa de datos del front esta conectada a `/api` por dominio** (18-08-2026): dashboard (lectura + escritura por entidad), tareas, proyectos, habitos (upsert + historial), scratchpad de notas + configuracion, perfil, notificaciones, equipos, compartidos, actividad y notas/carpetas. Los dominios sin backend estan degradados a "no disponible" sin romper la UI. El slice viejo fue retirado; `window.gloryDashboard` es solo el contexto de sesion Rust (isLoggedIn + currentUser con id UUID).

## Bloque actual

Ninguno — la fase de conexion de datos esta cerrada. Siguiente bloque sugerido: definir el destino de produccion (Coolify) y el gate de exposicion, o implementar los dominios degradados por valor de negocio.

## Pendientes por dependencia

- **Dominios degradados** (sin backend, la UI muestra "no disponible"): mensajes/chat, suscripcion/Stripe, almacenamiento/adjuntos, backups, IA/WhatsApp/Google OAuth/MCP/Facebook, admin/feedback. Decidir cuales implementar y en que orden.
- **Cambio de contrasena y avatar local** del perfil: el backend expone display_name/avatar_url; falta flujo de cambio de contrasena.
- **Paridad de estados**: verificar estados carga/vacio/error de los paneles conectados con datos reales (notificaciones, equipos, compartidos) y limpiar los `console.warn` residuales de dominios degradados si molestan.
- **Gate de exposicion**: memoria, `X-Forwarded-For`, cookies detras del proxy, `docker build`/healthcheck en CI, ingress real; baseline p95 roja por memoria del host (12-08); rate limit single-replica.
- Mantener snapshot OpenAPI + cliente Orval sincronizado (`openapi:export` + `codegen` sin drift).

## Notas

- Arranque local: `npm run dev` (glory-rs). Requiere PostgreSQL local en 5432 y overrides `GLORY_DEV_DATABASE_URL_TEMPLATE`, `GLORY_DEV_DB_NAME=glory_backend_local`, `PORT=3000`, `CORS_ORIGINS` (ver `.freebuff/run.md`).
- El plan de migracion previo quedo archivado en `Agente/planes/completados/plan-migracion-glory-react-logic-2026-08-11.md` (cerrado el 18-08-2026: el proyecto dejo de ser una migracion).

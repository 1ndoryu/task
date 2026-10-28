# Roadmap — PROYECTO TASKS

App de productividad personal (tareas, hábitos, proyectos, notas): backend Rust (Axum, SQLx, utoipa/Orval) + PostgreSQL, y el frontend React 18 (Zustand, Vite) original servido como SPA por el backend con sesión por cookie HttpOnly + CSRF.
Corre en el taller de la VPS 89 (`dev89`); producción propuesta en `https://task.wandori.us` (Coolify, pendiente de autorización; el sitio legacy `task.nakomi.studio`/nakomi queda intacto).
Repo separado `task` (rama `main`), independiente de WANDORIUS. Objetivo de paridad: todo lo que funcionaba en WordPress debe funcionar aquí; los dominios degradados se implementan hasta paridad completa, no se descartan.

## Siguiente bloque

- [ ] `27AA-6` — **Dependencias con hilo rojo.** Tareas y hábitos, múltiples, entre cajas, con gravedad.

## Pendientes

- [ ] `27AA-7` — **Perfil, login y modo invitado local.** Respaldo verificado antes; sin tocar la sesión actual.

## Bloqueos

- Ninguno. Ver `Agente/documentacion/bloqueos-task-2026-10-26.md`.

## Planes activos

- `Agente/planes/plan-mejoras-task-2026-10-27.md` — `27AA-1`…`27AA-7` — mejoras una a una con aprobación en navegador.

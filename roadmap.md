# Roadmap — PROYECTO TASKS

App de productividad personal (tareas, hábitos, proyectos, notas): backend Rust (Axum, SQLx, utoipa/Orval) + PostgreSQL, y el frontend React 18 (Zustand, Vite) original servido como SPA por el backend con sesión por cookie HttpOnly + CSRF.
Corre en el taller de la VPS 89 (`dev89`); producción propuesta en `https://task.wandori.us` (Coolify, pendiente de autorización; el sitio legacy `task.nakomi.studio`/nakomi queda intacto).
Repo separado `task` (rama `main`), independiente de WANDORIUS. Objetivo de paridad: todo lo que funcionaba en WordPress debe funcionar aquí; los dominios degradados se implementan hasta paridad completa, no se descartan.

## Siguiente bloque


## Pendientes

- [ ] `27AA-10` — **Auditoría SOLID del frontend y caja de Archivados redimensionable.** Hecho cuando Archivados tenga asa y tamaño persistente y el informe de auditoría enumere los hallazgos por principio.
- [ ] `27AA-8` — **Recuperar la contraseña por correo.** Hecho cuando «Olvidé mi contraseña» envíe un enlace de un solo uso y permita fijar la nueva; pide un proveedor de correo y su credencial (reservado a la usuaria).


## Bloqueos

- Ninguno. Ver `Agente/documentacion/bloqueos-task-2026-10-26.md`.

## Planes activos

- `Agente/planes/plan-mejoras-task-2026-10-27.md` — `27AA-1`…`27AA-7` — mejoras una a una con aprobación en navegador.

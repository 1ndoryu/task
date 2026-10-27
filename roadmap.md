# Roadmap — PROYECTO TASKS

App de productividad personal (tareas, hábitos, proyectos, notas): backend Rust (Axum, SQLx, utoipa/Orval) + PostgreSQL, y el frontend React 18 (Zustand, Vite) original servido como SPA por el backend con sesión por cookie HttpOnly + CSRF.
Corre en el taller de la VPS 89 (`dev89`); producción propuesta en `https://task.wandori.us` (Coolify, pendiente de autorización; el sitio legacy `task.nakomi.studio`/nakomi queda intacto).
Repo separado `task` (rama `main`), independiente de WANDORIUS. Objetivo de paridad: todo lo que funcionaba en WordPress debe funcionar aquí; los dominios degradados se implementan hasta paridad completa, no se descartan.

## Siguiente bloque

- [ ] `21AS-2` — **Los archivados, en el modo sin separar, van en su caja aparte a la derecha de Tareas, con su altura natural.** Hoy van debajo, a alto completo, y quedan fuera de pantalla. Decidido 2026-10-26. Hecho cuando se ven junto a la caja, sin desplazar la página, y en móvil siguen apilados sin solaparse con Tareas.

## Pendientes

- [ ] `21AC-1` — **Mostrar las tareas con proyecto en una vista por proyecto.** Hoy 228 pendientes con proyecto no
  aparecen en ninguna pestaña. Decidido 2026-10-25: una pestaña por proyecto. Hecho cuando ninguna tarea con proyecto
  queda fuera de todas las pestañas, verificado en la 89.
- [ ] `21AB-2` — **El punto de color de una tarea sigue a su urgencia.** (Tras `21AB-1`.) Hoy el punto muestra la
  prioridad mientras el orden pesa la urgencia. Decidido 2026-10-25: urgencia como regla, prioridad solo como
  desempate. Hecho cuando una tarea urgente no sale arriba con punto frío; confirmar si el hábito mantiene su
  importancia.

## Bloqueos

- Bloqueo `19AA-4` — dominios con credenciales externas: la usuaria elige proveedores y crea las cuentas y llaves (WhatsApp, agent actions/research, Magnific, Google OAuth, grupos Facebook, Stripe con webhooks, servidor MCP). Hasta entonces se degradan con mensaje claro; el chat IA y la nutrición ya funcionan vía proxy `/api/ai/chat` + `/api/ai/nutricion` (`.env.example`, `run.md`). Se desbloquea con esas credenciales.
- Bloqueo `21AE-2` — mostrar las notas y los grupos archivados: la forma de la vista la decide la usuaria (aparcado a propósito). El archivado ya existe (`archivada` en `notes`, `PUT /api/notes/{id}/archivo`, lista `archivadas`, grupos archivados en `localStorage`); falta el panel y desarchivar desde él.
- **Rama `origin/legacy-php` (12-10-2026, decidido: no integrar aquí).** Sin ancestro común con `main` (874 commits; `main…legacy-php` = 1561 archivos, +61958/−94282). Integrarla exige `--allow-unrelated-histories` y resolver el árbol entero: decisión de la usuaria. Se conserva en remoto; bundle verificado en `C:/tmp/bundles/task-legacy-php.bundle` (copia de trabajo en C:\tmp, no respaldo definitivo). Desbloquea: decidir entre integrarla o archivarla en `rescate/legacy-php`.

## Planes activos

- `Agente/planes/plan-agente-ia-plugin-2026-08-27.md` — `19AA-7`.
- `Agente/planes/plan-batch-fps-herramientas-119A-4-2026-09-11.md` — `119A-4`.
- `Agente/planes/plan-deploy-task-wandori-us-2026-08-27.md` — deploy de `task.wandori.us`. Parked: su línea de tarea (`19AA-5`) se retiró el 2026-10-20; el plan sigue en disco y se reactiva con una línea nueva cuando haya autorización.
- `Agente/planes/plan-deuda-restante-039A-1-2026-09-11.md` — `039A-1`.
- `Agente/planes/plan-glory-harness-2026-09-01.md` — Glory Harness. Parked: su línea de tarea (`318A-13`) se retiró el 2026-10-20; Fases 0–4 hechas, el plan sigue en disco y se reactiva con una línea nueva si se retoma.
- `Agente/planes/plan-ia-esencial-y-migracion-legacy-2026-08-27.md` — `19AA-8`.
- `Agente/planes/plan-sentinel-varsense-editor-agnostico-2026-05-04.md` — `105A-2`.

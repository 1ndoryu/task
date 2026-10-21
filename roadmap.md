# Roadmap — PROYECTO TASKS

App de productividad personal (tareas, hábitos, proyectos, notas): backend Rust (Axum, SQLx, utoipa/Orval) + PostgreSQL, y el frontend React 18 (Zustand, Vite) original servido como SPA por el backend con sesión por cookie HttpOnly + CSRF.
Corre en el taller de la VPS 89 (`dev89`); producción propuesta en `https://task.wandori.us` (Coolify, pendiente de autorización; el sitio legacy `task.nakomi.studio`/nakomi queda intacto).
Repo separado `task` (rama `main`), independiente de WANDORIUS. Objetivo de paridad: todo lo que funcionaba en WordPress debe funcionar aquí; los dominios degradados se implementan hasta paridad completa, no se descartan.

## Siguiente bloque

- [ ] `19AA-4` — **Dominios con credenciales externas.**
  No implementables sin cuentas/llaves de terceros; hoy se degradan con mensaje claro. El chat IA y la nutrición ya funcionan vía proxy `/api/ai/chat` + `/api/ai/nutricion` con las envs del proyecto anterior (`CEREBRAS_API_KEY`, `GROQ_API*`, `DEEPSEEK_API*`; ver `.env.example` y `run.md`). Quedan externos: agent actions (WhatsApp/research), Magnific, WhatsApp, Google OAuth, grupos Facebook, pagos Stripe reales (webhooks) y servidor MCP real (el token ya se genera; falta el servidor que lo consume). Requieren elegir proveedores y crear las cuentas antes de implementar.

## Pendientes

- [ ] `21AB-1` — **Colores de importancia en la lista.**
  Paleta pastel por nivel (muy baja azulada → muy alta roja), editable en
  Ajustes con el selector nativo y guardada en `localStorage`; el punto de
  cada fila y la opción del modal llevan su color. Base de `21AB-2`.

- [ ] `21AB-2` — **El color de una tarea debe seguir a su urgencia.**
  Hoy el punto de la tarea muestra su prioridad, mientras el orden de la lista
  pesa más la urgencia: una tarea urgente puede salir arriba con punto frío.
  Decidir la regla (urgencia, o prioridad con la urgencia como desempate) y
  aplicarla al punto; confirmar si el hábito mantiene la importancia.

- [ ] `21AA-5` — **`frontend/src` nuevo sin type-check en el gate.**
  `npx tsc` está bloqueado por el guard del proyecto y `scripts/quality/stages.json`
  solo declara la etapa de Sentinel: el front se compila en la 89 pero nadie
  valida sus tipos. Añadir a la etapa del front `tsc --noEmit` + `vite build` en la
  réplica de la 89 (la ruta `~/taller/PROYECTO TASKS/frontend` no existe; hay que
  resolver dónde vive el árbol sincronizado).


## Bloqueos

- **Rama `origin/legacy-php` (12-10-2026, decidido: no integrar aquí).** Sin ancestro común con `main` (874 commits; `main…legacy-php` = 1561 archivos, +61958/−94282). Integrarla exige `--allow-unrelated-histories` y resolver el árbol entero: decisión de la usuaria. Se conserva en remoto; bundle verificado en `C:/tmp/bundles/task-legacy-php.bundle` (copia de trabajo en C:\tmp, no respaldo definitivo). Desbloquea: decidir entre integrarla o archivarla en `rescate/legacy-php`.

## Planes activos

- `Agente/planes/plan-agente-ia-plugin-2026-08-27.md` — `19AA-7`.
- `Agente/planes/plan-batch-fps-herramientas-119A-4-2026-09-11.md` — `119A-4`.
- `Agente/planes/plan-deploy-task-wandori-us-2026-08-27.md` — deploy de `task.wandori.us`. Parked: su línea de tarea (`19AA-5`) se retiró el 2026-10-20; el plan sigue en disco y se reactiva con una línea nueva cuando haya autorización.
- `Agente/planes/plan-deuda-restante-039A-1-2026-09-11.md` — `039A-1`.
- `Agente/planes/plan-glory-harness-2026-09-01.md` — Glory Harness. Parked: su línea de tarea (`318A-13`) se retiró el 2026-10-20; Fases 0–4 hechas, el plan sigue en disco y se reactiva con una línea nueva si se retoma.
- `Agente/planes/plan-ia-esencial-y-migracion-legacy-2026-08-27.md` — `19AA-8`.
- `Agente/planes/plan-sentinel-varsense-editor-agnostico-2026-05-04.md` — `105A-2`.

# Roadmap — PROYECTO TASKS

App de productividad personal (tareas, hábitos, proyectos, notas): backend Rust (Axum, SQLx, utoipa/Orval) + PostgreSQL, y el frontend React 18 (Zustand, Vite) original servido como SPA por el backend con sesión por cookie HttpOnly + CSRF.
Corre en el taller de la VPS 89 (`dev89`); producción propuesta en `https://task.wandori.us` (Coolify, pendiente de autorización; el sitio legacy `task.nakomi.studio`/nakomi queda intacto).
Repo separado `task` (rama `main`), independiente de WANDORIUS. Objetivo de paridad: todo lo que funcionaba en WordPress debe funcionar aquí; los dominios degradados se implementan hasta paridad completa, no se descartan.

## Siguiente bloque

- [ ] `19AA-4` — **Dominios con credenciales externas.**
  No implementables sin cuentas/llaves de terceros; hoy se degradan con mensaje claro. El chat IA y la nutrición ya funcionan vía proxy `/api/ai/chat` + `/api/ai/nutricion` con las envs del proyecto anterior (`CEREBRAS_API_KEY`, `GROQ_API*`, `DEEPSEEK_API*`; ver `.env.example` y `run.md`). Quedan externos: agent actions (WhatsApp/research), Magnific, WhatsApp, Google OAuth, grupos Facebook, pagos Stripe reales (webhooks) y servidor MCP real (el token ya se genera; falta el servidor que lo consume). Requieren elegir proveedores y crear las cuentas antes de implementar.

## Pendientes

- [ ] `19AA-1` — **Extender sistema declarativo de formularios a configs restantes.**
  Tras cerrar 318A-3 (patrones A/B/C migrados), quedan ~23 archivos de configuración fuera de alcance (ver plan §12.1), distribuidos en 3 raíces: `components/dashboard/` (`ModalConfiguracionActividad`, `ModalConfiguracionLayout`, `ModalPlugins`, `ModalConfigDeficitCalorico`, `ConfigDeficitCalorico`), `components/configuracion/` (`ModalConfiguracionUsuario`, `ModalConfiguracionGlobal`, `ModalConfiguracionMCP`, `SeccionTokenMCP`; `global/general/`: `SeccionConfigLayout`, `SeccionConfigPreferencias`, `SeccionConfigTemas`, `SeccionConfigPerfil`, `SeccionConfigSeguridad`, `SeccionConfigMCP`, `SeccionConfigBackups`, `SeccionConfigPaneles`, `SeccionConfigPlugins`; `global/paneles/`: `SeccionConfigTareas/Habitos/Proyectos/Actividad` vía ItemToggle) y `plugins/` (`ModalConfigAgente`, `PanelAgente`, `ConfigExp`). **Avance 318A-4 (01-09-2026):** §12.7 resuelto — `ModalConfigAgente` migrado a `FormCampo`/`Radio`/`Boton` (sin iconos en títulos, sin disables, ritmo del sistema; commit PT `2876526`); los 2 `formulario-config-sin-sistema-declarativo` de SeccionConfigPerfil/ConfigDeficitCalorico eran FP del analizador (regex case-insensitive), corregido en v0.7.7 (`0559576`). Resto sin forma de campo compatible (runtime desktop, glory-rs, Canvas) queda como seguimiento explícito: **HECHO 318A-7J1 (02-09-2026)** — form "Programar tarea" de `PanelAgente` migrado: nuevo `ModalTareasProgramadas.tsx` (sistema declarativo Modal/Input/Select/Textarea/Boton, estado del formulario local, `TipoInput` ampliado con `datetime-local`), sentinel PT **106 → 100** (0e/92w/8h, −5 `html-nativo` −1 `limite-lineas`, 0 nuevos, sin disables), type-check + build exit 0, varsense 0 errores. Queda `ConfigExp`/`ConfigDeficitCalorico` como escapes documentados por layout específico. Planes: `Agente/planes/completados/plan-318a-4-publicar-cierre-2026-09-01.md` y `plan-reactivar-reglas-visuales-sentinel-2026-08-31.md` §12.

- [ ] `19AA-3` — **Plugin EXP / gamificación.**
  Panel **real** con barra de vida + EXP/nivel, registrado como el resto de paneles (grid: columna 1 arriba; sidebar: entrada en SidebarMenu + render en `DashboardSidebarGrid`), activable/desactivable en configuraciones. ✅ **Panel real registrado (corrección 3, 27-08)**: reemplaza el montaje "fijo" directo en `DashboardIsland` por `registrarPanel` + `GENERADORES_PROPS` + `panelesIds: ['exp']` (ver `Agente/completados/tareas-2026-08-27.md`). Queda: dificultad automática por IA (solo con plugin activo) guardada en el payload; EXP = dificultad × importancia al completar; vida empieza en 100 y baja por incumplimientos de hábitos (derivado del historial real, hecho durable). Plan: `Agente/planes/plan-plugin-exp-2026-08-26.md`.

## Bloqueos

- **Rama `origin/legacy-php` (12-10-2026, decidido: no integrar aquí).** Sin ancestro común con `main` (874 commits; `main…legacy-php` = 1561 archivos, +61958/−94282). Integrarla exige `--allow-unrelated-histories` y resolver el árbol entero: decisión de la usuaria. Se conserva en remoto; bundle verificado en `C:/tmp/bundles/task-legacy-php.bundle` (copia de trabajo en C:\tmp, no respaldo definitivo). Desbloquea: decidir entre integrarla o archivarla en `rescate/legacy-php`.

## Planes activos

- `Agente/planes/plan-agente-ia-plugin-2026-08-27.md` — `19AA-7`.
- `Agente/planes/plan-batch-fps-herramientas-119A-4-2026-09-11.md` — `119A-4`.
- `Agente/planes/plan-deploy-task-wandori-us-2026-08-27.md` — deploy de `task.wandori.us`. Parked: su línea de tarea (`19AA-5`) se retiró el 2026-10-20; el plan sigue en disco y se reactiva con una línea nueva cuando haya autorización.
- `Agente/planes/plan-deuda-restante-039A-1-2026-09-11.md` — `039A-1`.
- `Agente/planes/plan-glory-harness-2026-09-01.md` — Glory Harness. Parked: su línea de tarea (`318A-13`) se retiró el 2026-10-20; Fases 0–4 hechas, el plan sigue en disco y se reactiva con una línea nueva si se retoma.
- `Agente/planes/plan-ia-esencial-y-migracion-legacy-2026-08-27.md` — `19AA-8`.
- `Agente/planes/plan-plugin-exp-2026-08-26.md` — `19AA-3`.
- `Agente/planes/plan-sentinel-varsense-editor-agnostico-2026-05-04.md` — `105A-2`.

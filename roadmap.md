# Roadmap — PROYECTO TASKS

App de productividad personal (tareas, hábitos, proyectos, notas): backend Rust (Axum, SQLx, utoipa/Orval) + PostgreSQL, y el frontend React 18 (Zustand, Vite) original servido como SPA por el backend con sesión por cookie HttpOnly + CSRF.
Corre en el taller de la VPS 89 (`dev89`); producción propuesta en `https://task.wandori.us` (Coolify, pendiente de autorización; el sitio legacy `task.nakomi.studio`/nakomi queda intacto).
Repo separado `task` (rama `main`), independiente de WANDORIUS. Objetivo de paridad: todo lo que funcionaba en WordPress debe funcionar aquí; los dominios degradados se implementan hasta paridad completa, no se descartan.

## Siguiente bloque


## Pendientes

- [ ] `28AA-2` — **Verificar la sincronía en vivo entre pestañas y el aviso de descarte del legacy.** Hecho cuando, con dos pestañas visibles en el build de la 89, un cambio de A aparezca en B sin recargar (y al enfocar), y una copia legacy obsoleta muestre el aviso y guarde `glory_copia_descartada`. Residuales: `Agente/documentacion/arquitectura/sincronizacion-escrituras-2026-10-28.md`.
- [ ] `27AA-12` — **Terminar la deuda SOLID restante.** Hecho cuando `cajasActivas`, `menuPanel` y `usarVista` lean el registro de tipos en vez de `panel.tipo`; `Modales`, `Caja`, `ContenidoPanel` y `Fila` reciban contextos en vez de 14–24 props; y los archivos grandes (`usarLista`, `usarNotas`, `preferencias`, `Iconos`, `Ajustes`, `usarArrastreFilas`) queden partidos, con gate limpio. Informe: `Agente/documentacion/arquitectura/auditoria-solid-2026-10-28.md`.
- [ ] `27AA-8` — **Recuperar la contraseña por correo.** Hecho cuando «Olvidé mi contraseña» envíe un enlace de un solo uso y permita fijar la nueva; pide un proveedor de correo y su credencial (reservado a la usuaria).


## Bloqueos

- Ninguno. Ver `Agente/documentacion/bloqueos-task-2026-10-26.md`.

## Planes activos

- `Agente/planes/plan-mejoras-task-2026-10-27.md` — `27AA-1`…`27AA-7` — mejoras una a una con aprobación en navegador.

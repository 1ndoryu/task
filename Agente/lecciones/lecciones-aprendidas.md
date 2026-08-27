# Lecciones aprendidas

## 2026-05-08 — Core editor-agnostico en extensiones
- Para extraer un core real no basta cambiar tipos: hay que eliminar imports indirectos de servicios del editor, como `configService`, `vscode.workspace` o registries que lean settings globales.
- Si una regla aun necesita workspace/watchers, aislarla como callback/adaptador permite avanzar el core sin romper el provider existente.
- Los reportes y scanners deben recibir datos y providers como parametros; escribir archivos, abrir documentos y escuchar watchers pertenece al adaptador, no al core.
- Las pruebas unitarias con mocks de VS Code no garantizan que una CLI arranque en Node puro; despues de compilar hay que ejecutar el JS real y buscar imports indirectos de `vscode`.

## 2026-05-10 — LSP y lint como cierre de arquitectura
- Un LSP fino debe importar core y adaptadores de transporte, no la CLI; si CLI y LSP comparten defaults, moverlos a `core/config.ts` evita drift silencioso.
- Smoke stdio real debe buscar `textDocument/publishDiagnostics` y un `ruleId` esperado; compilar no prueba que el entrypoint LSP no este ejecutando codigo CLI.
- Activar lint tarde puede revelar errores de regex antiguos. Corregir escapes redundantes es bajo riesgo; patrones Unicode compuestos intencionales necesitan excepcion local documentada.
- Si se agregan fixtures `.tsx` fuera de `src`, `tsconfig.json` debe declarar `include` explicito; si no, `tsc` intenta compilar fixtures fuera de `rootDir` y crashea antes de ejecutar tests reales.

## 2026-08-12 — Renombrar carpetas de worktrees de Git
- Renombrar la carpeta de un repo base o de un worktree rompe los vínculos porque `.git` (worktree) y `gitdir`/`core.worktree` (repo base y submodules) guardan rutas absolutas o relativas con el nombre antiguo. El historial no se pierde: vive en el repo base; solo se rompe el enlace.
- Para relinkear: editar el `.git` del checkout, el `gitdir` en `repo-base/.git/worktrees/<nombre>/` y el `core.worktree` de cada submodule en `repo-base/.git/worktrees/<nombre>/modules/<sub>/config`. Los archivos `.git` son texto plano, pero las herramientas de edición directa no los ven por ocultos: usar escritura completa del archivo.
- Verificación: `git status`, `git log` (commits clave alcanzables) y `git worktree list` (sin `prunable`). No ejecutar `git worktree prune` antes de confirmar los enlaces.

## 2026-08-27 — Tokens CSS del dashboard: usar siempre fallback en overrides
- En `styles/dashboard/`, los tokens `--dashboard-fondo` y `--dashboard-aviso` **NO existen** en `variables.css` (solo `--dashboard-fondoSecundario`, `--dashboard-exito`, `--dashboard-error`, `--dashboard-acento`, `--dashboard-textoActivo`). Algunos componentes los usan con fallback (p. ej. `var(--dashboard-fondo, rgba(255,255,255,0.07))`).
- En cualquier excepción/override (como las de `dashboardPanelView.css` sobre `[class*="panel"]`) hay que repetir el fallback del CSS origen: una `var()` sin fallback sobre un token inexistente + `!important` invalida la declaración completa y el elemento queda transparente **en silencio**.
- Verificación en vivo: si un override no aplica, comprobar con `getComputedStyle` que el custom property existe y que la declaración no quedó descartada por la cadena `var()`→token ausente.

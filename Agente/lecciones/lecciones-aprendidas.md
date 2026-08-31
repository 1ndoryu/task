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

## 2026-08-29 — Tokens CSS del agente: nombres inventados con fallback pasan desapercibidos
- Los CSS del plugin del agente (`panelAgente.css`, `modalConfigAgente.css`, `galeriaVisual.css`) usaban variables **inexistentes** (`--dashboard-borde`, `--dashboard-fuenteXs`, `--dashboard-fondoSuave`, `--dashboard-fondoElevado`, `--dashboard-textoPrimario`, `--dashboard-peligro`) **con fallback**, por lo que renderizaban pero nunca tomaban los tokens reales del tema (claro/oscuro rompían la coherencia del design system).
- Un `var(--token, fallback)` sobre un token que no existe **no** es un error de CSS: la página renderiza con el fallback y el fallo queda silencioso. La única detección real es VarSense (variables no definidas) o `getComputedStyle` en vivo.
- Mapeo canónico de los nombres inventados → tokens reales de `styles/dashboard/variables.css`: `--dashboard-borde`→`--dashboard-bordeSutil`/`--dashboard-bordePrincipal`, `--dashboard-fuenteXs`→`--dashboard-tamanoPequeno`, `--dashboard-fondoSuave`→`--dashboard-superposicionSutil`, `--dashboard-fondoElevado`→`--dashboard-fondoTarjeta`, `--dashboard-textoPrimario`→`--dashboard-textoActivo`, `--dashboard-peligro`→`--dashboard-peligroClaro`.
- Al escribir CSS nuevo del dashboard hay que consultar `variables.css` y usar **solo tokens existentes**, sin fallback; los fallbacks de tokens inventados enmascaran el defecto y se cuelan al gate de VarSense.

## 2026-08-29 — VarSense: falsos positivos por `variableFiles`/`scanAllFiles:false`
- VarSense (2.2.1) con `scanAllFiles:false` construye el índice de variables **solo** con los archivos listados en `variableFiles` de `varsense.config.json`. Un token definido en un CSS que NO está en esa lista se reporta como `variableNoDefinida` aunque exista: falso positivo de indexación, no un bug del CSS.
- Antes de corregir un `variableNoDefinida`, verificar primero si el token está definido en un CSS fuera de `variableFiles` (mecanismo: el analizador parsea definiciones solo sobre los archivos del índice). Si es así, la corrección es añadir ese CSS a `variableFiles`, no tocar el CSS.
- Los tokens definidos **inline en TS/TSX** (p. ej. `style={{ ['--col1-fr' as string]: ... }}`) no son indexables por `variableFiles` (solo admite CSS); cubrirlos con un default en el CSS asociado o aceptarlos como límite conocido.
- Tras ampliar `variableFiles`, re-ejecutar `varsense all` y comparar el conteo de `variableNoDefinida` (148 → 0 en esta corrección).

## 2026-08-31 — @import en CSS: debe ir antes de @font-face o el navegador lo descarta
- Un `@import` **después** de una regla `@font-face` (o cualquier regla) en el mismo CSS es **inválido** según la spec CSS y el navegador lo **descarta silenciosamente**: los estilos importados nunca se aplican y no hay error visible.
- En `styles/dashboard/index.css` el `@import './monocromo.css'` estaba al final del archivo (después de `@font-face`); al moverlo **antes de `@font-face`** (p. ej. al principio del archivo) la anulación global de radios/sombras empezó a aplicarse de verdad. Regla: los `@import` siempre al inicio del CSS, antes de cualquier otra regla.

## 2026-08-31 — VarSense `bannedProperties`: sin filtro de valor, solo nombre de propiedad
- `bannedProperties` de VarSense (clave `propiedadesProhibidas` internamente) marca **CUALQUIER** declaración de la propiedad listada, **sin filtrar por valor**: añadir `border-radius` o `box-shadow` a `properties` generaría warnings sobre `border-radius: 0` y `box-shadow: none` (ahora la norma del diseño monocromo).
- La protección de valores hardcoded real la da `hardcodedDetection` + `allowedValues` (`0/0px/auto/inherit/initial/unset/transparent/currentColor/none`): cualquier valor fuera de esa lista se reporta, incluidos fallbacks de `var()`. `bannedProperties` solo sirve para propiedades que no deban aparecer jamás (p. ej. `font-family` con valor concreto si se quisiera forzar tokens).

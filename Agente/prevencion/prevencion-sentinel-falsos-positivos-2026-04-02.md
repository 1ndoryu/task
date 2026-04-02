# Falsos positivos de Code Sentinel detectados en 024A-11

## 1. `AdjuntosFileSystemService.php` L124 — "Undefined constant TAMA"
- **Problema:** Sentinel trunca nombre de constante con Ñ (`TAMAÑO_THUMBNAIL`) y reporta `TAMA` como indefinida.
- **Corrección necesaria en Sentinel:** La regla que detecta constantes indefinidas debe soportar caracteres Unicode (ñ, acentos) en nombres PHP.

## 2. `GitCommandRunner.php` L51 — "exec() without escapeshellarg()"
- **Problema:** El código usa `proc_open()` con array, no `exec()`. Sentinel confunde proc_open con exec.
- **Corrección necesaria en Sentinel:** La regla de inyección de comandos debe distinguir entre `exec()` (peligroso con strings) y `proc_open()` con array de argumentos (seguro).

## 3. `notasService.ts` L54, L135, L146 — "API response mismatch"
- **Problema:** Sentinel dice que las keys `notas`, `carpetas`, `carpeta` no existen en los endpoints PHP. Verificado manualmente: SÍ existen. `NotasApiController::buscarNotas` retorna `'notas' => ...`, `CarpetasNotasApiController::listarCarpetas` retorna `'carpetas' => ...`, `crearCarpeta` retorna `'carpeta' => ...`.
- **Corrección necesaria en Sentinel:** La regla de matching frontend↔backend debe escanear TODOS los controllers, no solo los del mismo directorio. Los endpoints de notas y carpetas están en controllers separados (`NotasApiController` y `CarpetasNotasApiController`).

## 4. `mapaCalor.css` — "--mapa-calor-tamano-celda no definida"
- **Problema en VarSense:** Esta variable se setea dinámicamente por el hook `useMapaCalor` via inline style en el contenedor. VarSense no puede detectar variables seteadas por JS.
- **Corrección necesaria en VarSense:** Permitir un comentario `/* varsense-ignore: --var-name */` para declarar variables dinámicas, o un archivo de excepciones.

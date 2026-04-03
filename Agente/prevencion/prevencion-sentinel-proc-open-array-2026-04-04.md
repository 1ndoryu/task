# Prevención: Sentinel falso positivo exec-sin-escapeshellarg en proc_open con array

**Fecha:** 2026-04-04
**Origen:** `.sentinel-report.md` — Glory/src/Tools/GitCommandRunner.php línea 51
**Tipo:** Falso positivo

## Problema

Sentinel reportó "exec()/shell_exec() sin escapeshellarg()" pero el código usa `proc_open()`
con un **array como primer argumento**, no un string. En PHP 7.4+, proc_open con array bypasses
the shell entirely and passes arguments directly to the OS, making escapeshellarg unnecessary
and even harmful (double-escaping).

## Regla Sentinel a mejorar

`exec-sin-escapeshellarg` debe distinguir entre:
- `proc_open($stringComando, ...)` → SÍ requiere escapeshellarg
- `proc_open($arrayComando, ...)` → NO requiere escapeshellarg (seguro por diseño)
- Arrays como primer argumento de proc_open son safe por definición en PHP.

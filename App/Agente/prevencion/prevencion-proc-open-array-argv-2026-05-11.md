# Prevencion — proc_open con argv array no es shell injection

## Caso
`WacliService::ejecutarWacli()` usa `proc_open($parts, ...)` donde `$parts` es un array de argumentos. PHP ejecuta el proceso sin construir una cadena shell, por lo que no corresponde exigir `escapeshellarg()`.

## Falso positivo
Glory Sentinel reporta: `exec()/shell_exec() sin escapeshellarg(). Riesgo de inyeccion de comandos.` sobre `proc_open($parts, ...)`.

## Regla esperada
La regla debe distinguir:
- `proc_open(string $command, ...)` → exigir escape/validacion.
- `proc_open(array $command, ...)` → permitir si el primer elemento es binario validado y los argumentos se pasan como items separados.

## Caso original
`App/Services/WacliService.php`, metodo `ejecutarWacli()`.

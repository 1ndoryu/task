# Prevención: Sentinel falso positivo en api-response-mismatch

**Fecha:** 2026-04-04
**Origen:** `.sentinel-report.md` — notasService.ts líneas 54, 135, 146
**Tipo:** Falso positivo

## Problema

Sentinel reportó que las claves 'notas', 'carpetas', 'carpeta' no existen en las respuestas PHP
de los endpoints `notas/buscar` y `notas/carpetas`. Verificación manual confirma que los endpoints
PHP SÍ retornan estas claves exactas:

- `NotasApiController.php` → `['notas' => $notas]`
- `CarpetasNotasApiController.php` → `['carpetas' => $carpetas]` y `['carpeta' => $carpeta]`

## Causa probable

La regla `api-response-mismatch` probablemente no está siguiendo correctamente las ramas de retorno
del PHP, o no detecta el wrapper de error en fetchApi que solo pasa la respuesta exitosa al caller.

## Regla Sentinel a mejorar

`api-response-mismatch` necesita considerar que los endpoints pueden retornar claves diferentes
según la rama (éxito vs error), y que el frontend accede a la clave de éxito tras validar `success`.

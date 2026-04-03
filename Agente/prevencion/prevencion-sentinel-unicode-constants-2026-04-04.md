# Prevención: Sentinel trunca constantes con caracteres especiales

**Fecha:** 2026-04-04
**Origen:** `.sentinel-report.md` — AdjuntosFileSystemService.php línea 124
**Tipo:** Falso positivo parcial / bug en Sentinel

## Problema

Sentinel reportó "Constante indefinida: AdjuntosFileSystemService::TAMA" porque la constante real
era `TAMAÑO_THUMBNAIL` (con Ñ). El scanner de Sentinel truncó el nombre de la constante en el
carácter Unicode Ñ, perdiendo el resto del nombre.

## Corrección aplicada

Renombrada la constante a `THUMBNAIL_SIZE` (inglés, sin caracteres especiales).

## Regla Sentinel a mejorar

La regla `undefined-class-constant` necesita manejar correctamente identificadores PHP con
caracteres Unicode (válidos en PHP 8+). El parser de PHP del scanner debería usar `[\w\x80-\xff]+`
para capturar nombres de constantes/variables completos, no solo `[A-Za-z_0-9]+`.

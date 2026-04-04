# Prevención: Code Sentinel — `n-plus-1-query` no soporta `sentinel-disable-next-line`

**Fecha:** 2026-04-04  
**Origen:** 034A-19 (Sentinel cleanup)

## Problema
La regla `n-plus-1-query` de Code Sentinel no reconoce `sentinel-disable-next-line` ni `sentinel-disable`. Hay 3 violaciones legítimas en `GruposFbRepository.php` que no se pueden suprimir.

## Regla a implementar
Verificar que el motor de supresión de Sentinel aplique a TODAS las reglas, incluyendo `n-plus-1-query`.

## Implementación sugerida
En el código de Code Sentinel que evalúa `n-plus-1-query`, agregar la misma lógica de lectura de comentarios `sentinel-disable-next-line` que ya funciona para otras reglas como `fallo-sin-feedback`, `componente-artesanal`, etc.

## Archivos afectados
- `.agent/code-sentinel/src/` — archivo que implementa la regla `n-plus-1-query`

## Violaciones actuales (3)
- `GruposFbRepository.php` — 3 queries que son legítimamente N+1 pero justificados por diseño (consultas condicionales dentro de loops)

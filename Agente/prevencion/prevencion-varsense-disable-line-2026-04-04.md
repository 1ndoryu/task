# Prevención: VarSense — soporte para `varsense-disable-line`

**Fecha:** 2026-04-04  
**Origen:** 034A-19 (VarSense cleanup)

## Problema
VarSense no soporta supresión de diagnósticos por línea. Valores viewport (`35vh`, `15vh`) legítimos aparecen como falsos positivos que no se pueden silenciar.

## Regla a implementar
Agregar soporte en VarSense para comentarios de supresión:
- `/* varsense-disable-next-line */` — suprime el diagnóstico de la siguiente línea
- `/* varsense-disable-line */` — suprime el diagnóstico de la línea actual (inline)

## Implementación sugerida
En `src/parsers/cssParser.ts` o `src/providers/diagnosticProvider.ts`:
1. Antes de emitir un diagnóstico, verificar si la línea anterior contiene `varsense-disable-next-line`
2. O si la misma línea contiene `varsense-disable-line`
3. Si alguno se encuentra, omitir ese diagnóstico

## Archivos afectados
- `.agent/varsense/src/providers/diagnosticProvider.ts`
- `.agent/varsense/src/parsers/cssParser.ts`

## Falsos positivos actuales (2)
- `landing.css` L101: `padding-top: 35vh` — viewport unit para hero section
- `encabezado-botones.css` L238: `padding-top: 15vh` — viewport unit para modal buscador

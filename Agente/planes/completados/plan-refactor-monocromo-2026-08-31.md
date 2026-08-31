# Plan: Refactor Visual Monocromo (318A-1)

**Fecha:** 31-08-2026
**Estado:** completado (31-08-2026, gate GLORY-BASELINE PASS)
**ID:** 318A-1

## Objetivo
Simplificar drásticamente el diseño del dashboard: blanco y negro puro, sin colores, sin
radios (`border-radius`), sin sombras (`box-shadow`). Eliminar el tema `oscuro` como tema
separado: `:root` queda como el tema oscuro base (`original`) y solo se ofrece `claro` como
alternativa. Los estados funcionales se distinguen por tono de gris, negrita e iconos.

## Alcance
- `frontend/src/app/styles/dashboard/variables.css` — escala de grises, radios 0, sombras none.
- `frontend/src/app/styles/dashboard/index.css` — import de `monocromo.css` al final.
- `frontend/src/app/styles/dashboard/monocromo.css` — anulación global (nuevo).
- `frontend/src/app/hooks/useTema.ts` — `TipoTema = 'original' | 'claro'`.
- Componentes que referenciaban `'oscuro'`: `SeccionConfigLayout.tsx`,
  `ModalConfiguracionLayout.tsx`, `DashboardIsland.tsx`, `SeccionConfigTemas.tsx`,
  `ModalTemas.tsx`, `GaleriaVisualIsland.tsx`.

## No alcance
- `useDashboardApi.ts` conserva `'oscuro'` en el tipo de contrato API (datos persistidos de
  usuarios; no es el selector de UI).
- `App.css` (código muerto, no importado) y proyectos hermanos (WANDORIUS, etc.).
- Colores de estados funcionales en datos (backend) — solo representación visual.

## Fases verificables
1. ✅ Reescribir `variables.css` a monocromo (2 temas: `:root` oscuro + `[data-theme='claro']`).
2. ✅ Eliminar tema `oscuro` de `useTema` y referencias TSX.
3. ✅ Anular radios/sombras globalmente vía `monocromo.css` (import final).
4. ✅ Verificar visualmente en navegador — galería `:5175/agente/visuales/` confirmada: sin
   radios ni sombras visibles, tokens `--dashboard-radio*` = `0`, regla `[data-theme]` activa.
   El dashboard real requiere login (no accesible en esta sesión); la galería usa los mismos
   componentes del chat (`plugins/agente/componentes.tsx`).
5. ⏳ Type-check + gate + commit + push.

## Guard automático (VarSense) — decisión 31-08-2026
- `hardcodedDetection` activo con `properties` (color, background, border-color,
  border-radius, box-shadow, ...) y `allowedValues: [0, 0px, auto, inherit, initial, unset,
  transparent, currentColor, none]`: cualquier radio/sombra/color nuevo fuera de esa lista se
  reporta como warning automáticamente (incluye fallbacks de `var()`).
- `bannedProperties.properties` se deja VACÍO a propósito: su semántica es marcar CUALQUIER
  declaración de la propiedad (sin filtrar por valor), así que incluir `border-radius` o
  `box-shadow` generaría falsos positivos sobre `border-radius: 0` / `box-shadow: none`, que
  son ahora la norma del diseño y los usa `monocromo.css`.
- La protección real la da `hardcodedDetection` + `allowedValues`; `bannedProperties` queda
  como palanca para propiedades que no deban aparecer jamás (p. ej. `font-family` con valor
  concreto si se quisiera forzar tokens).

## Definition of Done
- Sin colores en el dashboard (solo escala de grises).
- Sin `border-radius` visible ni `box-shadow` visible.
- Dos temas funcionales: oscuro (base) y claro.
- Type-check pasa; gate `task-check.mjs GLORY-BASELINE` pasa.
- Commit `318A-1: ...` y push a `main`.

## Siguiente paso
Verificación visual en navegador (galería `:5175/agente/visuales/` y dashboard `:5174`).

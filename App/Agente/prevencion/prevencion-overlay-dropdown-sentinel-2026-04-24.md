# Falso Positivo Sentinel — Overlay en Dropdown Mobile

**Fecha:** 2026-04-24  
**Componente afectado:** `SelectorVentanaOportunidad.tsx`  
**Regla que dispara el falso positivo:** "Patrón de modal artesanal detectado (div overlay/backdrop con onClick)"

## Descripción del falso positivo

El componente `SelectorVentanaOportunidad` usa un `div` overlay con `onClick` para cerrar el menú desplegable en móvil:

```tsx
<div className="selectorVentanaOportunidad__overlay" onClick={() => setMenuAbierto(false)} />
```

Este overlay **solo es visible en móvil** (display controlado por `@media (max-width: 480px)` en `ventanaOportunidad.css`). Su función es exclusivamente cerrar el dropdown al tocar fuera de él en pantallas pequeñas, no es un modal de flujo.

## Por qué NO es un modal artesanal

1. El componente es un **dropdown/popup**, no un diálogo modal de flujo de usuario.
2. El overlay **no bloquea scroll ni cuelga la UI** — es una capa de dismiss lightweight.
3. Reemplazarlo con `<Modal>` cambiaría el UX (los modales tienen scroll-lock, backdrop blur, etc.).
4. La semantica correcta es dropdown, no modal.

## Corrección necesaria en la regla de Sentinel

La regla debe distinguir entre:
- **Modal artesanal (BAD):** `div` con `position: fixed; background: rgba; z-index alto` que cubre toda la pantalla para un **flujo de diálogo** (formulario, confirmación, picker).
- **Overlay de dismiss (OK):** `div` cuya función principal es cerrar un dropdown/tooltip al tocar fuera, sin bloquear interacción.

**Sugerencia de refinamiento:** Excluir de la regla los overlays que estén dentro de elementos con clases `selector*`, `menu*`, `dropdown*`, `popup*`, o que tengan `onClick={() => set*Abierto(false)}` como única interacción.

## Estado

Pendiente de implementar refinamiento en `.agent/code-sentinel`.

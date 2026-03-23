# Falso positivo: Overlay de FAB detectado como modal artesanal

## Archivo afectado
`App/React/components/shared/NavegacionInferior.tsx` (línea 49)

## Qué detecta Sentinel
Regla "modal artesanal": un `<div>` con `className` que contiene "overlay" y un `onClick` para cerrar. Sentinel asume que es un modal y sugiere usar `<Modal>`.

## Por qué es falso positivo
El overlay de `NavegacionInferior` no es un modal — es un click-away backdrop para el menú FAB (Floating Action Button). Características que lo diferencian:
- No tiene contenido centrado ni diálogo
- No requiere focus trapping ni portal
- Es un menú contextual ligero, no un diálogo modal
- Usar `<Modal>` cambiaría la semántica y el z-index stack innecesariamente

## Corrección sugerida en Sentinel
La regla debería excluir overlays que:
1. Son hermanos de un menú flotante (`menuFab`, `fab`) en el mismo fragmento
2. Tienen `aria-hidden="true"` (indicando que no son contenido interactivo)
3. No contienen un `<div>` hijo con contenido (el overlay es solo el backdrop, el contenido está en otro sibling)

Posible ajuste: si el overlay `<div>` no tiene children y tiene `aria-hidden="true"`, no flaggearlo como modal artesanal.

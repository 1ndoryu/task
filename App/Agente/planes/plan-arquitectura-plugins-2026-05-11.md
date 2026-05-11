# Plan Arquitectura de Plugins — 2026-05-11

## Problema detectado
- El Escalador de Imagen se registraba como plugin y panel, pero el grid exigía un generador de props específico por `panelId`.
- Un panel simple que solo necesita props base quedaba sin render aunque el plugin estuviera activo y visible.

## Fix aplicado
- `DashboardGrid` ahora usa `obtenerGeneradorPropsPanel()`.
- Si no existe generador específico, se usa `generarPropsPanelBase()` con `renderHandleArrastre` y `handleMinimizar`.
- Esto permite crear plugins simples sin tocar el mapa global de props.

## Checklist obligatorio para plugins nuevos
1. Registrar plugin en `App/React/config/inicializarPlugins.ts` con `panelesIds` correctos.
2. Registrar panel asociado con `componente`, `posicionDefecto`, `alturaDefecto` y `soloAdmin` si aplica.
3. Asegurar que el componente acepte `PanelBaseProps` o registrar un generador específico si necesita props extra.
4. Activar/desactivar debe sincronizar `pluginsStore` y visibilidad del layout.
5. Validar que paneles persistidos no salten permisos admin-only.
6. Importar CSS desde el componente o desde `styles/dashboard/index.css`.
7. Si usa backend o APIs externas, el endpoint debe protegerse en REST, no solo ocultarse en UI.
8. Correr `npm run type-check:app` y `npm run build:fast` antes de cerrar.

## Refactor recomendado
- Mover `generadorProps` a la definición de cada panel para que el registro sea la fuente única.
- Agregar un self-check que recorra plugins y falle si `panelesIds` apunta a un panel inexistente.
- Agregar una prueba de humo para: registrar plugin -> activar -> panel visible -> componente renderiza.

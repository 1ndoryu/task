# Plan: Modo Vistas — dashboard con vistas configurables (318A-2)

**Fecha:** 31-08-2026
**Estado:** completado (31-08-2026) — verificado visualmente y gate PASS
**ID:** 318A-2

## Objetivo
Crear un tercer modo de visualización del dashboard llamado **Modo Vistas**: un grid libre de
hasta 4 paneles que llenan la pantalla (sin scroll exterior, solo scroll interno por panel),
configurable por vistas (cada vista define qué paneles muestra, en qué orden y con qué
distribución de celdas fusionables). Las vistas se gestionan como botones en el encabezado.
No afecta a los modos grid ni sidebar existentes.

## Alcance
- `frontend/src/app/types/vistas.ts` (nuevo): tipos `Vista`, `CeldaVista`, `ConfiguracionVistas`.
- `frontend/src/app/hooks/useConfiguracionVistas.ts` (nuevo): estado de vistas con localStorage
  (clave `glory_config_vistas`) + persistencia backend automática vía `CLAVES_PREFERENCIAS`.
- `frontend/src/app/components/dashboard/DashboardVistas.tsx` (nuevo): grid libre de paneles
  (celdas fusionables, resize handles, reordenamiento), sin scroll exterior.
- `frontend/src/app/components/dashboard/vistas/` (nuevo): sub-componentes (celda, handle,
  selector de vista, editor de distribución).
- `frontend/src/app/types/paneles.ts`: `TipoLayout` → `'grid' | 'sidebar' | 'vistas'`.
- `frontend/src/app/hooks/useConfiguracionLayout.ts`: `cambiarTipoLayout` acepta `'vistas'`.
- `frontend/src/app/components/dashboard/ModalConfiguracionLayout.tsx`: 3er botón "Vistas".
- `frontend/src/app/islands/DashboardIsland.tsx`: render de `<DashboardVistas>` cuando
  `tipoLayout === 'vistas'`, con `dashboard-encabezado` en cuadro + botones de vistas.
- `frontend/src/app/utils/preferenciasUsuario.ts`: añadir `'glory_config_vistas'` a
  `CLAVES_PREFERENCIAS` (persistencia backend/BD automática).
- `frontend/src/app/styles/dashboard/componentes/dashboardVistas.css` (nuevo): estilos.
- `frontend/src/app/styles/dashboard/componentes/encabezado-base.css`: estilo "cuadro" para
  encabezado en modo vistas + botones de vistas.

## No alcance
- No tocar el modo grid (DashboardGrid) ni el modo sidebar (DashboardSidebarGrid).
- No cambiar `useDashboardApi.ts` ni el backend Rust (la persistencia usa el blob de
  preferencias existente, `PUT /api/dashboard/settings`).
- No añadir paneles nuevos.

## Fases verificables
1. Tipos + hook `useConfiguracionVistas` (estado, CRUD vistas, persistencia).
2. Componente `DashboardVistas` (grid libre con celdas, resize, reordenar).
3. Integración en `DashboardIsland` + selector de modo (3er botón) + encabezado en cuadro.
4. CSS (`dashboardVistas.css` + encabezado cuadro).
5. Verificación: type-check, build, visual en navegador, gate, commit, push.

## Definition of Done
- 3 modos funcionales: grid, sidebar, vistas (sidebar intacto).
- Modo vistas: máx 4 paneles, llenan la pantalla, sin scroll exterior, scroll interno por panel.
- Vistas configurables: crear/renombrar/eliminar, elegir paneles, distribución libre
  (celdas fusionables), reordenar paneles, redimensionar.
- Vistas como botones en el encabezado (en un cuadro).
- `dashboard-encabezado` en un cuadro en modo vistas.
- Persistencia en BD vía preferencias (clave `glory_config_vistas`).
- Type-check pasa; gate `task-check.mjs GLORY-BASELINE` pasa; commit `318A-2: ...` + push.

## Siguiente paso
Completado. Evidencia: `Agente/completados/tareas-2026-08-31.md`. Commits `8a53451`,
`89068ce`, `ebf689f`, `3272404`, `bf19681` (rama `main`, push a `origin/main`). Gate
`GLORY-BASELINE` PASS en cada commit. Retirado del roadmap por no tener entrada propia (trabajo abierto ya archivado en
completados).

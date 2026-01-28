# Debug: Subtareas Invisibles en Panel Configuración

## Estado: RESOLVIDO

## Descripción del Problema
El usuario reportaba que al abrir una tarea con subtareas desde el Panel de Ejecución, la sección de "Subtareas" aparecía vacía.

## Causa Raíz
El componente `ListaTareas.tsx` (usado por `PanelEjecucion`) manejaba la apertura del panel de configuración de tarea de forma local (`setTareaConfigurando`), renderizando su propia instancia de `PanelConfiguracionTarea`.
Esta instancia local **NO recibía la prop `subtareas`**, por lo que `FormularioTareaModerno` no tenía nada que mostrar en la lista de subtareas.

El componente `DashboardModales.tsx` (que maneja el modal global) sí pasaba correctamente la prop `subtareas` filtrando `dashboard.tareas`.

## Solución Implementada
Se ha refactorizado la cadena de `PanelEjecucion` -> `ListaTareas` para delegar la apertura del panel al sistema de modales global:

1.  **`ListaTareas.tsx`**: Se añadió la prop opcional `onConfigurarTarea`. Si está presente, `abrirConfiguracion` llama a este callback en lugar de usar el estado local.
2.  **`PanelEjecucion.tsx`**: Se añadió la prop `onConfigurarTarea` y se pasa hacia abajo a `ListaTareas`.
3.  **`DashboardGrid.tsx`**: Se actualizó `generarPropsPanelEjecucion` para pasar `onConfigurarTarea: modales.abrirModalEditarTarea`.

Con esto, al configurar una tarea desde Ejecución, se abre el modal global (`DashboardModales`) que ya tiene la lógica correcta para resolver y pasar las subtareas.

## Archivos Modificados
*   `App/React/components/dashboard/ListaTareas.tsx`
*   `App/React/components/paneles/PanelEjecucion.tsx`
*   `App/React/components/dashboard/DashboardGrid.tsx`

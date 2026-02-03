# Plan de Refactorización para TareaItem.tsx

## Objetivo
Refactorizar el componente `TareaItem.tsx` para reducir su tamaño (actualmente ~560 líneas) y complejidad, aplicando principios SOLID (específicamente SRP - Responsabilidad Única) y limpiando la lógica de renderizado y manejo de estados.

## Estrategia
Dividir el componente monolítico en hooks personalizados y subcomponentes especializados agrupados en una nueva carpeta `tarea-item`.

## Estructura de Archivos Propuesta
Crear carpeta: `App/React/components/dashboard/tarea-item/`

1.  **Hooks de Lógica (`hooks/`)**:
    *   `useTareaEdicion.ts`: Manejo del estado de edición (`editando`, `textoEditado`), refs del input, y handlers de teclado (`Enter`, `Escape`, `Tab`).
    *   `useTareaMenu.tsx` (o `.ts`): Generación de las opciones del menú contextual y manejo de la selección de opciones. Separará la lógica de "qué mostrar" y "qué hacer".

2.  **Componentes de Presentación (`components/`)**:
    *   `TareaBadges.tsx`: Componente que encapsula toda la lógica de renderizado de los badges (Prioridad, Urgencia, Fecha, Adjuntos, etc.). Recibirá la `tarea` y props necesarias.
    *   `TareaCheckbox.tsx`: (Opcional) Componente simple para el checkbox.

3.  **Componente Principal (`TareaItem.tsx`)**:
    *   Se mantendrá como el orquestador principal.
    *   Importará los hooks y componentes.
    *   Mantendrá la estructura HTML/CSS principal para no romper estilos.

## Pasos de Ejecución

1.  **Creación de Directorios**: Crear `App/React/components/dashboard/tarea-item` y subcarpetas si es necesario.
2.  **Extracción de `TareaBadges`**:
    *   Mover las funciones `renderBadge...` y `renderIndicador...` a un nuevo componente `TareaBadges`.
    *   Este componentes aceptará `tarea` y los callbacks necesarios (`onConfigurar`, etc.).
3.  **Extracción de `useTareaEdicion`**:
    *   Mover `editando`, `textoEditado`, `inputRef` y `manejarTecla/guardar/cancelar`.
    *   Retornar refs y handlers limpios.
4.  **Extracción de `useTareaMenu`**:
    *   Mover la lógica de `opcionesMenu`, `manejarOpcionMenu` y la integración con `useMenuContextualConId`.
5.  **Reensamblaje en `TareaItem.tsx`**:
    *   Sustituir el código extraído por llamadas a los hooks y componentes nuevos.
6.  **Verificación**:
    *   Comparar visualmente (revisión de código) con el backup.
    *   Asegurar que todas las props se pasan correctamente.

## Principios SOLID Aplicados
*   **SRP**: `TareaItem` solo orquesta. `TareaBadges` solo renderiza información meta. `useTareaMenu` solo gestiona acciones.
*   **OCP**: Agregar un nuevo badge o una nueva opción de menú no requerirá modificar la lógica central de `TareaItem`, solo el módulo correspondiente.

## Notas Importantes
*   Se mantendrán los nombres de clases CSS exactos para evitar regresiones visuales.
*   No se cambiará la lógica de negocio, solo la organización del código.

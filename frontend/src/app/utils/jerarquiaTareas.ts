/*
 * utils/jerarquiaTareas.ts
 * Fachada (07AA-1 F1b): la implementación vive en el núcleo agnóstico
 * (`tasks-core/src/jerarquia.ts`) y aquí solo se conserva el camino de import
 * con la API de `Tarea`. El posicionamiento de arrastre, con reglas de producto
 * como `esHabito`, sigue en `posicionamientoTareas.ts` (no es agnóstico).
 */
export {
    obtenerSubtareas,
    obtenerPadre,
    tieneSubtareas,
    contarSubtareas,
    esDescendiente,
    esTareaPadre,
    esSubtarea,
    obtenerTareasPrincipales,
    obtenerIndiceTarea,
    obtenerTareaAnterior,
    ordenarConJerarquia,
    asignarOrden,
} from '../../../../tasks-core/src/jerarquia';
export type {NodoArbol} from '../../../../tasks-core/src/jerarquia';

export {
    puedeSerSubtareaDe,
    moverConHijos,
    calcularNuevoParent,
    detectarContextoDrop,
} from './posicionamientoTareas';
export type {CalculoParentResult, ContextoDropResult} from './posicionamientoTareas';

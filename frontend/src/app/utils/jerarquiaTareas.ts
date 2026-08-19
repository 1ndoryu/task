/*
 * utils/jerarquiaTareas.ts
 * [H-F15-01] Operaciones de árbol sobre tareas (padre/subtareas): consultas y
 * ordenación. Las funciones de posicionamiento de drag & drop viven en
 * posicionamientoTareas.ts y se re-exportan aquí para no romper importadores.
 */

import type {Tarea} from '../types/dashboard';

/*
 * Obtener todas las subtareas directas de una tarea padre
 * Solo retorna hijos directos, no nietos (no hay más de 1 nivel)
 */
export function obtenerSubtareas(tareas: Tarea[], parentId: number): Tarea[] {
    return tareas.filter(t => t.parentId === parentId);
}

/*
 * Obtener la tarea padre de una subtarea
 * Retorna undefined si la tarea no tiene padre o no existe
 */
export function obtenerPadre(tareas: Tarea[], tareaId: number): Tarea | undefined {
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea || !tarea.parentId) return undefined;
    return tareas.find(t => t.id === tarea.parentId);
}

/*
 * Verificar si una tarea tiene subtareas
 */
export function tieneSubtareas(tareas: Tarea[], tareaId: number): boolean {
    return tareas.some(t => t.parentId === tareaId);
}

/*
 * Contar subtareas de una tarea (total y completadas)
 */
export function contarSubtareas(tareas: Tarea[], tareaId: number): {total: number; completadas: number} {
    const subtareas = obtenerSubtareas(tareas, tareaId);
    return {
        total: subtareas.length,
        completadas: subtareas.filter(t => t.completado).length
    };
}

/*
 * Verificar si una tarea es descendiente de otra
 * Como solo hay 1 nivel de anidación, esto es equivalente a verificar parentId
 */
export function esDescendiente(tareas: Tarea[], posibleHijoId: number, posiblePadreId: number): boolean {
    const posibleHijo = tareas.find(t => t.id === posibleHijoId);
    if (!posibleHijo) return false;
    return posibleHijo.parentId === posiblePadreId;
}

/*
 * Verificar si una tarea es padre (tiene subtareas)
 */
export function esTareaPadre(tareas: Tarea[], tareaId: number): boolean {
    return tieneSubtareas(tareas, tareaId);
}

/*
 * Verificar si una tarea es subtarea
 */
export function esSubtarea(tarea: Tarea): boolean {
    return tarea.parentId !== undefined;
}

/*
 * Obtener todas las tareas principales (sin parentId)
 */
export function obtenerTareasPrincipales(tareas: Tarea[]): Tarea[] {
    return tareas.filter(t => !t.parentId);
}

/*
 * Obtener índice de una tarea en el array
 */
export function obtenerIndiceTarea(tareas: Tarea[], tareaId: number): number {
    return tareas.findIndex(t => t.id === tareaId);
}

/*
 * Obtener la tarea anterior en la lista (para indentación)
 * Retorna undefined si es la primera o no existe
 */
export function obtenerTareaAnterior(tareas: Tarea[], tareaId: number): Tarea | undefined {
    const indice = obtenerIndiceTarea(tareas, tareaId);
    if (indice <= 0) return undefined;
    return tareas[indice - 1];
}

/*
 * Ordenar tareas manteniendo la jerarquía visual
 * Las subtareas siempre aparecen inmediatamente después de su padre
 */
export function ordenarConJerarquia(tareas: Tarea[]): Tarea[] {
    const resultado: Tarea[] = [];
    const principales = obtenerTareasPrincipales(tareas);

    for (const principal of principales) {
        resultado.push(principal);
        const subs = obtenerSubtareas(tareas, principal.id);
        resultado.push(...subs);
    }

    return resultado;
}

/*
 * Asignar campo orden a todas las tareas basado en su posición actual
 * Útil para persistencia consistente
 */
export function asignarOrden(tareas: Tarea[]): Tarea[] {
    return tareas.map((tarea, indice) => ({
        ...tarea,
        orden: indice
    }));
}

/* Posicionamiento de drag & drop (posicionamientoTareas.ts) */
export {puedeSerSubtareaDe, moverConHijos, calcularNuevoParent, detectarContextoDrop} from './posicionamientoTareas';
export type {CalculoParentResult, ContextoDropResult} from './posicionamientoTareas';

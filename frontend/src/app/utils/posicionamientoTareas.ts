/*
 * utils/posicionamientoTareas.ts
 * [H-F15-01] Posicionamiento de tareas en drag & drop: validación de anidación,
 * movimiento con hijos y cálculo del nuevo parent según el gesto horizontal.
 * Extraído de jerarquiaTareas.ts (consume sus consultas de árbol).
 */

import type {Tarea} from '../types/dashboard';
import {obtenerSubtareas, esDescendiente} from './jerarquiaTareas';

/* Valida si una tarea puede convertirse en subtarea de otra:
 * no a sí misma, no de una de sus hijas, ni de una subtarea (máx 1 nivel). */
export function puedeSerSubtareaDe(tareas: Tarea[], tareaId: number, posiblePadreId: number): boolean {
    if (tareaId === posiblePadreId) return false;

    /* [044A-1] Hábitos virtuales no participan en jerarquía padre-hijo. */
    const tareaActual = tareas.find(t => t.id === tareaId);
    if (!tareaActual) return false;
    if ('esHabito' in tareaActual && tareaActual.esHabito) return false;

    const posiblePadre = tareas.find(t => t.id === posiblePadreId);
    if (!posiblePadre) return false;
    if (posiblePadre.parentId) return false;
    if ('esHabito' in posiblePadre && posiblePadre.esHabito) return false;

    if (esDescendiente(tareas, posiblePadreId, tareaId)) return false;
    return true;
}

/* Mueve una tarea con sus subtareas a una nueva posición (array nuevo, sin mutar). */
export function moverConHijos(tareas: Tarea[], tareaId: number, nuevaPosicion: number): Tarea[] {
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea) return tareas;

    const subtareas = obtenerSubtareas(tareas, tareaId);
    const tareasAMover = [tarea, ...subtareas];
    const idsAMover = new Set(tareasAMover.map(t => t.id));

    const tareasRestantes = tareas.filter(t => !idsAMover.has(t.id));

    const resultado = [...tareasRestantes];
    const posicionAjustada = Math.min(nuevaPosicion, resultado.length);
    resultado.splice(posicionAjustada, 0, ...tareasAMover);

    return resultado;
}

/* Calcula el nuevo parentId según la posición de drop y el offset horizontal:
 * offsetX > umbralIndent → subtarea de la tarea de arriba;
 * offsetX < -umbralIndent → tarea principal. */
export interface CalculoParentResult {
    nuevoParentId: number | undefined;
    esValido: boolean;
    razon?: string;
}

export function calcularNuevoParent(tareas: Tarea[], tareaId: number, posicionDrop: number, offsetX: number, umbralIndent: number = 30): CalculoParentResult {
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea) {
        return {nuevoParentId: undefined, esValido: false, razon: 'Tarea no encontrada'};
    }

    /* Offset negativo (izquierda): convertir en tarea principal */
    if (offsetX < -umbralIndent) {
        return {nuevoParentId: undefined, esValido: true};
    }

    /* Offset positivo (derecha): intentar convertir en subtarea */
    if (offsetX > umbralIndent) {
        const tareasOrdenadas = tareas.filter(t => t.id !== tareaId);
        const tareaArriba = tareasOrdenadas[posicionDrop - 1];

        if (!tareaArriba) {
            return {nuevoParentId: undefined, esValido: true}; /* Primera posición, es principal */
        }

        /* Si la de arriba es subtarea, heredar su parentId */
        if (tareaArriba.parentId) {
            return {nuevoParentId: tareaArriba.parentId, esValido: true};
        }

        if (puedeSerSubtareaDe(tareas, tareaId, tareaArriba.id)) {
            return {nuevoParentId: tareaArriba.id, esValido: true};
        }

        return {
            nuevoParentId: undefined,
            esValido: false,
            razon: 'No se puede anidar: máximo 1 nivel de profundidad'
        };
    }

    /* Sin offset significativo: mantener estructura o heredar del contexto */
    const tareasOrdenadas = tareas.filter(t => t.id !== tareaId);
    const tareaArriba = tareasOrdenadas[posicionDrop - 1];

    if (!tareaArriba) {
        return {nuevoParentId: undefined, esValido: true};
    }

    /* Entre subtareas: heredar el parentId; tras una principal: seguir como principal */
    if (tareaArriba.parentId) {
        return {nuevoParentId: tareaArriba.parentId, esValido: true};
    }
    return {nuevoParentId: undefined, esValido: true};
}

/* Detecta el contexto de drop (Fase C): herencia automática de jerarquía al
 * soltar entre subtareas del mismo padre; primera posición → principal. */
export interface ContextoDropResult {
    parentIdSugerido: number | undefined;
    esContextoSubtareas: boolean;
    descripcion: string;
}

export function detectarContextoDrop(tareasOrdenadas: Tarea[], posicionDrop: number, tareaArrastradaId: number): ContextoDropResult {
    const tareasVisibles = tareasOrdenadas.filter(t => t.id !== tareaArrastradaId);

    const tareaArriba = tareasVisibles[posicionDrop - 1];
    const tareaAbajo = tareasVisibles[posicionDrop];

    if (!tareaArriba) {
        return {
            parentIdSugerido: undefined,
            esContextoSubtareas: false,
            descripcion: 'Primera posición'
        };
    }

    if (tareaArriba.parentId) {
        const mismoContexto = tareaAbajo?.parentId === tareaArriba.parentId;

        if (mismoContexto || !tareaAbajo || tareaAbajo.parentId) {
            return {
                parentIdSugerido: tareaArriba.parentId,
                esContextoSubtareas: true,
                descripcion: `Soltar como subtarea del padre ${tareaArriba.parentId}`
            };
        }
    }

    return {
        parentIdSugerido: undefined,
        esContextoSubtareas: false,
        descripcion: 'Soltar como tarea principal'
    };
}

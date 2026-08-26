/**
 * [T7] Mappers de contrato del cluster de sincronización.
 *
 * [188A-1] Abandona el contrato WordPress: el guardado por entidad sube
 * payloads al schema UpsertTaskRequest / UpsertProjectRequest /
 * UpsertHabitRequest de Rust. Cada mapper conserva el objeto completo en
 * `payload` para que el round-trip no pierda campos (subtareas,
 * dependencias, tags, subhábitos, etc.), y deja `expectedUpdatedAt: null`
 * (LWW con timestamps locales en el front).
 *
 * Extraído de `hooks/useDashboardApi.ts` en el refactor T7 de H-F12-13:
 * lógica pura de mapeo, sin estado ni contexto; testable de forma aislada.
 */

import type {Habito, Proyecto, Tarea} from '../types/dashboard';

/* Proyecto/Habito no declaran `orden` en su tipo base (Tarea sí), pero ambos
 * lo admiten como campo extra del payload y Rust lo espera. Lo leemos de forma
 * segura sobre `unknown` sin forzar un cast estructural incompatible. */
function leerOrden(entidad: {orden?: number} | unknown): number {
    if (typeof entidad === 'object' && entidad !== null) {
        const orden = (entidad as {orden?: unknown}).orden;
        if (typeof orden === 'number' || typeof orden === 'string') {
            return Number(orden);
        }
    }
    return 0;
}

/**
 * Mapea una tarea del front al contrato UpsertTaskRequest de Rust.
 */
export function tareaARequest(tarea: Tarea): Record<string, unknown> {
    return {
        texto: tarea.texto,
        completado: Boolean(tarea.completado),
        prioridad: tarea.prioridad ?? null,
        urgencia: tarea.urgencia ?? 'normal',
        proyectoId: tarea.proyectoId ?? null,
        parentId: tarea.parentId ?? null,
        orden: tarea.orden ?? 0,
        payload: tarea,
        expectedUpdatedAt: null
    };
}

/**
 * Mapea un proyecto del front al contrato UpsertProjectRequest de Rust.
 */
export function proyectoARequest(proyecto: Proyecto): Record<string, unknown> {
    return {
        nombre: proyecto.nombre,
        estado: proyecto.estado ?? 'activo',
        prioridad: proyecto.prioridad ?? null,
        urgencia: proyecto.urgencia ?? 'normal',
        fechaLimite: proyecto.fechaLimite ?? null,
        orden: leerOrden(proyecto),
        payload: proyecto,
        expectedUpdatedAt: null
    };
}

/**
 * Mapea un hábito del front al contrato UpsertHabitRequest de Rust.
 * `frecuencia` en el front puede ser objeto `{tipo: 'diario'}` o string;
 * Rust espera string.
 */
export function habitoARequest(habito: Habito): Record<string, unknown> {
    const frecuencia = typeof habito.frecuencia === 'string'
        ? habito.frecuencia
        : (habito.frecuencia as {tipo?: string} | undefined)?.tipo ?? 'diario';
    return {
        nombre: habito.nombre,
        importancia: habito.importancia ?? 'media',
        frecuencia,
        orden: leerOrden(habito),
        payload: habito,
        expectedUpdatedAt: null
    };
}
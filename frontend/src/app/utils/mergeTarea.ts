/*
 * utils/mergeTarea.ts
 * [H-F12-02] Transformaciones puras de tareas extraídas de useTareas:
 * construcción de una tarea nueva y fusión de datos de edición. Sin estado
 * ni efectos; unit-testable.
 */

import type {Tarea, DatosEdicionTarea} from '../types/dashboard';
import {obtenerFechaHoy} from './fecha';

/** Posición de inserción: después de `insertarDespuesDe` si se indica, si no
 * antes de la primera completada (o al final si no hay completadas). */
export function calcularIndiceInsercion(tareas: Tarea[], insertarDespuesDe?: number): number {
    if (insertarDespuesDe) {
        const indice = tareas.findIndex(t => t.id === insertarDespuesDe);
        return indice !== -1 ? indice + 1 : tareas.length;
    }
    const primeraCompletada = tareas.findIndex(t => t.completado);
    return primeraCompletada === -1 ? tareas.length : primeraCompletada;
}

/** Construye la tarea nueva con todos los campos de DatosEdicionTarea;
 * los campos que pueden ser null se normalizan a undefined. */
export function crearTareaNueva(datos: DatosEdicionTarea, indiceInsercion: number, nuevoId: number): Tarea {
    return {
        id: nuevoId,
        texto: datos.texto !== undefined ? datos.texto : 'Nueva tarea',
        completado: datos.completado ?? false,
        fechaCreacion: obtenerFechaHoy(),
        orden: indiceInsercion,
        parentId: datos.parentId,
        proyectoId: datos.proyectoId,
        habitoId: datos.habitoId,
        configuracion: datos.configuracion,
        prioridad: datos.prioridad ?? undefined,
        urgencia: datos.urgencia ?? undefined,
        asignadoA: datos.asignadoA ?? undefined,
        asignadoANombre: datos.asignadoANombre,
        asignadoAAvatar: datos.asignadoAAvatar,
        tags: datos.tags,
        grupoEjecucion: datos.grupoEjecucion,
        /* [014A-19] Timestamp per-entity para resolución de conflictos */
        updatedAt: Date.now()
    };
}

/* Fusión de datos de edición sobre una tarea existente. Semántica:
 * - null en prioridad/urgencia/asignadoA/grupoEjecucion/pospuestoHasta = quitar;
 * - undefined = no tocar;
 * - configuracion: {} = sin cambios; null = borrar; objeto = fusión por clave
 *   (con reglas para repeticion/fechaMaxima/descripcion). */
export function aplicarDatosEdicion(tarea: Tarea, datos: DatosEdicionTarea): Tarea {
    const {
        prioridad: nuevaPrioridad,
        urgencia: nuevaUrgencia,
        configuracion: nuevaConfiguracion,
        asignadoA: nuevoAsignadoA,
        asignadoANombre,
        asignadoAAvatar,
        tags: nuevosTags,
        pospuestoHasta: nuevoPospuestoHasta,
        grupoEjecucion: nuevoGrupoEjecucion,
        insertarDespuesDe: _,
        ...restoDatos
    } = datos;

    const tareaActualizada: Tarea = {
        ...tarea,
        ...restoDatos,
        updatedAt: Date.now()
    };

    if (nuevosTags !== undefined) {
        tareaActualizada.tags = nuevosTags;
    }

    /* [2303A-41] pospuestoHasta: null quita el campo, valor lo asigna */
    if (nuevoPospuestoHasta === null) {
        delete tareaActualizada.pospuestoHasta;
    } else if (nuevoPospuestoHasta !== undefined) {
        tareaActualizada.pospuestoHasta = nuevoPospuestoHasta;
    }

    /* null = quitar, undefined = no tocar (prioridad, urgencia, asignación) */
    if (nuevaPrioridad === null) {
        delete tareaActualizada.prioridad;
    } else if (nuevaPrioridad !== undefined) {
        tareaActualizada.prioridad = nuevaPrioridad;
    }

    if (nuevaUrgencia === null) {
        delete tareaActualizada.urgencia;
    } else if (nuevaUrgencia !== undefined) {
        tareaActualizada.urgencia = nuevaUrgencia;
    }

    if (nuevoAsignadoA === null) {
        delete tareaActualizada.asignadoA;
        delete tareaActualizada.asignadoANombre;
        delete tareaActualizada.asignadoAAvatar;
    } else if (nuevoAsignadoA !== undefined) {
        tareaActualizada.asignadoA = nuevoAsignadoA;
        tareaActualizada.asignadoANombre = asignadoANombre;
        tareaActualizada.asignadoAAvatar = asignadoAAvatar;
    }

    if ('dependencias' in datos) {
        tareaActualizada.dependencias = datos.dependencias;
    }

    if (nuevoGrupoEjecucion === null) {
        delete tareaActualizada.grupoEjecucion;
    } else if (nuevoGrupoEjecucion !== undefined) {
        tareaActualizada.grupoEjecucion = nuevoGrupoEjecucion;
    }

    /* configuracion: {} = sin cambios; null = borrar; objeto = fusión por clave */
    if (nuevaConfiguracion !== undefined) {
        if (nuevaConfiguracion === null) {
            delete tareaActualizada.configuracion;
        } else if (Object.keys(nuevaConfiguracion).length > 0) {
            tareaActualizada.configuracion = {
                ...tarea.configuracion,
                ...nuevaConfiguracion
            };

            /* repeticion/fechaMaxima/descripcion con valores "quitar" se eliminan */
            if ('repeticion' in nuevaConfiguracion && nuevaConfiguracion.repeticion === undefined) {
                delete tareaActualizada.configuracion.repeticion;
            }
            if ('fechaMaxima' in nuevaConfiguracion && (nuevaConfiguracion.fechaMaxima === null || nuevaConfiguracion.fechaMaxima === '')) {
                delete tareaActualizada.configuracion.fechaMaxima;
            }
            if ('descripcion' in nuevaConfiguracion && (nuevaConfiguracion.descripcion === null || nuevaConfiguracion.descripcion === '')) {
                delete tareaActualizada.configuracion.descripcion;
            }
        }
    }

    return tareaActualizada;
}

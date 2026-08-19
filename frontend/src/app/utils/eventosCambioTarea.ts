/*
 * utils/eventosCambioTarea.ts
 * [H-F12-02] Detección de cambios entre la tarea anterior y los nuevos datos:
 * registra cada cambio como evento en el historial (timeline). Extraído de
 * useTareas; es una función pura sin estado.
 */

import type {Tarea, DatosEdicionTarea} from '../types/dashboard';
import {registrarEventoSistema} from './mensajes';

/**
 * Detecta cambios entre la tarea anterior y los nuevos datos y registra cada
 * uno como evento del sistema (timeline). No registra IDs temporales (<= 0).
 */
export function registrarEventosCambios(tareaId: number, tareaAnterior: Tarea, datos: DatosEdicionTarea): void {
    /* Evitar registrar eventos para IDs temporales (creación local) */
    if (tareaId <= 0) return;

    /* Cambio de nombre */
    if (datos.texto !== undefined && datos.texto !== tareaAnterior.texto) {
        registrarEventoSistema('tarea', tareaId, 'nombre', `"${tareaAnterior.texto}" → "${datos.texto}"`);
    }

    /* Cambio de prioridad */
    if (datos.prioridad !== undefined && datos.prioridad !== tareaAnterior.prioridad) {
        const anterior = tareaAnterior.prioridad || 'sin prioridad';
        const nuevo = datos.prioridad || 'sin prioridad';
        registrarEventoSistema('tarea', tareaId, 'prioridad', `${anterior} → ${nuevo}`);
    }

    /* Cambio de urgencia */
    if (datos.urgencia !== undefined && datos.urgencia !== tareaAnterior.urgencia) {
        const anterior = tareaAnterior.urgencia || 'normal';
        const nuevo = datos.urgencia || 'normal';
        registrarEventoSistema('tarea', tareaId, 'urgencia', `${anterior} → ${nuevo}`);
    }

    /* Cambio de repetición */
    const repeticionAnterior = tareaAnterior.configuracion?.repeticion;
    const repeticionNueva = datos.configuracion?.repeticion;
    /* Solo registrar si hay un cambio real (existía y se quitó, o se agregó/modificó) */
    if (repeticionNueva !== undefined || repeticionAnterior !== undefined) {
        const teníaRepeticion = !!repeticionAnterior;
        const tieneRepeticion = repeticionNueva !== undefined && repeticionNueva !== null;

        if (teníaRepeticion && !tieneRepeticion) {
            registrarEventoSistema('tarea', tareaId, 'repeticion', 'desactivada');
        } else if (!teníaRepeticion && tieneRepeticion) {
            registrarEventoSistema('tarea', tareaId, 'repeticion', 'activada');
        } else if (teníaRepeticion && tieneRepeticion) {
            /* Cambió la frecuencia */
            const intervaloAnterior = repeticionAnterior?.intervalo || 0;
            const intervaloNuevo = repeticionNueva?.intervalo || 0;
            if (intervaloAnterior !== intervaloNuevo) {
                registrarEventoSistema('tarea', tareaId, 'repeticion', `cada ${intervaloAnterior}d → cada ${intervaloNuevo}d`);
            }
        }
    }

    /* Cambio de fecha límite */
    const fechaAnterior = tareaAnterior.configuracion?.fechaMaxima;
    const fechaNueva = datos.configuracion?.fechaMaxima;
    if (fechaNueva !== undefined && fechaNueva !== fechaAnterior) {
        const anterior = fechaAnterior || 'sin fecha';
        const nuevo = fechaNueva || 'sin fecha';
        registrarEventoSistema('tarea', tareaId, 'fecha_limite', `${anterior} → ${nuevo}`);
    }

    /* Cambio de descripción */
    const descAnterior = tareaAnterior.configuracion?.descripcion;
    const descNueva = datos.configuracion?.descripcion;
    if (descNueva !== undefined && descNueva !== descAnterior) {
        registrarEventoSistema('tarea', tareaId, 'descripcion');
    }

    /* Cambio de asignación */
    if (datos.asignadoA !== undefined && datos.asignadoA !== tareaAnterior.asignadoA) {
        if (datos.asignadoA === null && tareaAnterior.asignadoA) {
            /* Desasignación: solo si había alguien asignado previamente */
            registrarEventoSistema('tarea', tareaId, 'desasignado', tareaAnterior.asignadoANombre || 'usuario');
        } else if (datos.asignadoA && !tareaAnterior.asignadoA && datos.asignadoANombre) {
            /* Nueva asignación: solo si hay un nombre válido */
            registrarEventoSistema('tarea', tareaId, 'asignado', datos.asignadoANombre);
        } else if (datos.asignadoA && tareaAnterior.asignadoA && datos.asignadoANombre) {
            /* Cambio de asignación: solo si ambos nombres están disponibles */
            registrarEventoSistema('tarea', tareaId, 'asignado', `${tareaAnterior.asignadoANombre || 'anterior'} → ${datos.asignadoANombre}`);
        }
    }
}

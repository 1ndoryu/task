/*
 * utils/registroActividadTarea.ts
 * [H-F12-02] Efectos laterales al togglear una tarea, extraídos de useTareas:
 * evento de timeline, auto-completar tracking y registro en el heatmap.
 * Funciones puras de efecto (sin estado del hook).
 */

import type {Tarea} from '../types/dashboard';
import {registrarEventoSistema, type AccionSistema} from './mensajes';
import {registrarTareaCompletada, registrarTareaDesmarcada} from '../services/actividadService';
import {useTimeTrackerStore} from '../stores/timeTrackerStore';

/**
 * Evento del sistema + auto-completar tracking si la tarea completada estaba
 * siendo trackeada. Se ejecuta tras actualizar el estado (antes del undo).
 */
export function registrarEventoToggleSistema(tarea: Tarea, estadoAnterior: boolean): void {
    const accionSistema: AccionSistema = estadoAnterior ? 'reabierto' : 'completado';
    registrarEventoSistema('tarea', tarea.id, accionSistema);

    /* [233A-10] Auto-completar tracking si la tarea completada estaba siendo trackeada */
    if (!estadoAnterior) {
        const ts = useTimeTrackerStore.getState();
        if (ts.sesionActiva?.entidadId === tarea.id && ts.sesionActiva.tipoEntidad === 'tarea') ts.completarTracking();
    }
}

/**
 * Registro de actividad para el mapa de calor (silencioso): completada o
 * desmarcada según el estado anterior.
 */
export function registrarActividadToggle(
    tarea: Tarea,
    estadoAnterior: boolean,
    detallesActividad?: Record<string, unknown>
): void {
    if (!estadoAnterior) {
        registrarTareaCompletada(tarea.id, tarea.proyectoId, tarea.texto, detallesActividad);
    } else {
        registrarTareaDesmarcada(tarea.id, tarea.proyectoId, tarea.texto);
    }
}

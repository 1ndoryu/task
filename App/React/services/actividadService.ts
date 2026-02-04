/**
 * Servicio de Actividad
 *
 * Funciones utilitarias para registrar actividad desde el frontend.
 * Se integra con el hook useActividad para el mapa de calor.
 * Invalida automaticamente el cache al registrar nuevas actividades.
 *
 * @package App/React/services
 */

import {invalidarCache, invalidarCacheParcial} from './actividadStore';
import {obtenerFechaHoy} from '../utils/fecha';

/* Base URL de la API */
const API_BASE = '/wp-json/glory/v1/actividad';

/**
 * Obtiene el nonce de WordPress para autenticacion
 */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

/**
 * TAREA 2: Obtiene la hora local del cliente en formato HH:MM:SS
 * para enviar al backend y evitar problemas de zona horaria
 */
function obtenerHoraLocal(): string {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
}

export type TipoActividad = 'tarea_completada' | 'habito_cumplido' | 'nota_creada' | 'adjunto_subido' | 'tarea_desmarcada' | 'habito_desmarcado' | 'habito_pospuesto';

export interface RegistroActividadParams {
    tipo: TipoActividad;
    elementoId?: number;
    elementoTipo?: 'tarea' | 'habito' | 'nota' | 'proyecto';
    proyectoId?: number;
    fecha?: string;
    detalles?: Record<string, unknown>;
    /* TAREA 2: Hora local del cliente para evitar problemas de timezone */
    horaLocal?: string;
}

export interface DetalleActividadItem {
    id: number;
    tipo: TipoActividad;
    elementoId: number | null;
    elementoTipo: 'tarea' | 'habito' | 'nota' | 'proyecto' | null;
    proyectoId: number | null;
    fecha: string;
    hora: string | null;
    elementoNombre?: string | null;
    proyectoNombre?: string | null;
    detalles?: Record<string, unknown> | null;
}

export interface ObtenerDetalleActividadParams {
    fecha: string;
    tipo?: TipoActividad;
    proyectoId?: number;
    habitoId?: number;
}

/**
 * Registra una actividad en el backend
 * Se ejecuta de forma silenciosa (no bloquea la UI)
 * Invalida el cache del heatmap para reflejar cambios en tiempo real
 *
 * NOTA: La sincronización del estado de hábitos se maneja en habitosStore.ts
 * usando Zustand. Este servicio solo registra la actividad y invalida el cache
 * del panel de actividad.
 * 
 * TAREA 2: Se incluye la hora local del cliente para evitar problemas de timezone
 */
export async function registrarActividad(params: RegistroActividadParams): Promise<boolean> {
    try {
        /* TAREA 2: Agregar hora local si no viene en params */
        const paramsConHora = {
            ...params,
            horaLocal: params.horaLocal || obtenerHoraLocal()
        };

        const response = await fetch(API_BASE, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': obtenerNonce()
            },
            body: JSON.stringify(paramsConHora)
        });

        if (!response.ok) {
            console.warn('[Actividad] Error al registrar:', response.status);
            return false;
        }

        const data = await response.json();
        const exito = data.success ?? false;

        /* Invalidar cache si se registro correctamente */
        if (exito) {
            /* Invalidacion parcial basada en el tipo de actividad */
            if (params.proyectoId) {
                invalidarCacheParcial({proyectoId: params.proyectoId, tipo: params.tipo});
            } else if (params.tipo === 'habito_cumplido' && params.elementoId) {
                invalidarCacheParcial({habitoId: params.elementoId});
            }

            /* Siempre invalidar el cache general tambien */
            invalidarCache();
        }

        return exito;
    } catch (error) {
        /* Silenciar errores para no afectar la experiencia del usuario */
        console.warn('[Actividad] Error de red:', error);
        return false;
    }
}

export async function obtenerDetalleActividadDia(params: ObtenerDetalleActividadParams): Promise<DetalleActividadItem[]> {
    const query = new URLSearchParams();
    query.append('fecha', params.fecha);
    if (params.tipo) query.append('tipo', params.tipo);
    if (params.proyectoId) query.append('proyectoId', String(params.proyectoId));
    if (params.habitoId) query.append('habitoId', String(params.habitoId));

    const response = await fetch(`${API_BASE}/dia?${query.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': obtenerNonce()
        }
    });

    if (!response.ok) {
        throw new Error('Error al cargar detalle de actividad');
    }

    const data = (await response.json()) as {success: boolean; detalle?: DetalleActividadItem[]; error?: string};

    if (!data.success) {
        throw new Error(data.error || 'Error al cargar detalle de actividad');
    }

    return data.detalle || [];
}

/**
 * Atajos para registrar tipos comunes de actividad
 * Todos envían la fecha local del cliente para evitar problemas de zona horaria
 */
export function registrarTareaCompletada(tareaId: number, proyectoId?: number, tareaNombre?: string): Promise<boolean> {
    return registrarActividad({
        tipo: 'tarea_completada',
        elementoId: tareaId,
        elementoTipo: 'tarea',
        proyectoId,
        fecha: obtenerFechaHoy(),
        detalles: tareaNombre ? {elementoNombre: tareaNombre} : undefined
    });
}

export function registrarHabitoCumplido(habitoId: number, habitoNombre?: string): Promise<boolean> {
    return registrarActividad({
        tipo: 'habito_cumplido',
        elementoId: habitoId,
        elementoTipo: 'habito',
        fecha: obtenerFechaHoy(),
        detalles: habitoNombre ? {elementoNombre: habitoNombre} : undefined
    });
}

export function registrarNotaCreada(notaId: number): Promise<boolean> {
    return registrarActividad({
        tipo: 'nota_creada',
        elementoId: notaId,
        elementoTipo: 'nota',
        fecha: obtenerFechaHoy()
    });
}

export function registrarAdjuntoSubido(tareaId: number, proyectoId?: number, tareaNombre?: string): Promise<boolean> {
    return registrarActividad({
        tipo: 'adjunto_subido',
        elementoId: tareaId,
        elementoTipo: 'tarea',
        proyectoId,
        fecha: obtenerFechaHoy(),
        detalles: tareaNombre ? {elementoNombre: tareaNombre} : undefined
    });
}

/* Funciones para registrar desmarcar/posponer */
export function registrarTareaDesmarcada(tareaId: number, proyectoId?: number, tareaNombre?: string): Promise<boolean> {
    return registrarActividad({
        tipo: 'tarea_desmarcada',
        elementoId: tareaId,
        elementoTipo: 'tarea',
        proyectoId,
        fecha: obtenerFechaHoy(),
        detalles: tareaNombre ? {elementoNombre: tareaNombre} : undefined
    });
}

export function registrarHabitoDesmarcado(habitoId: number, habitoNombre?: string): Promise<boolean> {
    return registrarActividad({
        tipo: 'habito_desmarcado',
        elementoId: habitoId,
        elementoTipo: 'habito',
        fecha: obtenerFechaHoy(),
        detalles: habitoNombre ? {elementoNombre: habitoNombre} : undefined
    });
}

export function registrarHabitoPospuesto(habitoId: number, habitoNombre?: string): Promise<boolean> {
    return registrarActividad({
        tipo: 'habito_pospuesto',
        elementoId: habitoId,
        elementoTipo: 'habito',
        fecha: obtenerFechaHoy(),
        detalles: habitoNombre ? {elementoNombre: habitoNombre} : undefined
    });
}

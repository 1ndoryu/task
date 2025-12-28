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

/* Base URL de la API */
const API_BASE = '/wp-json/glory/v1/actividad';

/**
 * Obtiene el nonce de WordPress para autenticacion
 */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

export type TipoActividad = 'tarea_completada' | 'habito_cumplido' | 'nota_creada' | 'adjunto_subido' | 'tarea_desmarcada' | 'habito_desmarcado' | 'habito_pospuesto';

export interface RegistroActividadParams {
    tipo: TipoActividad;
    elementoId?: number;
    elementoTipo?: 'tarea' | 'habito' | 'nota' | 'proyecto';
    proyectoId?: number;
    fecha?: string;
}

/**
 * Registra una actividad en el backend
 * Se ejecuta de forma silenciosa (no bloquea la UI)
 * Invalida el cache del heatmap para reflejar cambios en tiempo real
 *
 * NOTA: La sincronización del estado de hábitos se maneja en habitosStore.ts
 * usando Zustand. Este servicio solo registra la actividad y invalida el cache
 * del panel de actividad.
 */
export async function registrarActividad(params: RegistroActividadParams): Promise<boolean> {
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': obtenerNonce()
            },
            body: JSON.stringify(params)
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

/**
 * Atajos para registrar tipos comunes de actividad
 */
export function registrarTareaCompletada(tareaId: number, proyectoId?: number): Promise<boolean> {
    return registrarActividad({
        tipo: 'tarea_completada',
        elementoId: tareaId,
        elementoTipo: 'tarea',
        proyectoId
    });
}

export function registrarHabitoCumplido(habitoId: number): Promise<boolean> {
    return registrarActividad({
        tipo: 'habito_cumplido',
        elementoId: habitoId,
        elementoTipo: 'habito'
    });
}

export function registrarNotaCreada(notaId: number): Promise<boolean> {
    return registrarActividad({
        tipo: 'nota_creada',
        elementoId: notaId,
        elementoTipo: 'nota'
    });
}

export function registrarAdjuntoSubido(tareaId: number, proyectoId?: number): Promise<boolean> {
    return registrarActividad({
        tipo: 'adjunto_subido',
        elementoId: tareaId,
        elementoTipo: 'tarea',
        proyectoId
    });
}

/* Funciones para registrar desmarcar/posponer */
export function registrarTareaDesmarcada(tareaId: number, proyectoId?: number): Promise<boolean> {
    return registrarActividad({
        tipo: 'tarea_desmarcada',
        elementoId: tareaId,
        elementoTipo: 'tarea',
        proyectoId
    });
}

export function registrarHabitoDesmarcado(habitoId: number): Promise<boolean> {
    return registrarActividad({
        tipo: 'habito_desmarcado',
        elementoId: habitoId,
        elementoTipo: 'habito'
    });
}

export function registrarHabitoPospuesto(habitoId: number): Promise<boolean> {
    return registrarActividad({
        tipo: 'habito_pospuesto',
        elementoId: habitoId,
        elementoTipo: 'habito'
    });
}

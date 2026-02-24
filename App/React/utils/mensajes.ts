/*
 * Utilidades de Mensajes
 * Funciones auxiliares para el sistema de mensajes del timeline
 * Separadas del hook principal para respetar SRP y limites de lineas
 */

import type {MensajeTimeline, TipoMensaje, AccionSistema} from '../hooks/useMensajes';

/* Re-exportar tipos para que los consumidores puedan importarlos desde aqui */
export type {MensajeTimeline, TipoMensaje, AccionSistema};

/* Base URL de la API */
const API_BASE = '/wp-json/glory/v1/mensajes';

/* Obtiene el nonce de WordPress para autenticacion */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

/**
 * Registra un evento del sistema en el timeline (historial de cambios)
 * Esta funcion es independiente del hook y puede usarse desde cualquier lugar
 *
 * @param tipoElemento - Tipo de elemento ('tarea', 'proyecto', 'habito')
 * @param elementoId - ID del elemento
 * @param accion - Tipo de accion (ver AccionSistema)
 * @param detalle - Detalle opcional del cambio
 * @returns Promise<boolean> - true si se registro correctamente
 */
export async function registrarEventoSistema(tipoElemento: 'tarea' | 'proyecto' | 'habito', elementoId: number, accion: AccionSistema, detalle?: string | null): Promise<boolean> {
    /* No registrar eventos para elementos que no existen (IDs negativos = habitos virtuales) */
    if (elementoId <= 0) return false;

    try {
        const response = await fetch(`${API_BASE}/evento`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': obtenerNonce()
            },
            body: JSON.stringify({
                tipoElemento,
                elementoId,
                accion,
                detalle
            })
        });

        if (!response.ok) {
            console.warn('Error al registrar evento del sistema:', response.status);
            return false;
        }

        const data = (await response.json()) as {success: boolean; skipped?: boolean};

        /* Si fue saltado por timing de sincronizacion, no es un error - simplemente retornar false silenciosamente */
        return data.success;
    } catch (error) {
        console.warn('Error al registrar evento del sistema:', error);
        return false;
    }
}

/**
 * Convierte un mensaje del API al tipo visual del timeline
 */
export function obtenerTipoVisual(mensaje: MensajeTimeline): TipoMensaje {
    if (mensaje.tipoMensaje === 'sistema') {
        return 'sistema';
    }
    return mensaje.esPropio ? 'enviado' : 'recibido';
}

/**
 * Mapeo de iconos para mensajes del sistema
 */
export function obtenerIconoAccion(accion: AccionSistema | null): string {
    const iconos: Record<AccionSistema, string> = {
        creado: 'Plus',
        editado: 'Edit',
        completado: 'CheckCircle',
        reabierto: 'Clock',
        asignado: 'UserCheck',
        desasignado: 'UserMinus',
        adjunto_agregado: 'Paperclip',
        adjunto_eliminado: 'Trash2',
        prioridad: 'Tag',
        urgencia: 'Zap',
        fecha_limite: 'Calendar',
        participante_agregado: 'UserPlus',
        participante_removido: 'UserMinus',
        compartido: 'Share2',
        descripcion: 'FileText',
        nombre: 'Type',
        repeticion: 'Repeat'
    };

    return accion ? iconos[accion] || 'History' : 'History';
}

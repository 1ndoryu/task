/*
 * Hook useSincronizacionTiempoReal
 *
 * Integra WebSocket con el sistema de sincronización existente para
 * proporcionar actualizaciones en tiempo real entre dispositivos.
 *
 * TAREA 9: Sincronización en tiempo real entre dispositivos
 *
 * Características:
 * - Recibe actualizaciones de otros dispositivos via WebSocket
 * - Envía cambios locales al servidor via WebSocket
 * - Maneja reconexión automática
 * - Fallback a sincronización HTTP si WebSocket no disponible
 * - Indicador visual de estado de conexión
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {useWebSocket, type MensajeWS, type MensajeSincronizacion, type EstadoConexion} from './useWebSocket';
import type {Habito, Tarea, Proyecto} from '../types/dashboard';

/* Configuración */
const CONFIG_SYNC_RT = {
    /* Debounce para enviar cambios (evitar spam) */
    debounceMs: 500,
    /* Tiempo máximo sin actividad antes de forzar sync HTTP */
    maxInactividadMs: 300000 /* 5 minutos */
};

/* Tipos de entidades sincronizables */
type EntidadSincronizable = 'tarea' | 'habito' | 'proyecto' | 'nota';
type AccionSincronizacion = 'crear' | 'editar' | 'eliminar' | 'toggle';

/* Payload de cambio local */
interface CambioLocal {
    entidad: EntidadSincronizable;
    accion: AccionSincronizacion;
    id?: number;
    datos?: unknown;
    timestamp: number;
}

/* Interface del hook */
interface UseSincronizacionTiempoRealReturn {
    /* Estado de conexión WebSocket */
    estadoConexion: EstadoConexion;
    conectado: boolean;
    /* Notificar cambio local para enviar a otros dispositivos */
    notificarCambio: (cambio: Omit<CambioLocal, 'timestamp'>) => void;
    /* Reconectar manualmente */
    reconectar: () => void;
    /* Indica si hay cambios pendientes de enviar */
    cambiosPendientes: boolean;
}

/* Callbacks para aplicar cambios remotos */
interface CallbacksSincronizacion {
    onTareaRemota?: (accion: AccionSincronizacion, datos: Partial<Tarea>) => void;
    onHabitoRemoto?: (accion: AccionSincronizacion, datos: Partial<Habito>) => void;
    onProyectoRemoto?: (accion: AccionSincronizacion, datos: Partial<Proyecto>) => void;
    onNotaRemota?: (accion: AccionSincronizacion, datos: {contenido: string}) => void;
    onSincronizacionCompleta?: () => void;
}

export function useSincronizacionTiempoReal(
    userId: number | null,
    callbacks: CallbacksSincronizacion = {},
    habilitado: boolean = true
): UseSincronizacionTiempoRealReturn {
    const [cambiosPendientes, setCambiosPendientes] = useState(false);

    /* Cola de cambios pendientes */
    const colaCambiosRef = useRef<CambioLocal[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ultimaSincRef = useRef<number>(Date.now());

    /* Handler de mensajes WebSocket */
    const manejarMensaje = useCallback(
        (mensaje: MensajeWS) => {
            /* Manejar mensaje de sincronización */
            if (mensaje.tipo === 'sync') {
                const syncMsg = mensaje as MensajeSincronizacion;
                const {entidad, accion, datos} = syncMsg.payload;

                console.log('[SyncRT] Cambio remoto recibido:', entidad, accion);

                switch (entidad) {
                    case 'tarea':
                        callbacks.onTareaRemota?.(accion, datos as Partial<Tarea>);
                        break;
                    case 'habito':
                        callbacks.onHabitoRemoto?.(accion, datos as Partial<Habito>);
                        break;
                    case 'proyecto':
                        callbacks.onProyectoRemoto?.(accion, datos as Partial<Proyecto>);
                        break;
                    case 'nota':
                        callbacks.onNotaRemota?.(accion, datos as {contenido: string});
                        break;
                }

                ultimaSincRef.current = Date.now();
            }

            /* Manejar confirmación de sincronización completa */
            if (mensaje.tipo === 'syncCompleta') {
                console.log('[SyncRT] Sincronización completa confirmada');
                callbacks.onSincronizacionCompleta?.();
            }
        },
        [callbacks]
    );

    /* Conexión WebSocket */
    const {estado: estadoConexion, conectado, enviar, reconectar} = useWebSocket(userId, manejarMensaje, habilitado);

    /* Enviar cambios pendientes */
    const enviarCambiosPendientes = useCallback(() => {
        if (!conectado || colaCambiosRef.current.length === 0) {
            setCambiosPendientes(false);
            return;
        }

        /* Agrupar cambios por entidad para optimizar */
        const cambios = [...colaCambiosRef.current];
        colaCambiosRef.current = [];

        /* Enviar cada cambio */
        cambios.forEach((cambio) => {
            const datosConId = typeof cambio.datos === 'object' && cambio.datos !== null
                ? {id: cambio.id, ...(cambio.datos as Record<string, unknown>)}
                : {id: cambio.id, datos: cambio.datos};

            const mensaje: MensajeSincronizacion = {
                tipo: 'sync',
                payload: {
                    entidad: cambio.entidad,
                    accion: cambio.accion as 'crear' | 'editar' | 'eliminar',
                    datos: datosConId,
                    timestamp: cambio.timestamp
                }
            };

            enviar(mensaje);
        });

        setCambiosPendientes(false);
        ultimaSincRef.current = Date.now();
        console.log('[SyncRT] Enviados', cambios.length, 'cambios');
    }, [conectado, enviar]);

    /* Notificar cambio local */
    const notificarCambio = useCallback(
        (cambio: Omit<CambioLocal, 'timestamp'>) => {
            if (!habilitado) return;

            /* Agregar a la cola */
            colaCambiosRef.current.push({
                ...cambio,
                timestamp: Date.now()
            });
            setCambiosPendientes(true);

            /* Debounce para enviar */
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                enviarCambiosPendientes();
            }, CONFIG_SYNC_RT.debounceMs);
        },
        [habilitado, enviarCambiosPendientes]
    );

    /* Enviar cambios pendientes cuando se conecta */
    useEffect(() => {
        if (conectado && colaCambiosRef.current.length > 0) {
            enviarCambiosPendientes();
        }
    }, [conectado, enviarCambiosPendientes]);

    /* Limpiar al desmontar */
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return {
        estadoConexion,
        conectado,
        notificarCambio,
        reconectar,
        cambiosPendientes
    };
}

/* Exportar tipos */
export type {CambioLocal, EntidadSincronizable, AccionSincronizacion, CallbacksSincronizacion};

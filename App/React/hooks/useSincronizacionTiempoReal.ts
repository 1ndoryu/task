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
    /* [014A-8] Se dispara tras aplicar cualquier cambio remoto válido.
     * Permite invalidar caches derivados (actividad, heatmap) sin acoplar stores. */
    onCambioRemotoAplicado?: () => void;
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

    /*
     * Ref para callbacks - evita stale closures.
     * Los callbacks pueden cambiar frecuentemente pero el manejarMensaje
     * siempre accederá a la versión más actual via callbacksRef.current
     */
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    /* Handler de mensajes WebSocket */
    const manejarMensaje = useCallback(
        (mensaje: MensajeWS) => {
            /* Manejar mensaje de sincronización */
            if (mensaje.tipo === 'sync') {
                const syncMsg = mensaje as MensajeSincronizacion;
                const {entidad, accion, datos, timestamp: tsRemoto} = syncMsg.payload;

                /*
                 * Last-Write-Wins: solo aplicar si el timestamp remoto es más reciente
                 * que la última sincronización local. Esto evita bucles de eco.
                 */
                if (tsRemoto && tsRemoto <= ultimaSincRef.current) {
                    console.log('[SyncRT] Cambio remoto ignorado (LWW): ts remoto', tsRemoto, '<= local', ultimaSincRef.current);
                    return;
                }

                console.log('[SyncRT] Cambio remoto recibido:', entidad, accion, 'ts:', tsRemoto);

                /* Usar callbacksRef.current para siempre tener la versión más actual */
                const currentCallbacks = callbacksRef.current;

                switch (entidad) {
                    case 'tarea':
                        currentCallbacks.onTareaRemota?.(accion, datos as Partial<Tarea>);
                        break;
                    case 'habito':
                        currentCallbacks.onHabitoRemoto?.(accion, datos as Partial<Habito>);
                        break;
                    case 'proyecto':
                        currentCallbacks.onProyectoRemoto?.(accion, datos as Partial<Proyecto>);
                        break;
                    case 'nota':
                        currentCallbacks.onNotaRemota?.(accion, datos as {contenido: string});
                        break;
                }

                /* [014A-8] Notificar que se aplicó un cambio remoto para que
                 * capas superiores (actividad, heatmap) invaliden sus caches */
                currentCallbacks.onCambioRemotoAplicado?.();

                /* Actualizar timestamp de última sync al recibir un cambio remoto válido */
                ultimaSincRef.current = tsRemoto || Date.now();
            }

            /* Manejar confirmación de sincronización completa */
            if (mensaje.tipo === 'syncCompleta') {
                console.log('[SyncRT] Sincronización completa confirmada');
                callbacksRef.current.onSincronizacionCompleta?.();
            }
        },
        [] /* Sin dependencias - usamos refs para acceder a valores actuales */
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

            const ahora = Date.now();

            /* Agregar a la cola */
            colaCambiosRef.current.push({
                ...cambio,
                timestamp: ahora
            });
            setCambiosPendientes(true);

            /*
             * Actualizar timestamp de última sync al crear un cambio local.
             * Esto evita que el eco WebSocket de nuestro propio cambio se reaplique.
             */
            ultimaSincRef.current = ahora;

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

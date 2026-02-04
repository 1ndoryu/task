/*
 * Hook useWebSocket
 *
 * Gestiona la conexión WebSocket para sincronización en tiempo real.
 * Incluye reconexión automática, detección de inactividad y heartbeat.
 *
 * TAREA 9: Sincronización en tiempo real entre dispositivos
 *
 * Características:
 * - Reconexión automática con backoff exponencial
 * - Heartbeat para mantener conexión viva
 * - Detección de inactividad de la pestaña
 * - Reconexión al volver a la app
 * - Indicador visual de estado de conexión
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {Capacitor} from '@capacitor/core';

/* Configuración del WebSocket */
const CONFIG_WS = {
    /* URL base del servidor WebSocket
     * TODO: Configurar wss:// a través del proxy de Coolify para producción
     */
    url: 'ws://66.94.100.241:8082',
    /* Intervalo de heartbeat en ms (mantener conexión viva) */
    heartbeatMs: 30000,
    /* Timeout para considerar conexión muerta si no hay pong */
    heartbeatTimeoutMs: 10000,
    /* Delay inicial de reconexión en ms */
    reconexionBaseMs: 1000,
    /* Máximo delay de reconexión (backoff exponencial) */
    reconexionMaxMs: 30000,
    /* Máximo de intentos de reconexión antes de pausar */
    maxIntentosReconexion: 10,
    /* Tiempo de inactividad antes de considerar pestaña inactiva */
    inactividadMs: 60000
};

/* Estados posibles de la conexión */
type EstadoConexion = 'conectando' | 'conectado' | 'desconectado' | 'reconectando' | 'error';

/* Tipos de mensajes WebSocket */
interface MensajeWS {
    tipo: string;
    payload?: unknown;
    timestamp?: number;
}

interface MensajeSincronizacion {
    tipo: 'sync';
    payload: {
        entidad: 'tarea' | 'habito' | 'proyecto' | 'nota';
        accion: 'crear' | 'editar' | 'eliminar';
        datos: unknown;
        timestamp: number;
    };
}

/* Interfaz del hook */
interface UseWebSocketReturn {
    estado: EstadoConexion;
    conectado: boolean;
    ultimaActividad: Date | null;
    enviar: (mensaje: MensajeWS) => boolean;
    reconectar: () => void;
    desconectar: () => void;
}

/* Callback para manejar mensajes entrantes */
type MensajeHandler = (mensaje: MensajeWS) => void;

export function useWebSocket(userId: number | null, onMensaje?: MensajeHandler, habilitado: boolean = true): UseWebSocketReturn {
    const [estado, setEstado] = useState<EstadoConexion>('desconectado');
    const [ultimaActividad, setUltimaActividad] = useState<Date | null>(null);

    /* Referencias para persistir entre renders */
    const wsRef = useRef<WebSocket | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconexionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intentosReconexionRef = useRef(0);
    const montadoRef = useRef(true);
    const ultimaActividadRef = useRef<number>(Date.now());

    /* Limpiar heartbeat */
    const limpiarHeartbeat = useCallback(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
        }
    }, []);

    /* Limpiar timeout de reconexión */
    const limpiarReconexion = useCallback(() => {
        if (reconexionTimeoutRef.current) {
            clearTimeout(reconexionTimeoutRef.current);
            reconexionTimeoutRef.current = null;
        }
    }, []);

    /* Cerrar conexión WebSocket */
    const cerrarConexion = useCallback(() => {
        limpiarHeartbeat();
        limpiarReconexion();

        if (wsRef.current) {
            wsRef.current.onclose = null; /* Evitar reconexión automática */
            wsRef.current.close();
            wsRef.current = null;
        }
    }, [limpiarHeartbeat, limpiarReconexion]);

    /* Enviar heartbeat (ping) */
    const enviarHeartbeat = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({tipo: 'ping', timestamp: Date.now()}));

            /* Configurar timeout para esperar pong */
            heartbeatTimeoutRef.current = setTimeout(() => {
                console.warn('[WebSocket] No se recibió pong, reconectando...');
                cerrarConexion();
                setEstado('reconectando');
            }, CONFIG_WS.heartbeatTimeoutMs);
        }
    }, [cerrarConexion]);

    /* Iniciar heartbeat */
    const iniciarHeartbeat = useCallback(() => {
        limpiarHeartbeat();
        heartbeatRef.current = setInterval(enviarHeartbeat, CONFIG_WS.heartbeatMs);
    }, [enviarHeartbeat, limpiarHeartbeat]);

    /* Conectar al WebSocket */
    const conectar = useCallback(() => {
        if (!habilitado || !userId || wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        /* Cerrar conexión existente si hay */
        cerrarConexion();
        setEstado('conectando');

        try {
            const ws = new WebSocket(CONFIG_WS.url);

            ws.onopen = () => {
                if (!montadoRef.current) return;

                console.log('[WebSocket] Conectado');
                setEstado('conectado');
                intentosReconexionRef.current = 0;

                /* Registrar usuario */
                ws.send(
                    JSON.stringify({
                        accion: 'registrar',
                        idUsuario: userId,
                        timestamp: Date.now()
                    })
                );

                /* Iniciar heartbeat */
                iniciarHeartbeat();
                setUltimaActividad(new Date());
            };

            ws.onmessage = evento => {
                if (!montadoRef.current) return;

                try {
                    const mensaje = JSON.parse(evento.data) as MensajeWS;
                    setUltimaActividad(new Date());

                    /* Manejar pong (respuesta a heartbeat) */
                    if (mensaje.tipo === 'pong') {
                        if (heartbeatTimeoutRef.current) {
                            clearTimeout(heartbeatTimeoutRef.current);
                            heartbeatTimeoutRef.current = null;
                        }
                        return;
                    }

                    /* Pasar mensaje al handler */
                    onMensaje?.(mensaje);
                } catch (error) {
                    console.error('[WebSocket] Error parseando mensaje:', error);
                }
            };

            ws.onerror = error => {
                console.error('[WebSocket] Error:', error);
                setEstado('error');
            };

            ws.onclose = evento => {
                if (!montadoRef.current) return;

                console.log('[WebSocket] Desconectado. Código:', evento.code);
                limpiarHeartbeat();

                /* Reconectar automáticamente si no fue cierre intencional */
                if (evento.code !== 1000 && habilitado) {
                    programarReconexion();
                } else {
                    setEstado('desconectado');
                }
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('[WebSocket] Error al conectar:', error);
            setEstado('error');
            programarReconexion();
        }
    }, [habilitado, userId, cerrarConexion, iniciarHeartbeat, limpiarHeartbeat, onMensaje]);

    /* Programar reconexión con backoff exponencial */
    const programarReconexion = useCallback(() => {
        if (!habilitado || !montadoRef.current) return;

        intentosReconexionRef.current += 1;
        setEstado('reconectando');

        if (intentosReconexionRef.current > CONFIG_WS.maxIntentosReconexion) {
            console.warn('[WebSocket] Máximo de intentos alcanzado, pausando reconexión');
            setEstado('error');
            return;
        }

        /* Backoff exponencial: 1s, 2s, 4s, 8s... hasta 30s */
        const delay = Math.min(CONFIG_WS.reconexionBaseMs * Math.pow(2, intentosReconexionRef.current - 1), CONFIG_WS.reconexionMaxMs);

        console.log(`[WebSocket] Reconectando en ${delay}ms (intento ${intentosReconexionRef.current})`);

        reconexionTimeoutRef.current = setTimeout(() => {
            if (montadoRef.current && habilitado) {
                conectar();
            }
        }, delay);
    }, [habilitado, conectar]);

    /* Enviar mensaje */
    const enviar = useCallback((mensaje: MensajeWS): boolean => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocket] No conectado, no se puede enviar mensaje');
            return false;
        }

        try {
            wsRef.current.send(JSON.stringify({...mensaje, timestamp: Date.now()}));
            ultimaActividadRef.current = Date.now();
            return true;
        } catch (error) {
            console.error('[WebSocket] Error enviando mensaje:', error);
            return false;
        }
    }, []);

    /* Reconectar manualmente */
    const reconectar = useCallback(() => {
        intentosReconexionRef.current = 0;
        conectar();
    }, [conectar]);

    /* Desconectar manualmente */
    const desconectar = useCallback(() => {
        cerrarConexion();
        setEstado('desconectado');
    }, [cerrarConexion]);

    /* Detectar visibilidad de la página */
    useEffect(() => {
        if (!habilitado) return;

        const manejarVisibilidad = () => {
            if (document.visibilityState === 'visible') {
                console.log('[WebSocket] Página visible, verificando conexión...');

                /* Verificar si la conexión sigue viva */
                if (wsRef.current?.readyState !== WebSocket.OPEN) {
                    console.log('[WebSocket] Conexión perdida, reconectando...');
                    intentosReconexionRef.current = 0;
                    conectar();
                } else {
                    /* Enviar heartbeat para verificar que sigue activa */
                    enviarHeartbeat();
                }
            }
        };

        document.addEventListener('visibilitychange', manejarVisibilidad);
        return () => document.removeEventListener('visibilitychange', manejarVisibilidad);
    }, [habilitado, conectar, enviarHeartbeat]);

    /* Detectar online/offline */
    useEffect(() => {
        if (!habilitado) return;

        const manejarOnline = () => {
            console.log('[WebSocket] Red disponible, reconectando...');
            intentosReconexionRef.current = 0;
            conectar();
        };

        const manejarOffline = () => {
            console.log('[WebSocket] Red perdida');
            setEstado('desconectado');
        };

        window.addEventListener('online', manejarOnline);
        window.addEventListener('offline', manejarOffline);

        return () => {
            window.removeEventListener('online', manejarOnline);
            window.removeEventListener('offline', manejarOffline);
        };
    }, [habilitado, conectar]);

    /* Reconectar al volver a la app (Capacitor) */
    useEffect(() => {
        if (!habilitado || !Capacitor.isNativePlatform()) return;

        let limpiar: (() => void) | null = null;

        (async () => {
            try {
                const modulo = await import('@capacitor/app');
                const {App} = modulo;

                const listener = await App.addListener('appStateChange', ({isActive}) => {
                    if (isActive && montadoRef.current) {
                        console.log('[WebSocket] App activa, verificando conexión...');
                        if (wsRef.current?.readyState !== WebSocket.OPEN) {
                            intentosReconexionRef.current = 0;
                            conectar();
                        }
                    }
                });

                limpiar = () => listener.remove();
            } catch {
                /* Plugin no disponible */
            }
        })();

        return () => limpiar?.();
    }, [habilitado, conectar]);

    /* Conectar al montar si está habilitado y hay userId */
    useEffect(() => {
        montadoRef.current = true;

        if (habilitado && userId) {
            conectar();
        }

        return () => {
            montadoRef.current = false;
            cerrarConexion();
        };
    }, [habilitado, userId, conectar, cerrarConexion]);

    return {
        estado,
        conectado: estado === 'conectado',
        ultimaActividad,
        enviar,
        reconectar,
        desconectar
    };
}

/* Tipos exportados */
export type {EstadoConexion, MensajeWS, MensajeSincronizacion, MensajeHandler};

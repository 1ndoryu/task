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
import {devLog, devWarn} from '../utils/devLog';
import {logError} from '../utils/logger';

/*
 * Detección de entorno para WebSocket
 *
 * [18-08-2026] El backend Rust expone /api/realtime/ws en el mismo origen
 * (sesión por cookie, sin registro manual). En dev el front corre en 5173 y
 * el backend en 3000; en producción van tras el mismo proxy con wss://.
 */
const esPlataformaNativa = Capacitor.isNativePlatform();
const esHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';

/* URL del WebSocket según el entorno */
const obtenerUrlWebSocket = (): string => {
    const host = window.location.hostname || 'localhost';
    /* HTTPS (producción): mismo origen, wss:// para evitar mixed content */
    if (esHttps) {
        return `wss://${window.location.host}/api/realtime/ws`;
    }
    /* HTTP local: backend Rust en el puerto 3000 */
    return `ws://${host}:3000/api/realtime/ws`;
};

/* Configuración del WebSocket */
const CONFIG_WS = {
    /* URL del servidor WebSocket (determinada según entorno) */
    url: obtenerUrlWebSocket(),
    /* Intervalo de heartbeat en ms (mantener conexión viva) */
    heartbeatMs: 30000,
    /* Timeout para considerar conexión muerta si no hay pong */
    heartbeatTimeoutMs: 10000,
    /* Delay inicial de reconexión en ms */
    reconexionBaseMs: 1000,
    /* Máximo delay de reconexión (backoff exponencial) */
    reconexionMaxMs: 30000,
    /* Tiempo de inactividad antes de considerar pestaña inactiva */
    inactividadMs: 60000,
    /* WebSocket ya no está bloqueado, wss:// configurado */
    deshabilitadoPorMixedContent: false
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

    /* Log inicial de configuración para depuración */
    useEffect(() => {
        devLog('[WebSocket] Config inicial:', {
            url: CONFIG_WS.url,
            userId,
            habilitado,
            esPlataformaNativa,
            esHttps,
            deshabilitadoPorMixedContent: CONFIG_WS.deshabilitadoPorMixedContent
        });
    }, [userId, habilitado]);

    /* Referencias para persistir entre renders */
    const wsRef = useRef<WebSocket | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconexionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intentosReconexionRef = useRef(0);
    const montadoRef = useRef(true);
    const ultimaActividadRef = useRef<number>(Date.now());
    /* Ref para mantener el handler actualizado sin reconectar */
    const onMensajeRef = useRef(onMensaje);
    onMensajeRef.current = onMensaje;

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
            /* El backend responde 'pong' al texto plano 'ping' */
            wsRef.current.send('ping');

            /* Configurar timeout para esperar pong */
            heartbeatTimeoutRef.current = setTimeout(() => {
                devWarn('[WebSocket] No se recibió pong, reconectando...');
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
        if (!habilitado) {
            devLog('[WebSocket] No conecta: habilitado=false');
            return;
        }
        if (!userId) {
            devLog('[WebSocket] No conecta: userId es null/undefined');
            return;
        }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            devLog('[WebSocket] No conecta: ya hay conexión abierta');
            return;
        }

        devLog('[WebSocket] Conectando a:', CONFIG_WS.url);

        /* Cerrar conexión existente si hay */
        cerrarConexion();
        setEstado('conectando');

        try {
            const ws = new WebSocket(CONFIG_WS.url);

            ws.onopen = () => {
                if (!montadoRef.current) return;

                devLog('[WebSocket] Conectado');
                setEstado('conectado');
                intentosReconexionRef.current = 0;

                /* [18-08-2026] El backend identifica por cookie de sesión;
                 * no hace falta registrar el usuario. */
                void userId;

                /* Iniciar heartbeat */
                iniciarHeartbeat();
                setUltimaActividad(new Date());
            };

            ws.onmessage = evento => {
                if (!montadoRef.current) return;

                try {
                    const mensaje = JSON.parse(evento.data) as MensajeWS;
                    devLog('[WebSocket] Mensaje recibido:', mensaje.tipo);
                    setUltimaActividad(new Date());

                    /* Manejar pong (respuesta a heartbeat) */
                    if (mensaje.tipo === 'pong') {
                        if (heartbeatTimeoutRef.current) {
                            clearTimeout(heartbeatTimeoutRef.current);
                            heartbeatTimeoutRef.current = null;
                        }
                        return;
                    }

                    /* Pasar mensaje al handler (usar ref para tener siempre la versión actualizada) */
                    devLog('[WebSocket] Pasando a handler:', JSON.stringify(mensaje).substring(0, 100));
                    onMensajeRef.current?.(mensaje);
                } catch (error) {
                    logError('useWebSocket', 'Error parseando mensaje:', error);
                }
            };

            ws.onerror = error => {
                logError('useWebSocket', 'Error:', error);
                setEstado('error');
            };

            ws.onclose = evento => {
                if (!montadoRef.current) return;

                devLog('[WebSocket] Desconectado. Código:', evento.code);
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
            logError('useWebSocket', 'Error al conectar:', error);
            setEstado('error');
            programarReconexion();
        }
    }, [habilitado, userId, cerrarConexion, iniciarHeartbeat, limpiarHeartbeat]);

    /* Programar reconexión con backoff exponencial */
    const programarReconexion = useCallback(() => {
        if (!habilitado || !montadoRef.current) return;

        intentosReconexionRef.current += 1;
        setEstado('reconectando');

        /* [066A-1] Sin límite de reintentos: backoff exponencial hasta 30s y reintenta
         * indefinidamente. El WS debe reconectar siempre, incluso si el servidor
         * estuvo caído largo rato. Sin esto, tras 10 intentos fallidos el hook
         * se quedaba en estado 'error' y el usuario perdía sync en tiempo real
         * hasta refrescar la página. */

        /* Backoff exponencial: 1s, 2s, 4s, 8s... hasta 30s */
        const delay = Math.min(CONFIG_WS.reconexionBaseMs * Math.pow(2, intentosReconexionRef.current - 1), CONFIG_WS.reconexionMaxMs);

        devLog(`[WebSocket] Reconectando en ${delay}ms (intento ${intentosReconexionRef.current})`);

        reconexionTimeoutRef.current = setTimeout(() => {
            if (montadoRef.current) {
                conectar();
            }
        }, delay);
    }, [habilitado, conectar]);

    /* Enviar mensaje */
    const enviar = useCallback((mensaje: MensajeWS): boolean => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
            devWarn('[WebSocket] No conectado, no se puede enviar mensaje');
            return false;
        }

        try {
            wsRef.current.send(JSON.stringify({...mensaje, timestamp: Date.now()}));
            ultimaActividadRef.current = Date.now();
            return true;
        } catch (error) {
            logError('useWebSocket', 'Error enviando mensaje:', error);
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
                devLog('[WebSocket] Página visible, verificando conexión...');

                /* Verificar si la conexión sigue viva */
                if (wsRef.current?.readyState !== WebSocket.OPEN) {
                    devLog('[WebSocket] Conexión perdida, reconectando...');
                    /* [066A-1] Limpiar timeout de reconexión pendiente y reconectar
                     * inmediatamente al volver a la pestaña. Sin esto, si el backoff
                     * estaba esperando 30s, el usuario tendría que esperar ese tiempo
                     * al volver a la pestaña aunque el servidor ya esté disponible. */
                    limpiarReconexion();
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
    }, [habilitado, conectar, enviarHeartbeat, limpiarReconexion]);

    /* Detectar online/offline */
    useEffect(() => {
        if (!habilitado) return;

        const manejarOnline = () => {
            devLog('[WebSocket] Red disponible, reconectando...');
            intentosReconexionRef.current = 0;
            conectar();
        };

        const manejarOffline = () => {
            devLog('[WebSocket] Red perdida');
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
                /* [T7] `@capacitor/app` declara tipos (dist/esm/index.d.ts); se
                 * resuelve por import dinámico solo en plataforma nativa. */
                const modulo = await import('@capacitor/app');
                const {App} = modulo;

                const listener = await App.addListener('appStateChange', ({isActive}: {isActive: boolean}) => {
                    if (isActive && montadoRef.current) {
                        devLog('[WebSocket] App activa, verificando conexión...');
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

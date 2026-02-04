/*
 * Componente IndicadorConexion
 *
 * Muestra el estado de conexión de la aplicación.
 * Aparece cuando hay problemas de conexión o hay cambios pendientes.
 *
 * TAREA 11: Indicador visual de modo offline
 *
 * Estados:
 * - Conectado: verde (oculto por defecto)
 * - Sincronizando: azul con animación
 * - Offline: rojo
 * - Pendiente: naranja (hay cambios sin sincronizar)
 */

import React from 'react';
import {Wifi, WifiOff, Cloud, CloudOff, RefreshCw, AlertCircle} from 'lucide-react';
import type {EstadoConexion} from '../../hooks/useWebSocket';

type EstadoIndicador = 'conectado' | 'conectando' | 'sincronizando' | 'pendiente' | 'offline' | 'error';

interface IndicadorConexionProps {
    /* Estado de conexión WebSocket */
    estadoWebSocket?: EstadoConexion;
    /* Si hay operaciones pendientes de sincronizar */
    operacionesPendientes?: number;
    /* Si está sincronizando actualmente */
    sincronizando?: boolean;
    /* Si está offline */
    offline?: boolean;
    /* Mensaje de error */
    error?: string | null;
    /* Callback al hacer click (por ejemplo, forzar sync) */
    onClick?: () => void;
    /* Mostrar siempre (incluso cuando conectado) */
    mostrarSiempre?: boolean;
    /* Posición: 'top' | 'bottom' */
    posicion?: 'top' | 'bottom';
}

export function IndicadorConexion({
    estadoWebSocket = 'desconectado',
    operacionesPendientes = 0,
    sincronizando = false,
    offline = false,
    error = null,
    onClick,
    mostrarSiempre = false,
    posicion = 'top'
}: IndicadorConexionProps): JSX.Element | null {
    /* Determinar estado a mostrar */
    const determinarEstado = (): EstadoIndicador => {
        if (error) return 'error';
        if (offline) return 'offline';
        if (sincronizando) return 'sincronizando';
        if (operacionesPendientes > 0) return 'pendiente';
        if (estadoWebSocket === 'conectando' || estadoWebSocket === 'reconectando') return 'conectando';
        return 'conectado';
    };

    const estado = determinarEstado();

    /* No mostrar si está conectado y no hay nada pendiente (a menos que mostrarSiempre) */
    if (estado === 'conectado' && !mostrarSiempre) {
        return null;
    }

    /* Configuración visual según estado */
    const configuracionEstado: Record<
        EstadoIndicador,
        {icono: JSX.Element; texto: string; color: string; colorFondo: string}
    > = {
        conectado: {
            icono: <Wifi size={14} />,
            texto: 'Conectado',
            color: 'var(--dashboard-estadoExito, #4ade80)',
            colorFondo: 'rgba(74, 222, 128, 0.1)'
        },
        conectando: {
            icono: <RefreshCw size={14} className="indicadorConexion__iconoAnimado" />,
            texto: 'Conectando...',
            color: 'var(--dashboard-textoSecundario, #888)',
            colorFondo: 'rgba(136, 136, 136, 0.1)'
        },
        sincronizando: {
            icono: <Cloud size={14} className="indicadorConexion__iconoAnimado" />,
            texto: 'Sincronizando...',
            color: 'var(--dashboard-estadoInfo, #60a5fa)',
            colorFondo: 'rgba(96, 165, 250, 0.1)'
        },
        pendiente: {
            icono: <CloudOff size={14} />,
            texto: `${operacionesPendientes} cambio${operacionesPendientes > 1 ? 's' : ''} pendiente${operacionesPendientes > 1 ? 's' : ''}`,
            color: 'var(--dashboard-estadoAdvertencia, #fbbf24)',
            colorFondo: 'rgba(251, 191, 36, 0.1)'
        },
        offline: {
            icono: <WifiOff size={14} />,
            texto: 'Sin conexión',
            color: 'var(--dashboard-estadoError, #f87171)',
            colorFondo: 'rgba(248, 113, 113, 0.1)'
        },
        error: {
            icono: <AlertCircle size={14} />,
            texto: error || 'Error de conexión',
            color: 'var(--dashboard-estadoError, #f87171)',
            colorFondo: 'rgba(248, 113, 113, 0.1)'
        }
    };

    const config = configuracionEstado[estado];

    return (
        <div
            className={`indicadorConexion indicadorConexion--${estado} indicadorConexion--${posicion}`}
            onClick={onClick}
            style={{
                position: 'fixed',
                [posicion]: 'env(safe-area-inset-' + posicion + ', 0px)',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: posicion === 'top' ? '0 0 8px 8px' : '8px 8px 0 0',
                backgroundColor: config.colorFondo,
                border: `1px solid ${config.color}`,
                borderTop: posicion === 'top' ? 'none' : undefined,
                borderBottom: posicion === 'bottom' ? 'none' : undefined,
                color: config.color,
                fontSize: '12px',
                fontWeight: 500,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(8px)'
            }}>
            {config.icono}
            <span>{config.texto}</span>

            {/* Estilos de animación */}
            <style>{`
                .indicadorConexion__iconoAnimado {
                    animation: indicadorConexionSpin 1s linear infinite;
                }
                @keyframes indicadorConexionSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .indicadorConexion:hover {
                    opacity: 0.9;
                }
            `}</style>
        </div>
    );
}

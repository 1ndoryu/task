import {Wifi, WifiOff, RefreshCw, AlertTriangle} from 'lucide-react';

interface SincronizacionInfo {
    sincronizado: boolean;
    pendiente: boolean;
    error: string | null;
    estaLogueado: boolean;
    sincronizarAhora: () => Promise<void>;
    onLogin?: () => void;
    onLogout?: () => void;
}

interface EncabezadoEstadoProps {
    sincronizacion?: SincronizacionInfo;
}

export function EncabezadoEstado({sincronizacion}: EncabezadoEstadoProps) {
    const estaConectado = sincronizacion?.estaLogueado ?? false;

    const obtenerEstadoConexion = () => {
        if (!estaConectado) {
            return {
                icono: <WifiOff size={14} />,
                clase: 'estadoConexionIcono--desconectado',
                titulo: 'Modo local - Click para iniciar sesión',
                onClick: sincronizacion?.onLogin,
                texto: 'Iniciar sesión'
            };
        }

        if (sincronizacion?.error) {
            return {
                icono: <AlertTriangle size={14} />,
                clase: 'estadoConexionIcono--error',
                titulo: `Error: ${sincronizacion.error}. Click para reintentar.`,
                onClick: sincronizacion.sincronizarAhora
            };
        }

        if (sincronizacion?.pendiente || !sincronizacion?.sincronizado) {
            return {
                icono: <RefreshCw size={14} className="iconoGirando" />,
                clase: 'estadoConexionIcono--sincronizando',
                titulo: 'Sincronizando...',
                onClick: undefined
            };
        }

        return {
            icono: <Wifi size={14} />,
            clase: 'estadoConexionIcono--conectado',
            titulo: 'Conectado y sincronizado',
            onClick: undefined
        };
    };

    const estadoConexion = obtenerEstadoConexion();

    if (estadoConexion.onClick) {
        return (
            <button type="button" className={`estadoConexionIcono ${estadoConexion.clase}`} title={estadoConexion.titulo} onClick={estadoConexion.onClick}>
                {estadoConexion.icono}
                {'texto' in estadoConexion && estadoConexion.texto && <span className="estadoConexionIcono__texto">{estadoConexion.texto}</span>}
            </button>
        );
    }

    return (
        <span className={`estadoConexionIcono ${estadoConexion.clase}`} title={estadoConexion.titulo}>
            {estadoConexion.icono}
        </span>
    );
}

import {Wifi, WifiOff, RefreshCw, AlertTriangle} from 'lucide-react';
import {Boton} from '../../ui/Boton';
import type {SincronizacionInfo} from '../../../types/dashboard';

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
            <Boton type="button" claseAdicional={`estadoConexionIcono ${estadoConexion.clase}`} title={estadoConexion.titulo} onClick={estadoConexion.onClick}>
                {estadoConexion.icono}
                {'texto' in estadoConexion && estadoConexion.texto && <span className="estadoConexionIcono__texto">{estadoConexion.texto}</span>}
            </Boton>
        );
    }

    return (
        <span className={`estadoConexionIcono ${estadoConexion.clase}`} title={estadoConexion.titulo}>
            {estadoConexion.icono}
        </span>
    );
}

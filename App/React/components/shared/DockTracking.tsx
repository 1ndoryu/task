/*
 * DockTracking.tsx
 * Barra inferior fija que muestra el tracking de tiempo activo
 * Se posiciona encima de NavegacionInferior en móvil
 * Diseño minimalista estilo terminal
 */

import {Play, Pause, Square, CheckCircle2, X, Timer} from 'lucide-react';
import {useTimeTracker} from '../../hooks/useTimeTracker';

interface DockTrackingProps {
    esMovil?: boolean;
    onCompletarEntidad?: (entidadId: number, tipoEntidad: 'tarea' | 'habito') => void;
}

export function DockTracking({esMovil = false, onCompletarEntidad}: DockTrackingProps): JSX.Element | null {
    const tracker = useTimeTracker();

    /* Solo mostrar si hay tracking activo o pausado */
    if (!tracker.estaActivo && !tracker.estaPausado) return null;

    const manejarCompletar = () => {
        if (tracker.entidadId && tracker.tipoEntidad && onCompletarEntidad) {
            onCompletarEntidad(tracker.entidadId, tracker.tipoEntidad);
        }
        tracker.completar();
    };

    return (
        <div className={`dockTracking ${esMovil ? 'dockTracking--movil' : ''} ${tracker.estaPausado ? 'dockTracking--pausado' : ''}`}>
            {/* Barra de progreso si hay tiempo mínimo */}
            {tracker.porcentajeProgreso > 0 && (
                <div className="dockTrackingProgreso">
                    <div className="dockTrackingProgresoRelleno" style={{width: `${tracker.porcentajeProgreso}%`}} />
                </div>
            )}

            <div className="dockTrackingContenido">
                {/* Info de la entidad */}
                <div className="dockTrackingInfo">
                    <Timer size={14} className="dockTrackingIcono" />
                    <span className="dockTrackingNombre" title={tracker.nombreEntidad}>
                        {tracker.nombreEntidad}
                    </span>
                </div>

                {/* Timer */}
                <div className="dockTrackingTimer">
                    {tracker.progresoFormateado ? (
                        <span className={`dockTrackingTiempo ${tracker.alcanzoMinimo ? 'dockTrackingTiempo--completado' : ''}`}>{tracker.progresoFormateado}</span>
                    ) : (
                        <span className="dockTrackingTiempo">{tracker.tiempoFormateado}</span>
                    )}
                    {tracker.alcanzoMinimo && <CheckCircle2 size={12} className="dockTrackingCheckMinimo" />}
                </div>

                {/* Acciones */}
                <div className="dockTrackingAcciones">
                    {tracker.estaActivo ? (
                        <button type="button" className="dockTrackingBoton" onClick={tracker.pausar} title="Pausar" aria-label="Pausar tracking">
                            <Pause size={14} />
                        </button>
                    ) : (
                        <button type="button" className="dockTrackingBoton dockTrackingBoton--reanudar" onClick={tracker.reanudar} title="Reanudar" aria-label="Reanudar tracking">
                            <Play size={14} />
                        </button>
                    )}

                    <button type="button" className="dockTrackingBoton dockTrackingBoton--completar" onClick={manejarCompletar} title="Completar" aria-label="Completar tracking">
                        <Square size={14} />
                    </button>

                    <button type="button" className="dockTrackingBoton dockTrackingBoton--cancelar" onClick={tracker.cancelar} title="Cancelar" aria-label="Cancelar tracking">
                        <X size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}

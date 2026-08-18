/*
 * DockTracking.tsx
 * Barra inferior fija que muestra el tracking de tiempo activo
 * Se posiciona encima de NavegacionInferior en móvil
 * Diseño minimalista estilo terminal
 */

import {Clock3, Play, Pause, CheckCircle2, X, Timer} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {useDockTracking} from '../../hooks/dashboard/useDockTracking';

interface DockTrackingProps {
    esMovil?: boolean;
    onCompletarEntidad?: (entidadId: number, tipoEntidad: 'tarea' | 'habito', detallesActividad?: Record<string, unknown>) => void;
}

export function DockTracking({esMovil = false, onCompletarEntidad}: DockTrackingProps): JSX.Element | null {
    const {tracker, manejarCompletar, manejarInicioAjuste, manejarMovimientoAjuste, manejarFinAjuste} = useDockTracking({onCompletarEntidad});

    /* Solo mostrar si hay tracking activo o pausado */
    if (!tracker.estaActivo && !tracker.estaPausado) return null;

    return (
        <div className={`dockTracking ${esMovil ? 'dockTracking--movil' : ''} ${tracker.estaPausado ? 'dockTracking--pausado' : ''}`}>
            {/* Barra de progreso si hay tiempo mínimo */}
            {tracker.porcentajeProgreso > 0 && (
                <div className="dockTrackingProgreso">
                    <div className="dockTrackingProgresoRelleno" style={{width: `${tracker.porcentajeProgreso}%`}} /> {/* sentinel-disable inline-style-prohibido */}
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
                    <Boton
                        type="button"
                        claseAdicional="dockTrackingBoton dockTrackingBoton--ajusteTiempo"
                        title="Arrastra a derecha para sumar tiempo y a izquierda para restar"
                        aria-label="Ajustar tiempo del tracking arrastrando"
                        onPointerDown={manejarInicioAjuste}
                        onPointerMove={manejarMovimientoAjuste}
                        onPointerUp={manejarFinAjuste}
                        onPointerCancel={manejarFinAjuste}
                    >
                        <Clock3 size={12} />
                    </Boton>
                    {tracker.alcanzoMinimo && <CheckCircle2 size={12} className="dockTrackingCheckMinimo" />}
                </div>

                {/* Acciones */}
                <div className="dockTrackingAcciones">
                    {tracker.estaActivo ? (
                        <Boton type="button" claseAdicional="dockTrackingBoton" onClick={tracker.pausar} title="Pausar" aria-label="Pausar tracking">
                            <Pause size={14} />
                        </Boton>
                    ) : (
                        <Boton type="button" claseAdicional="dockTrackingBoton dockTrackingBoton--reanudar" onClick={tracker.reanudar} title="Reanudar" aria-label="Reanudar tracking">
                            <Play size={14} />
                        </Boton>
                    )}

                    <Boton type="button" claseAdicional="dockTrackingBoton dockTrackingBoton--completar" onClick={manejarCompletar} title="Completar" aria-label="Completar tracking">
                        <CheckCircle2 size={14} />
                    </Boton>

                    <Boton type="button" claseAdicional="dockTrackingBoton dockTrackingBoton--cancelar" onClick={tracker.cancelar} title="Cancelar" aria-label="Cancelar tracking">
                        <X size={12} />
                    </Boton>
                </div>
            </div>
        </div>
    );
}

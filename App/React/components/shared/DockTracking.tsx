/*
 * DockTracking.tsx
 * Barra inferior fija que muestra el tracking de tiempo activo
 * Se posiciona encima de NavegacionInferior en móvil
 * Diseño minimalista estilo terminal
 */

import {useEffect, useRef, type PointerEvent} from 'react';
import {Clock3, Play, Pause, CheckCircle2, X, Timer} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {useTimeTracker} from '../../hooks/useTimeTracker';
import {useTimeTrackerStore} from '../../stores/timeTrackerStore';
import type {SesionTracking} from '../../types/timeTracker';

interface DockTrackingProps {
    esMovil?: boolean;
    onCompletarEntidad?: (entidadId: number, tipoEntidad: 'tarea' | 'habito', detallesActividad?: Record<string, unknown>) => void;
}

function formatearHoraLocal(timestamp: number): string {
    const fecha = new Date(timestamp);
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    const segundos = String(fecha.getSeconds()).padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
}

function construirDetallesTracking(sesion: SesionTracking): Record<string, unknown> {
    const fin = sesion.fin ?? Date.now();
    return {
        origen: 'time_tracker',
        trackingId: sesion.id,
        horaInicio: formatearHoraLocal(sesion.inicio),
        horaFin: formatearHoraLocal(fin),
        tiempoTrackingMs: sesion.tiempoEfectivoMs,
        tiempoTrackingMinutos: Math.round(sesion.tiempoEfectivoMs / 60000),
        tiempoTrackingFormateado: `${Math.floor(sesion.tiempoEfectivoMs / 60000)}m`
    };
}

export function DockTracking({esMovil = false, onCompletarEntidad}: DockTrackingProps): JSX.Element | null {
    const tracker = useTimeTracker();
    const completarTracking = useTimeTrackerStore(state => state.completarTracking);
    const tituloOriginalRef = useRef<string>('');
    const ajusteArrastreRef = useRef({
        activo: false,
        xInicial: 0,
        deltaAplicadoSegundos: 0,
        estabaActivoAntesDeArrastre: false
    });

    useEffect(() => {
        tituloOriginalRef.current = document.title;

        return () => {
            document.title = tituloOriginalRef.current;
        };
    }, []);

    useEffect(() => {
        if (tracker.estaActivo || tracker.estaPausado) {
            const nombreEntidad = tracker.nombreEntidad?.trim() || 'Tracking';
            document.title = `${tracker.tiempoFormateado} • ${nombreEntidad}`;
            return;
        }

        document.title = tituloOriginalRef.current;
    }, [tracker.estaActivo, tracker.estaPausado, tracker.tiempoFormateado, tracker.nombreEntidad]);

    /* Solo mostrar si hay tracking activo o pausado */
    if (!tracker.estaActivo && !tracker.estaPausado) return null;

    const manejarCompletar = () => {
        const sesionFinal = completarTracking();
        if (sesionFinal && onCompletarEntidad) {
            const detallesActividad = construirDetallesTracking(sesionFinal);
            onCompletarEntidad(sesionFinal.entidadId, sesionFinal.tipoEntidad, detallesActividad);
        }
    };

    const manejarInicioAjuste = (evento: PointerEvent<HTMLButtonElement>) => {
        if (!tracker.estaActivo && !tracker.estaPausado) return;

        evento.preventDefault();
        evento.currentTarget.setPointerCapture(evento.pointerId);

        const estabaActivo = tracker.estaActivo;
        if (estabaActivo) {
            tracker.pausar();
        }

        ajusteArrastreRef.current = {
            activo: true,
            xInicial: evento.clientX,
            deltaAplicadoSegundos: 0,
            estabaActivoAntesDeArrastre: estabaActivo
        };
    };

    const manejarMovimientoAjuste = (evento: PointerEvent<HTMLButtonElement>) => {
        if (!ajusteArrastreRef.current.activo) return;

        const PIXELES_POR_SEGUNDO = 6;
        const deltaX = evento.clientX - ajusteArrastreRef.current.xInicial;
        const deltaObjetivoSegundos = Math.trunc(deltaX / PIXELES_POR_SEGUNDO);
        const deltaIncrementalSegundos = deltaObjetivoSegundos - ajusteArrastreRef.current.deltaAplicadoSegundos;

        if (deltaIncrementalSegundos !== 0) {
            tracker.ajustarTiempo(deltaIncrementalSegundos * 1000);
            ajusteArrastreRef.current.deltaAplicadoSegundos = deltaObjetivoSegundos;
        }
    };

    const manejarFinAjuste = (evento: PointerEvent<HTMLButtonElement>) => {
        if (!ajusteArrastreRef.current.activo) return;

        const {estabaActivoAntesDeArrastre} = ajusteArrastreRef.current;
        evento.currentTarget.releasePointerCapture(evento.pointerId);
        ajusteArrastreRef.current = {
            activo: false,
            xInicial: 0,
            deltaAplicadoSegundos: 0,
            estabaActivoAntesDeArrastre: false
        };

        if (estabaActivoAntesDeArrastre) {
            tracker.reanudar();
        }
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

/*
 * useDockTracking
 * Hook que encapsula la lógica de la barra de tracking de tiempo.
 * Maneja document.title, completar sesión con detalles de actividad,
 * y el ajuste de tiempo por arrastre (pointer events).
 */

import {useEffect, useRef, useCallback, type PointerEvent} from 'react';
import {useTimeTracker} from '../useTimeTracker';
import {useTimeTrackerStore} from '../../stores/timeTrackerStore';
import type {SesionTracking} from '../../types/timeTracker';

/* Formatea un timestamp a hora local HH:MM:SS */
function formatearHoraLocal(timestamp: number): string {
    const fecha = new Date(timestamp);
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    const segundos = String(fecha.getSeconds()).padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
}

/* Construye el objeto de detalles de tracking para registrar actividad */
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

interface UseDockTrackingParams {
    onCompletarEntidad?: (entidadId: number, tipoEntidad: 'tarea' | 'habito', detallesActividad?: Record<string, unknown>) => void;
}

export function useDockTracking({onCompletarEntidad}: UseDockTrackingParams) {
    const tracker = useTimeTracker();
    const completarTracking = useTimeTrackerStore(state => state.completarTracking);
    const tituloOriginalRef = useRef<string>('');
    const ajusteArrastreRef = useRef({
        activo: false,
        xInicial: 0,
        deltaAplicadoSegundos: 0,
        estabaActivoAntesDeArrastre: false,
        /* [014A-18] Acumulador para movimiento relativo (pointer lock) */
        deltaXAcumulado: 0,
        usandoPointerLock: false
    });

    /* Guardar título original del documento al montar */
    useEffect(() => {
        tituloOriginalRef.current = document.title;
        return () => {
            document.title = tituloOriginalRef.current;
        };
    }, []);

    /* Actualizar document.title con el tiempo del tracking */
    useEffect(() => {
        if (tracker.estaActivo || tracker.estaPausado) {
            const nombreEntidad = tracker.nombreEntidad?.trim() || 'Tracking';
            document.title = `${tracker.tiempoFormateado} • ${nombreEntidad}`;
            return;
        }
        document.title = tituloOriginalRef.current;
    }, [tracker.estaActivo, tracker.estaPausado, tracker.tiempoFormateado, tracker.nombreEntidad]);

    /* Completar tracking y notificar al callback con detalles de la sesión */
    const manejarCompletar = useCallback(() => {
        const sesionFinal = completarTracking();
        if (sesionFinal && onCompletarEntidad) {
            const detallesActividad = construirDetallesTracking(sesionFinal);
            onCompletarEntidad(sesionFinal.entidadId, sesionFinal.tipoEntidad, detallesActividad);
        }
    }, [completarTracking, onCompletarEntidad]);

    /* [014A-18] Iniciar ajuste de tiempo por arrastre.
     * Usa Pointer Lock API en desktop para arrastre infinito (cursor se oculta
     * y movementX sigue reportando deltas al llegar al borde de pantalla).
     * En mobile usa pointer capture con posición absoluta (sin cursor visible). */
    const manejarInicioAjuste = useCallback(
        (evento: PointerEvent<HTMLButtonElement>) => {
            if (!tracker.estaActivo && !tracker.estaPausado) return;

            evento.preventDefault();

            const estabaActivo = tracker.estaActivo;
            if (estabaActivo) {
                tracker.pausar();
            }

            /* Intentar pointer lock para arrastre infinito (solo desktop) */
            let usandoPointerLock = false;
            const boton = evento.currentTarget;
            if (evento.pointerType === 'mouse' && boton.requestPointerLock) {
                try {
                    boton.requestPointerLock();
                    usandoPointerLock = true;
                } catch {
                    /* Fallback a capture si pointer lock falla */
                    boton.setPointerCapture(evento.pointerId);
                }
            } else {
                boton.setPointerCapture(evento.pointerId);
            }

            ajusteArrastreRef.current = {
                activo: true,
                xInicial: evento.clientX,
                deltaAplicadoSegundos: 0,
                estabaActivoAntesDeArrastre: estabaActivo,
                deltaXAcumulado: 0,
                usandoPointerLock
            };
        },
        [tracker]
    );

    /* [014A-18] Durante el arrastre, calcular delta de tiempo.
     * Con pointer lock: acumula movementX (arrastre infinito).
     * Sin pointer lock: usa posición absoluta respecto a xInicial.
     * PIXELES_POR_SEGUNDO reducido de 6 a 3 para mayor sensibilidad. */
    const manejarMovimientoAjuste = useCallback(
        (evento: PointerEvent<HTMLButtonElement>) => {
            if (!ajusteArrastreRef.current.activo) return;

            const PIXELES_POR_SEGUNDO = 3;
            let deltaX: number;

            if (ajusteArrastreRef.current.usandoPointerLock) {
                ajusteArrastreRef.current.deltaXAcumulado += evento.movementX;
                deltaX = ajusteArrastreRef.current.deltaXAcumulado;
            } else {
                deltaX = evento.clientX - ajusteArrastreRef.current.xInicial;
            }

            const deltaObjetivoSegundos = Math.trunc(deltaX / PIXELES_POR_SEGUNDO);
            const deltaIncrementalSegundos = deltaObjetivoSegundos - ajusteArrastreRef.current.deltaAplicadoSegundos;

            if (deltaIncrementalSegundos !== 0) {
                tracker.ajustarTiempo(deltaIncrementalSegundos * 1000);
                ajusteArrastreRef.current.deltaAplicadoSegundos = deltaObjetivoSegundos;
            }
        },
        [tracker]
    );

    /* [014A-18] Finalizar ajuste: liberar pointer lock o capture, reanudar si estaba activo */
    const manejarFinAjuste = useCallback(
        (evento: PointerEvent<HTMLButtonElement>) => {
            if (!ajusteArrastreRef.current.activo) return;

            const {estabaActivoAntesDeArrastre, usandoPointerLock} = ajusteArrastreRef.current;

            if (usandoPointerLock && document.pointerLockElement) {
                document.exitPointerLock();
            } else {
                evento.currentTarget.releasePointerCapture(evento.pointerId);
            }

            ajusteArrastreRef.current = {
                activo: false,
                xInicial: 0,
                deltaAplicadoSegundos: 0,
                estabaActivoAntesDeArrastre: false,
                deltaXAcumulado: 0,
                usandoPointerLock: false
            };

            if (estabaActivoAntesDeArrastre) {
                tracker.reanudar();
            }
        },
        [tracker]
    );

    return {
        tracker,
        manejarCompletar,
        manejarInicioAjuste,
        manejarMovimientoAjuste,
        manejarFinAjuste
    };
}

/*
 * hooks/useTimeTracker.ts
 * Hook que encapsula la lógica del Time Tracker
 * Proporciona el timer actualizado cada segundo y acciones
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {useTimeTrackerStore} from '../stores/timeTrackerStore';
import {useAlertasOpcional} from '../context/AlertasContext';
import type {TipoEntidadTracker} from '../types/timeTracker';

interface UseTimeTrackerEstado {
    /* Estado */
    estaActivo: boolean;
    estaPausado: boolean;
    tiempoMs: number;
    tiempoFormateado: string;
    progresoFormateado: string | null;
    porcentajeProgreso: number;
    alcanzoMinimo: boolean;
    nombreEntidad: string;
    tipoEntidad: TipoEntidadTracker | null;
    entidadId: number | null;
}
interface UseTimeTrackerAcciones {
    /* Acciones */
    iniciar: (entidadId: number, tipo: TipoEntidadTracker, nombre: string, tiempoMinimo?: number) => void;
    pausar: () => void;
    reanudar: () => void;
    completar: () => void;
    cancelar: () => void;
    ajustarTiempo: (deltaMs: number) => void;
}
interface UseTimeTrackerReturn extends UseTimeTrackerEstado, UseTimeTrackerAcciones {}

/*
 * Formatea milisegundos a formato legible HH:MM:SS o MM:SS
 */
function formatearTiempo(ms: number): string {
    const totalSegundos = Math.floor(ms / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (horas > 0) {
        return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    }
    return `${pad(minutos)}:${pad(segundos)}`;
}

export function useTimeTracker(): UseTimeTrackerReturn {
    /* [H-F12-04] Selectores atómicos: suscribirse al store completo re-renderiza
     * el hook con cada cambio (sesión, timer, ...). Se selecciona campo a campo. */
    const estado = useTimeTrackerStore(s => s.estado);
    const sesionActiva = useTimeTrackerStore(s => s.sesionActiva);
    const obtenerTiempoEfectivoActual = useTimeTrackerStore(s => s.obtenerTiempoEfectivoActual);
    const iniciarTracking = useTimeTrackerStore(s => s.iniciarTracking);
    const pausarTracking = useTimeTrackerStore(s => s.pausarTracking);
    const reanudarTracking = useTimeTrackerStore(s => s.reanudarTracking);
    const completarTracking = useTimeTrackerStore(s => s.completarTracking);
    const cancelarTracking = useTimeTrackerStore(s => s.cancelarTracking);
    const ajustarTiempoTracking = useTimeTrackerStore(s => s.ajustarTiempoTracking);
    const alertas = useAlertasOpcional();
    const [tiempoMs, setTiempoMs] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* Actualizar el timer cada segundo cuando está activo */
    useEffect(() => {
        if (estado === 'activo') {
            /* Actualización inmediata */
            setTiempoMs(obtenerTiempoEfectivoActual());

            intervalRef.current = setInterval(() => {
                setTiempoMs(obtenerTiempoEfectivoActual());
            }, 1000);
        } else if (estado === 'pausado') {
            /* Pausado: mantener el último valor pero limpiar interval */
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setTiempoMs(obtenerTiempoEfectivoActual());
        } else {
            /* Inactivo */
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setTiempoMs(0);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [estado, obtenerTiempoEfectivoActual]);

    useEffect(() => {
        if (estado === 'inactivo') return;
        setTiempoMs(obtenerTiempoEfectivoActual());
    }, [estado, sesionActiva, obtenerTiempoEfectivoActual]);

    const tiempoMinimoMs = (sesionActiva?.tiempoMinimoMinutos ?? 0) * 60 * 1000;
    const alcanzoMinimo = tiempoMinimoMs > 0 && tiempoMs >= tiempoMinimoMs;
    const porcentajeProgreso = tiempoMinimoMs > 0 ? Math.min(100, (tiempoMs / tiempoMinimoMs) * 100) : 0;

    /* Formato de progreso: 01:00/20:00 */
    const progresoFormateado = tiempoMinimoMs > 0 ? `${formatearTiempo(tiempoMs)}/${formatearTiempo(tiempoMinimoMs)}` : null;

    /* [233A-10] Confirmacion antes de reemplazar tracking activo */
    const iniciar = useCallback(
        async (entidadId: number, tipo: TipoEntidadTracker, nombre: string, tiempoMinimo?: number) => {
            if (sesionActiva && alertas?.confirmar) {
                const confirmado = await alertas.confirmar({
                    titulo: 'Tracking activo',
                    mensaje: `Hay un tracking activo para "${sesionActiva.nombreEntidad}". ¿Detener y comenzar nuevo tracking?`,
                    textoAceptar: 'Sí, cambiar',
                    textoCancelar: 'Cancelar'
                });
                if (!confirmado) return;
            }
            iniciarTracking(entidadId, tipo, nombre, tiempoMinimo);
        },
        [iniciarTracking, sesionActiva, alertas]
    );

    const pausar = useCallback(() => pausarTracking(), [pausarTracking]);
    const reanudar = useCallback(() => reanudarTracking(), [reanudarTracking]);
    const completar = useCallback(() => completarTracking(), [completarTracking]);
    const cancelar = useCallback(() => cancelarTracking(), [cancelarTracking]);
    const ajustarTiempo = useCallback((deltaMs: number) => ajustarTiempoTracking(deltaMs), [ajustarTiempoTracking]);

    return {
        estaActivo: estado === 'activo',
        estaPausado: estado === 'pausado',
        tiempoMs,
        tiempoFormateado: formatearTiempo(tiempoMs),
        progresoFormateado,
        porcentajeProgreso,
        alcanzoMinimo,
        nombreEntidad: sesionActiva?.nombreEntidad ?? '',
        tipoEntidad: sesionActiva?.tipoEntidad ?? null,
        entidadId: sesionActiva?.entidadId ?? null,
        iniciar,
        pausar,
        reanudar,
        completar,
        cancelar,
        ajustarTiempo
    };
}

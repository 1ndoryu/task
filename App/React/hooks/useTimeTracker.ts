/*
 * hooks/useTimeTracker.ts
 * Hook que encapsula la lógica del Time Tracker
 * Proporciona el timer actualizado cada segundo y acciones
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {useTimeTrackerStore} from '../stores/timeTrackerStore';
import {useAlertasOpcional} from '../context/AlertasContext';
import type {TipoEntidadTracker} from '../types/timeTracker';

interface UseTimeTrackerReturn {
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
    /* Acciones */
    iniciar: (entidadId: number, tipo: TipoEntidadTracker, nombre: string, tiempoMinimo?: number) => void;
    pausar: () => void;
    reanudar: () => void;
    completar: () => void;
    cancelar: () => void;
    ajustarTiempo: (deltaMs: number) => void;
}

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
    const store = useTimeTrackerStore();
    const alertas = useAlertasOpcional();
    const [tiempoMs, setTiempoMs] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* Actualizar el timer cada segundo cuando está activo */
    useEffect(() => {
        if (store.estado === 'activo') {
            /* Actualización inmediata */
            setTiempoMs(store.obtenerTiempoEfectivoActual());

            intervalRef.current = setInterval(() => {
                setTiempoMs(store.obtenerTiempoEfectivoActual());
            }, 1000);
        } else if (store.estado === 'pausado') {
            /* Pausado: mantener el último valor pero limpiar interval */
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setTiempoMs(store.obtenerTiempoEfectivoActual());
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
    }, [store.estado]);

    useEffect(() => {
        if (store.estado === 'inactivo') return;
        setTiempoMs(store.obtenerTiempoEfectivoActual());
    }, [store.estado, store.sesionActiva]);

    const tiempoMinimoMs = (store.sesionActiva?.tiempoMinimoMinutos ?? 0) * 60 * 1000;
    const alcanzoMinimo = tiempoMinimoMs > 0 && tiempoMs >= tiempoMinimoMs;
    const porcentajeProgreso = tiempoMinimoMs > 0 ? Math.min(100, (tiempoMs / tiempoMinimoMs) * 100) : 0;

    /* Formato de progreso: 01:00/20:00 */
    const progresoFormateado = tiempoMinimoMs > 0 ? `${formatearTiempo(tiempoMs)}/${formatearTiempo(tiempoMinimoMs)}` : null;

    /* [233A-10] Confirmacion antes de reemplazar tracking activo */
    const iniciar = useCallback(
        async (entidadId: number, tipo: TipoEntidadTracker, nombre: string, tiempoMinimo?: number) => {
            const sesionActiva = store.sesionActiva;
            if (sesionActiva && alertas?.confirmar) {
                const confirmado = await alertas.confirmar({
                    titulo: 'Tracking activo',
                    mensaje: `Hay un tracking activo para "${sesionActiva.nombreEntidad}". ¿Detener y comenzar nuevo tracking?`,
                    textoAceptar: 'Sí, cambiar',
                    textoCancelar: 'Cancelar'
                });
                if (!confirmado) return;
            }
            store.iniciarTracking(entidadId, tipo, nombre, tiempoMinimo);
        },
        [store.iniciarTracking, store.sesionActiva, alertas]
    );

    const pausar = useCallback(() => store.pausarTracking(), [store.pausarTracking]);
    const reanudar = useCallback(() => store.reanudarTracking(), [store.reanudarTracking]);
    const completar = useCallback(() => store.completarTracking(), [store.completarTracking]);
    const cancelar = useCallback(() => store.cancelarTracking(), [store.cancelarTracking]);
    const ajustarTiempo = useCallback((deltaMs: number) => store.ajustarTiempoTracking(deltaMs), [store.ajustarTiempoTracking]);

    return {
        estaActivo: store.estado === 'activo',
        estaPausado: store.estado === 'pausado',
        tiempoMs,
        tiempoFormateado: formatearTiempo(tiempoMs),
        progresoFormateado,
        porcentajeProgreso,
        alcanzoMinimo,
        nombreEntidad: store.sesionActiva?.nombreEntidad ?? '',
        tipoEntidad: store.sesionActiva?.tipoEntidad ?? null,
        entidadId: store.sesionActiva?.entidadId ?? null,
        iniciar,
        pausar,
        reanudar,
        completar,
        cancelar,
        ajustarTiempo
    };
}

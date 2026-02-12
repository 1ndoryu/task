/*
 * hooks/useAyuno.ts
 * Hook que envuelve el store de ayuno con timer de actualización visual
 * Provee tiempo formateado, progreso y acciones simplificadas
 */

import {useState, useEffect, useCallback, useMemo} from 'react';
import {useAyunoStore} from '../stores/ayunoStore';
import {usePluginsStore} from '../stores/pluginsStore';
import type {ConfiguracionAyuno} from '../types/ayuno';
import {formatearDuracionAyuno} from '../utils/ayunoVentanas';

const PLUGIN_ID = 'ayuno';

export function useAyuno() {
    const estado = useAyunoStore(s => s.estado);
    const sesionActiva = useAyunoStore(s => s.sesionActiva);
    const historial = useAyunoStore(s => s.historial);
    const iniciarAyuno = useAyunoStore(s => s.iniciarAyuno);
    const terminarAyuno = useAyunoStore(s => s.terminarAyuno);
    const reiniciarAyuno = useAyunoStore(s => s.reiniciarAyuno);
    const eliminarSesion = useAyunoStore(s => s.eliminarSesion);
    /* Fix: evitar snapshot inestable al leer configuracion inexistente */
    const configuracion = usePluginsStore(s => s.configuracionPlugins[PLUGIN_ID]) as unknown as ConfiguracionAyuno | undefined;
    const duracionHoras = configuracion?.duracionHoras ?? 16;

    /* Último ayuno (para UI cuando inactivo) */
    const ultimoAyuno = historial[0] ?? null;

    /* Tick de reloj: actualiza cuando hay ayuno activo o cuando necesitamos mostrar "desde el último" */
    const [relojMs, setRelojMs] = useState(() => Date.now());

    useEffect(() => {
        const debeActualizar = estado === 'activo' || !!ultimoAyuno?.fin;
        if (!debeActualizar) return;

        const intervalo = setInterval(() => {
            setRelojMs(Date.now());
        }, 1000);

        return () => clearInterval(intervalo);
    }, [estado, ultimoAyuno?.fin]);

    const tiempoMs = useMemo(() => {
        if (estado !== 'activo' || !sesionActiva) return 0;
        return Math.max(0, relojMs - sesionActiva.inicio);
    }, [estado, sesionActiva?.inicio, relojMs]);

    const duracionObjetivoMs = sesionActiva?.duracionObjetivoMs ?? duracionHoras * 3600000;
    const porcentaje = Math.min((tiempoMs / duracionObjetivoMs) * 100, 100);
    const alcanzoObjetivo = tiempoMs >= duracionObjetivoMs;

    const tiempoFormateado = formatearDuracionAyuno(tiempoMs);

    /* Tiempo restante para completar objetivo */
    const tiempoRestanteMs = Math.max(duracionObjetivoMs - tiempoMs, 0);
    const tiempoRestanteFormateado = formatearDuracionAyuno(tiempoRestanteMs);

    /* Duración del último ayuno + tiempo transcurrido desde su fin */
    const ultimoAyunoFormateado = ultimoAyuno ? formatearDuracionAyuno(ultimoAyuno.tiempoEfectivoMs) : null;
    const tiempoDesdeUltimoFin = ultimoAyuno?.fin ? Math.max(0, relojMs - ultimoAyuno.fin) : null;
    const tiempoDesdeUltimoFormateado = tiempoDesdeUltimoFin !== null ? formatearDuracionAyuno(tiempoDesdeUltimoFin) : null;

    const iniciar = useCallback(
        (horaUltimaComidaMs?: number) => {
            iniciarAyuno(duracionHoras, horaUltimaComidaMs);
        },
        [iniciarAyuno, duracionHoras]
    );

    const terminar = useCallback(
        (finMs?: number) => {
            return terminarAyuno(finMs);
        },
        [terminarAyuno]
    );


    const reiniciar = useCallback(() => {
        reiniciarAyuno();
    }, [reiniciarAyuno]);

    /* Estado descriptivo para la UI */
    const estadoVisual = useMemo(() => {
        if (estado === 'activo') return 'en-progreso' as const;
        if (ultimoAyuno) return 'con-historial' as const;
        return 'sin-historial' as const;
    }, [estado, ultimoAyuno]);

    return {
        estaActivo: estado === 'activo',
        estadoVisual,
        sesionActiva,
        tiempoMs,
        tiempoFormateado,
        tiempoRestanteFormateado,
        porcentaje,
        alcanzoObjetivo,
        duracionHoras,
        duracionObjetivoMs,
        ultimoAyuno,
        ultimoAyunoFormateado,
        tiempoDesdeUltimoFormateado,
        historial,
        iniciar,
        terminar,
        reiniciar,
        eliminarSesion
    };
}

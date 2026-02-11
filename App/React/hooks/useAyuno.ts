/*
 * hooks/useAyuno.ts
 * Hook que envuelve el store de ayuno con timer de actualización visual
 * Provee tiempo formateado, progreso y acciones simplificadas
 */

import {useState, useEffect, useCallback, useMemo} from 'react';
import {useAyunoStore} from '../stores/ayunoStore';
import {usePluginsStore} from '../stores/pluginsStore';
import type {ConfiguracionAyuno} from '../types/ayuno';

const PLUGIN_ID = 'ayuno';

function formatearTiempoAyuno(ms: number): string {
    const totalSegundos = Math.floor(ms / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);

    if (horas > 0) return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
    return `${minutos}m`;
}

export function useAyuno() {
    const estado = useAyunoStore(s => s.estado);
    const sesionActiva = useAyunoStore(s => s.sesionActiva);
    const historial = useAyunoStore(s => s.historial);
    const iniciarAyuno = useAyunoStore(s => s.iniciarAyuno);
    const terminarAyuno = useAyunoStore(s => s.terminarAyuno);
    const reiniciarAyuno = useAyunoStore(s => s.reiniciarAyuno);
    /* Fix: evitar snapshot inestable al leer configuracion inexistente */
    const configuracion = usePluginsStore(s => s.configuracionPlugins[PLUGIN_ID]) as ConfiguracionAyuno | undefined;
    const duracionHoras = configuracion?.duracionHoras ?? 16;

    const [tiempoMs, setTiempoMs] = useState(0);

    /* Fix: dependencias estables para evitar renders infinitos en el timer */
    useEffect(() => {
        if (estado !== 'activo' || !sesionActiva) {
            setTiempoMs(prev => (prev === 0 ? prev : 0));
            return;
        }

        const actualizar = () => {
            const transcurrido = Date.now() - sesionActiva.inicio;
            setTiempoMs(transcurrido);
        };

        actualizar();
        const intervalo = setInterval(actualizar, 1000);
        return () => clearInterval(intervalo);
    }, [estado, sesionActiva?.inicio, sesionActiva?.duracionObjetivoMs]);

    const duracionObjetivoMs = sesionActiva?.duracionObjetivoMs ?? duracionHoras * 3600000;
    const porcentaje = Math.min((tiempoMs / duracionObjetivoMs) * 100, 100);
    const alcanzoObjetivo = tiempoMs >= duracionObjetivoMs;

    const tiempoFormateado = formatearTiempoAyuno(tiempoMs);

    /* Tiempo restante para completar objetivo */
    const tiempoRestanteMs = Math.max(duracionObjetivoMs - tiempoMs, 0);
    const tiempoRestanteFormateado = formatearTiempoAyuno(tiempoRestanteMs);

    /* Último ayuno completado para mostrar cuando inactivo */
    const ultimoAyuno = historial[0] ?? null;
    const ultimoAyunoFormateado = ultimoAyuno
        ? formatearTiempoAyuno(ultimoAyuno.tiempoEfectivoMs)
        : null;

    /* Próximo ayuno estimado: basado en frecuencia del hábito (simplificado) */
    const tiempoDesdeUltimoFin = ultimoAyuno?.fin
        ? Date.now() - ultimoAyuno.fin
        : null;
    const tiempoDesdeUltimoFormateado = tiempoDesdeUltimoFin !== null
        ? formatearTiempoAyuno(tiempoDesdeUltimoFin)
        : null;

    const iniciar = useCallback(() => {
        iniciarAyuno(duracionHoras);
    }, [iniciarAyuno, duracionHoras]);

    const terminar = useCallback(() => {
        return terminarAyuno();
    }, [terminarAyuno]);

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
        reiniciar
    };
}

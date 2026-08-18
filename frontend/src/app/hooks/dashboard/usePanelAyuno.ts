/*
 * usePanelAyuno
 * Hook que gestiona la lógica del panel de ayuno intermitente.
 * Incluye: estado de UI (modales, enfoque), computaciones derivadas
 * (ventana de comida, próximo ayuno), y acciones de configuración.
 */

import {useEffect, useMemo, useState, useCallback} from 'react';
import {useAyuno} from '../useAyuno';
import {usePluginsStore} from '../../stores/pluginsStore';
import {useHabitosStore} from '../../stores/habitosStore';
import type {ConfiguracionAyuno} from '../../types/ayuno';
import type {FrecuenciaHabito} from '../../types/dashboard';
import {calcularInicioProximoAyunoMsDesdeFin, calcularVentanaComidaMs, formatearDuracionAyuno} from '../../utils/ayunoVentanas';

const PLUGIN_ID = 'ayuno';

export function usePanelAyuno() {
    const [modoEnfoque, setModoEnfoque] = useState(false);
    const [modalUltimaComidaAbierto, setModalUltimaComidaAbierto] = useState(false);
    const [modalFinalizarAyunoAbierto, setModalFinalizarAyunoAbierto] = useState(false);
    const [finAyunoMs, setFinAyunoMs] = useState<number | null>(null);

    const ayuno = useAyuno();
    const {estaActivo, sesionActiva, tiempoFormateado, tiempoRestanteFormateado, porcentaje, alcanzoObjetivo, duracionHoras, ultimoAyuno, tiempoDesdeUltimoFormateado, historial, iniciar, terminar, cambiarObjetivo, reiniciar, eliminarSesion} = ayuno;

    const guardarConfig = usePluginsStore(s => s.guardarConfiguracion);
    const configAyuno = usePluginsStore(s => s.configuracionPlugins[PLUGIN_ID]) as unknown as {habitoId?: number} | undefined;

    const habitos = useHabitosStore(s => s.habitos);
    const habitoAyunoExiste = !!(configAyuno?.habitoId && habitos.some(h => h.id === configAyuno.habitoId));

    const habitoAyuno = useMemo(() => {
        if (!configAyuno?.habitoId) return undefined;
        return habitos.find(h => h.id === configAyuno.habitoId);
    }, [habitos, configAyuno?.habitoId]);

    const frecuenciaAyuno: FrecuenciaHabito | undefined = habitoAyuno?.frecuencia;
    const duracionObjetivoUltimoMs = ultimoAyuno?.duracionObjetivoMs ?? duracionHoras * 60 * 60 * 1000;

    const ventanaUltima = useMemo(() => {
        if (!ultimoAyuno?.fin) return null;
        return calcularVentanaComidaMs({finAyunoMs: ultimoAyuno.fin, duracionObjetivoMs: duracionObjetivoUltimoMs, frecuencia: frecuenciaAyuno});
    }, [ultimoAyuno?.fin, duracionObjetivoUltimoMs, frecuenciaAyuno]);

    const textoProximoAyuno = useMemo(() => {
        if (!ultimoAyuno?.fin) return null;
        const inicioProximoMs = calcularInicioProximoAyunoMsDesdeFin(ultimoAyuno.fin, duracionObjetivoUltimoMs, frecuenciaAyuno);
        const deltaMs = inicioProximoMs - Date.now();

        if (deltaMs <= 0) {
            return `Próximo ayuno: hace ${formatearDuracionAyuno(Math.abs(deltaMs))}`;
        }
        return `Próximo ayuno: en ${formatearDuracionAyuno(deltaMs)}`;
    }, [ultimoAyuno?.fin, duracionObjetivoUltimoMs, frecuenciaAyuno, tiempoDesdeUltimoFormateado]);

    const textoVentanaComida = useMemo(() => {
        if (!ventanaUltima) return null;
        if (ventanaUltima.periodoMs !== 24 * 60 * 60 * 1000) return null;
        return `Ventana comida: ${formatearDuracionAyuno(ventanaUltima.duracionVentanaComidaMs)}`;
    }, [ventanaUltima?.duracionVentanaComidaMs, ventanaUltima?.periodoMs]);

    const crearHabitoEspecialAhora = useCallback(() => {
        const existente = useHabitosStore.getState().habitos.find(h => h.nombre.trim().toLowerCase() === 'ayuno');
        const habito =
            existente ??
            useHabitosStore.getState().crearHabito({
                nombre: 'Ayuno',
                importancia: 'Media',
                tags: [],
                frecuencia: {tipo: 'diario'},
                descripcion: 'Hábito especial generado por el plugin de ayuno'
            });
        usePluginsStore.getState().guardarConfiguracion(PLUGIN_ID, {habitoId: habito.id});
    }, []);

    /* Si el plugin está activo pero falta habitoId, intentar vincular/crear automáticamente */
    useEffect(() => {
        const pluginsActivos = usePluginsStore.getState().pluginsActivos;
        if (!pluginsActivos.includes(PLUGIN_ID)) return;

        const configActual = usePluginsStore.getState().configuracionPlugins[PLUGIN_ID] as unknown as {habitoId?: number} | undefined;
        if (configActual?.habitoId) return;

        const existente = useHabitosStore.getState().habitos.find(h => h.nombre.trim().toLowerCase() === 'ayuno');
        if (existente) {
            usePluginsStore.getState().guardarConfiguracion(PLUGIN_ID, {habitoId: existente.id});
            return;
        }

        const nuevo = useHabitosStore.getState().crearHabito({
            nombre: 'Ayuno',
            importancia: 'Media',
            tags: [],
            frecuencia: {tipo: 'diario'},
            descripcion: 'Hábito especial generado por el plugin de ayuno'
        });
        usePluginsStore.getState().guardarConfiguracion(PLUGIN_ID, {habitoId: nuevo.id});
    }, []);

    const manejarCambiarDuracion = useCallback(
        (horas: number) => {
            guardarConfig(PLUGIN_ID, {duracionHoras: horas} satisfies ConfiguracionAyuno);
            if (estaActivo) {
                cambiarObjetivo(horas);
            }
        },
        [guardarConfig, estaActivo, cambiarObjetivo]
    );

    const abrirModalFinalizar = useCallback(() => {
        setFinAyunoMs(Date.now());
        setModalFinalizarAyunoAbierto(true);
    }, []);

    const manejarTerminar = useCallback(
        (horaFinComidaMs: number) => {
            terminar(horaFinComidaMs);
        },
        [terminar]
    );

    return {
        /* Estado UI */
        modoEnfoque, setModoEnfoque,
        modalUltimaComidaAbierto, setModalUltimaComidaAbierto,
        modalFinalizarAyunoAbierto, setModalFinalizarAyunoAbierto,
        finAyunoMs,
        /* Datos de ayuno */
        estaActivo, sesionActiva, tiempoFormateado, tiempoRestanteFormateado,
        porcentaje, alcanzoObjetivo, duracionHoras,
        ultimoAyuno, tiempoDesdeUltimoFormateado,
        historial, iniciar, reiniciar, eliminarSesion,
        /* Derivados */
        habitoAyunoExiste, frecuenciaAyuno, duracionObjetivoUltimoMs,
        ventanaUltima, textoProximoAyuno, textoVentanaComida,
        /* Handlers */
        crearHabitoEspecialAhora, manejarCambiarDuracion,
        abrirModalFinalizar, manejarTerminar
    };
}

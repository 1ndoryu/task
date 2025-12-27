/*
 * useConfiguracionActividad
 * Hook para manejar la configuracion del panel de actividad
 */

import {useLocalStorage} from './useLocalStorage';
import {useCallback} from 'react';

/* Tipos de periodo para el mapa de calor */
export type PeriodoActividad = 'auto' | 'semana' | 'mes' | 'trimestre' | 'anio';

/* Tipos de filtro de actividad */
export type FiltroTipoActividad = 'todo' | 'tarea_completada' | 'habito_cumplido';

/* Tamano de celdas */
export type TamanoCeldaActividad = 'pequeno' | 'normal' | 'grande';

/* Configuracion del panel de actividad */
export interface ConfiguracionActividad {
    periodo: PeriodoActividad;
    filtroTipo?: FiltroTipoActividad;
    tamanoCelda: TamanoCeldaActividad;
    mostrarLeyenda: boolean;
    mostrarEstadisticas: boolean;
}

/* Valores por defecto */
export const CONFIG_ACTIVIDAD_DEFECTO: ConfiguracionActividad = {
    periodo: 'auto',
    filtroTipo: 'todo',
    tamanoCelda: 'normal',
    mostrarLeyenda: true,
    mostrarEstadisticas: true
};

export function useConfiguracionActividad() {
    const {valor, setValor} = useLocalStorage<ConfiguracionActividad>('glory_config_actividad', {
        valorPorDefecto: CONFIG_ACTIVIDAD_DEFECTO
    });

    /* Cambiar periodo */
    const cambiarPeriodo = useCallback(
        (periodo: PeriodoActividad) => {
            setValor(prev => ({...prev, periodo}));
        },
        [setValor]
    );

    /* Cambiar filtro de tipo */
    const cambiarFiltroTipo = useCallback(
        (filtroTipo: FiltroTipoActividad) => {
            setValor(prev => ({...prev, filtroTipo}));
        },
        [setValor]
    );

    /* Cambiar tamano de celda */
    const cambiarTamanoCelda = useCallback(
        (tamanoCelda: TamanoCeldaActividad) => {
            setValor(prev => ({...prev, tamanoCelda}));
        },
        [setValor]
    );

    /* Toggle leyenda */
    const toggleLeyenda = useCallback(() => {
        setValor(prev => ({...prev, mostrarLeyenda: !prev.mostrarLeyenda}));
    }, [setValor]);

    /* Toggle estadisticas */
    const toggleEstadisticas = useCallback(() => {
        setValor(prev => ({...prev, mostrarEstadisticas: !prev.mostrarEstadisticas}));
    }, [setValor]);

    /* Reset a valores por defecto */
    const resetearConfiguracion = useCallback(() => {
        setValor(CONFIG_ACTIVIDAD_DEFECTO);
    }, [setValor]);

    return {
        configuracion: valor,
        cambiarPeriodo,
        cambiarFiltroTipo,
        cambiarTamanoCelda,
        toggleLeyenda,
        toggleEstadisticas,
        resetearConfiguracion,
        actualizarConfiguracion: setValor
    };
}

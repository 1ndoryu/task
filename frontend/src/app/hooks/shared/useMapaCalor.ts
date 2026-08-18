/*
 * useMapaCalor
 * Hook que gestiona la lógica del mapa de calor genérico.
 * Incluye: medición de contenedor, cálculo de semanas/fechas,
 * agrupación y estadísticas.
 */

import {useMemo, useRef, useState, useEffect, useCallback} from 'react';
import {obtenerFechaLocalISO, obtenerFechaEfectiva, obtenerFechaHoy} from '../../utils/fecha';
import type {DatosHeatmapProps, MapaCalorProps} from '../../components/shared/MapaCalor';

/* Nombres de meses abreviados */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/* [263A-1] Constantes deben coincidir con max-width del CSS (mapaCalor.css).
 * Antes: {10,12,14} — no coincidía con CSS {10px,14px,16px}, causando que
 * el cálculo auto creara más semanas de las que cabían → overflow (reportado 5 veces). */
const TAMANO_CELDA = {
    pequeno: 10,
    normal: 14,
    grande: 16
};
const GAP_CELDAS = 3;
const ANCHO_DIAS_SEMANA = 20;

/* Genera un array de fechas entre dos fechas */
function generarRangoFechas(inicio: Date, fin: Date): string[] {
    const fechas: string[] = [];
    const actual = new Date(inicio);

    while (actual <= fin) {
        fechas.push(obtenerFechaLocalISO(actual));
        actual.setDate(actual.getDate() + 1);
    }

    return fechas;
}

/*
 * Calcula las fechas según el periodo
 * fin se establece a 23:59:59.999 para garantizar inclusión del día actual
 */
function calcularFechasPeriodo(periodo: string, diasAuto?: number): {inicio: Date; fin: Date} {
    const fin = new Date(obtenerFechaEfectiva());
    fin.setHours(23, 59, 59, 999);

    const inicio = obtenerFechaEfectiva();

    switch (periodo) {
        case 'auto':
            inicio.setDate(inicio.getDate() - ((diasAuto || 90) - 1));
            break;
        case 'semana':
            inicio.setDate(inicio.getDate() - 6);
            break;
        case 'mes':
            inicio.setDate(inicio.getDate() - 29);
            break;
        case 'trimestre':
            inicio.setDate(inicio.getDate() - 89);
            break;
        case 'anio':
            inicio.setDate(inicio.getDate() - 364);
            break;
        default:
            inicio.setDate(inicio.getDate() - 29);
    }

    return {inicio, fin};
}

/*
 * Agrupa fechas por semanas para visualización tipo GitHub
 * Se agrega T12:00:00 para evitar problemas de zona horaria
 */
function agruparPorSemanas(fechas: string[]): string[][] {
    const semanas: string[][] = [];
    let semanaActual: string[] = [];

    const primerDia = new Date(fechas[0] + 'T12:00:00');
    const diaInicio = primerDia.getDay();

    for (let i = 0; i < diaInicio; i++) {
        semanaActual.push('');
    }

    for (const fecha of fechas) {
        const diaSemana = new Date(fecha + 'T12:00:00').getDay();

        if (diaSemana === 0 && semanaActual.length > 0) {
            semanas.push(semanaActual);
            semanaActual = [];
        }

        semanaActual.push(fecha);
    }

    if (semanaActual.length > 0) {
        semanas.push(semanaActual);
    }

    return semanas;
}

/* Obtiene los meses visibles con anchos calculados */
function obtenerMesesVisibles(semanas: string[][], tamanoSemana: number): {mes: string; ancho: number}[] {
    const meses: {mes: string; ancho: number; semanaInicio: number}[] = [];
    let mesAnterior = -1;

    for (let semanaIdx = 0; semanaIdx < semanas.length; semanaIdx++) {
        const semana = semanas[semanaIdx];
        const primeraFechaValida = semana.find(f => f !== '');
        if (!primeraFechaValida) continue;

        const fecha = new Date(primeraFechaValida);
        const mes = fecha.getMonth();

        if (mes !== mesAnterior) {
            if (meses.length > 0) {
                const ultimoMes = meses[meses.length - 1];
                ultimoMes.ancho = (semanaIdx - ultimoMes.semanaInicio) * tamanoSemana;
            }

            meses.push({mes: MESES[mes], ancho: 0, semanaInicio: semanaIdx});
            mesAnterior = mes;
        }
    }

    if (meses.length > 0) {
        const ultimoMes = meses[meses.length - 1];
        ultimoMes.ancho = (semanas.length - ultimoMes.semanaInicio) * tamanoSemana;
    }

    return meses.map(m => ({mes: m.mes, ancho: m.ancho}));
}

type TamanoCelda = 'pequeno' | 'normal' | 'grande';

interface UseMapaCalorParams {
    datos: DatosHeatmapProps;
    periodo?: MapaCalorProps['periodo'];
    fechaInicio?: string;
    fechaFin?: string;
    tamanoCelda?: TamanoCelda;
}

export function useMapaCalor({datos, periodo = 'auto', fechaInicio, fechaFin, tamanoCelda = 'normal'}: UseMapaCalorParams) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const [anchoContenedor, setAnchoContenedor] = useState<number>(0);

    /* Medir el ancho del contenedor */
    useEffect(() => {
        const medirAncho = () => {
            if (contenedorRef.current) {
                setAnchoContenedor(contenedorRef.current.offsetWidth);
            }
        };

        medirAncho();

        const resizeObserver = new ResizeObserver(medirAncho);
        if (contenedorRef.current) {
            resizeObserver.observe(contenedorRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    /* Calcular número de semanas que caben en modo auto */
    const calcularSemanasAuto = useCallback((): number => {
        if (anchoContenedor === 0) return 13;

        const tamano = TAMANO_CELDA[tamanoCelda];
        const anchoDisponible = anchoContenedor - ANCHO_DIAS_SEMANA - 40;
        const anchoPorSemana = tamano + GAP_CELDAS;
        const semanas = Math.floor(anchoDisponible / anchoPorSemana);

        return Math.max(4, Math.min(semanas, 53));
    }, [anchoContenedor, tamanoCelda]);

    /* Días para modo auto */
    const diasAuto = useMemo(() => {
        if (periodo !== 'auto') return undefined;
        const numSemanas = calcularSemanasAuto();
        return numSemanas * 7;
    }, [periodo, calcularSemanasAuto]);

    /* Fecha de hoy efectiva para dependencia del useMemo */
    const fechaHoy = obtenerFechaHoy();

    /* [283A-1] Rango de fechas, semanas, meses y tamaño real de celda.
     * tamanoCeldaReal calcula el px exacto para que el grid llene 100% del contenedor,
     * eliminando el espacio vacío que causaba max-width fijo cuando el contenedor
     * era más ancho que numSemanas × TAMANO_CELDA (reportado 5 veces como bug). */
    const MAX_CELDA_PX = 30;
    const MIN_CELDA_PX = 6;

    const {fechas, semanas, mesesVisibles, tamanoCeldaReal} = useMemo(() => {
        let inicio: Date;
        let fin: Date;

        if (fechaInicio && fechaFin) {
            inicio = new Date(fechaInicio);
            fin = new Date(fechaFin);
        } else {
            const calculado = calcularFechasPeriodo(periodo ?? 'auto', diasAuto);
            inicio = calculado.inicio;
            fin = calculado.fin;
        }

        const rangoFechas = generarRangoFechas(inicio, fin);
        const semanasAgrupadas = agruparPorSemanas(rangoFechas);

        /* Calcular tamaño de celda que llena el contenedor */
        const numSemanas = semanasAgrupadas.length;
        const tamanoBase = TAMANO_CELDA[tamanoCelda];
        const anchoDisponible = anchoContenedor - ANCHO_DIAS_SEMANA - 40;

        let celdaReal = tamanoBase;
        if (anchoDisponible > 0 && numSemanas > 0) {
            const calculado = (anchoDisponible - (numSemanas - 1) * GAP_CELDAS) / numSemanas;
            celdaReal = Math.min(Math.max(calculado, MIN_CELDA_PX), MAX_CELDA_PX);
        }

        const meses = obtenerMesesVisibles(semanasAgrupadas, celdaReal + GAP_CELDAS);

        return {
            fechas: rangoFechas,
            semanas: semanasAgrupadas,
            mesesVisibles: meses,
            tamanoCeldaReal: celdaReal
        };
    }, [periodo, fechaInicio, fechaFin, diasAuto, tamanoCelda, fechaHoy, anchoContenedor]);

    /* Estadísticas */
    const estadisticas = useMemo(() => {
        let totalActividades = 0;
        let diasConActividad = 0;

        for (const fecha of fechas) {
            if (datos[fecha]) {
                totalActividades += datos[fecha].total;
                diasConActividad++;
            }
        }

        return {
            totalActividades,
            diasConActividad,
            diasTotales: fechas.length
        };
    }, [datos, fechas]);

    return {
        contenedorRef,
        fechas, semanas, mesesVisibles,
        estadisticas,
        tamanoCeldaReal
    };
}

/*
 * useMapaCalorHabito
 * Hook que gestiona la lógica del mapa de calor de hábitos.
 * Incluye: historial, cálculo de fechas/semanas, interacción de celdas,
 * carga de historial detallado y estadísticas.
 */

import {useMemo, useCallback, useEffect, useRef, useState} from 'react';
import {useHabitosStore, useHabito} from '../../stores/habitosStore';
import {useHabitosHistorialStore, useHistorialDetallado} from '../../stores/habitosHistorialStore';
import type {EstadoHabito} from '../../types/historialHabitos';
import {generarFechasPeriodo, agruparPorSemanas, esHoy, esEditable, calcularRelevanciaDia} from '../../utils/mapaCalorUtils';
import type {FrecuenciaHabito} from '../../types/dashboard';

interface UseMapaCalorHabitoParams {
    habitoId: number;
    periodo?: 'semana' | 'mes';
    compacto?: boolean;
    enModal?: boolean;
    frecuencia?: FrecuenciaHabito;
    fechaCreacion?: string;
}

/* Constantes para el cálculo del número de semanas */
const ANCHO_CELDA_MODAL = 12;
const GAP_CELDAS = 3;
const ANCHO_POR_SEMANA = ANCHO_CELDA_MODAL + GAP_CELDAS;
const MARGEN_LABEL = 18;

export function useMapaCalorHabito({habitoId, periodo = 'mes', compacto = false, enModal = false, frecuencia}: UseMapaCalorHabitoParams) {
    const habito = useHabito(habitoId);
    const estadoGuardado = useHabitosStore(state => state.estadoGuardado);
    const marcarDia = useHabitosStore(state => state.marcarDia);
    const desmarcarDia = useHabitosStore(state => state.desmarcarDia);
    const cargarHistorialDetallado = useHabitosHistorialStore(state => state.cargarHistorialDetallado);
    const historialDetallado = useHistorialDetallado(habitoId);
    const errorGuardado = useHabitosStore(state => state.errorGuardado);

    const fechasEnProcesoRef = useRef<Set<string>>(new Set());
    const contenedorRef = useRef<HTMLDivElement>(null);
    const [semanasCalculadas, setSemanasCalculadas] = useState<number | null>(null);

    /* Construir historial local */
    const historialLocal = useMemo(() => {
        const historial: Record<string, {estado: EstadoHabito; notas: string | null; fechaRegistro: string}> = {};

        if (historialDetallado?.historial) {
            return historialDetallado.historial;
        }

        if (habito) {
            for (const fecha of habito.historialCompletados || []) {
                historial[fecha] = {estado: 'completado', notas: null, fechaRegistro: ''};
            }
            for (const fecha of habito.historialPospuestos || []) {
                historial[fecha] = {estado: 'pospuesto', notas: null, fechaRegistro: ''};
            }
        }

        return historial;
    }, [habito, historialDetallado]);

    /* Calcular semanas basado en el ancho del contenedor (modo modal) */
    useEffect(() => {
        if (!enModal || !contenedorRef.current) return;

        const calcularSemanas = () => {
            const ancho = contenedorRef.current?.offsetWidth ?? 0;
            if (ancho > 0) {
                const anchoDisponible = ancho - MARGEN_LABEL;
                const numSemanas = Math.floor(anchoDisponible / ANCHO_POR_SEMANA);
                const semanasFinales = Math.max(4, Math.min(26, numSemanas));
                setSemanasCalculadas(semanasFinales);
            }
        };

        calcularSemanas();
        const observer = new ResizeObserver(calcularSemanas);
        observer.observe(contenedorRef.current);
        return () => observer.disconnect();
    }, [enModal]);

    const diasPeriodo = useMemo(() => {
        if (enModal && semanasCalculadas !== null) {
            return semanasCalculadas * 7;
        }
        return periodo === 'semana' ? 7 : 30;
    }, [periodo, enModal, semanasCalculadas]);

    /* Cargar historial detallado al montar (modo modal con más días) */
    useEffect(() => {
        if (habitoId > 0 && diasPeriodo > 30 && enModal) {
            cargarHistorialDetallado(habitoId, diasPeriodo);
        }
    }, [habitoId, diasPeriodo, enModal, cargarHistorialDetallado]);

    /* Generar fechas y agruparlas */
    const {fechas, semanas} = useMemo(() => {
        const rangoFechas = generarFechasPeriodo(diasPeriodo);
        const semanasAgrupadas = agruparPorSemanas(rangoFechas);
        return {fechas: rangoFechas, semanas: semanasAgrupadas};
    }, [diasPeriodo]);

    const obtenerEstadoDia = useCallback(
        (fecha: string): EstadoHabito | null => {
            return historialLocal[fecha]?.estado || null;
        },
        [historialLocal]
    );

    const fechasCompletadas = useMemo(() => {
        return Object.entries(historialLocal)
            .filter(([, info]) => info.estado === 'completado')
            .map(([f]) => f)
            .sort();
    }, [historialLocal]);

    /* Manejar click: cicla entre estados */
    const manejarClick = useCallback(
        (fecha: string, e: React.MouseEvent) => {
            e.preventDefault();
            if (fechasEnProcesoRef.current.has(fecha)) return;
            if (!esEditable(fecha)) return;

            const estadoActual = historialLocal[fecha]?.estado || null;
            fechasEnProcesoRef.current.add(fecha);

            let nuevoEstado: EstadoHabito | null = null;
            if (!estadoActual) {
                nuevoEstado = 'completado';
            } else if (estadoActual === 'completado') {
                nuevoEstado = 'pospuesto';
            } else {
                nuevoEstado = null;
            }

            const operacion = nuevoEstado ? marcarDia(habitoId, fecha, nuevoEstado) : desmarcarDia(habitoId, fecha);
            operacion.finally(() => {
                fechasEnProcesoRef.current.delete(fecha);
            });
        },
        [habitoId, marcarDia, desmarcarDia, historialLocal]
    );

    /* Clase CSS según estado */
    const obtenerClaseEstado = useCallback(
        (estadoDia: EstadoHabito | null, editableDia: boolean, esHoyFecha: boolean, esRelevanteDia: boolean): string => {
            let clase = 'mapaCalorHabitoCelda';
            if (esHoyFecha) clase += ' mapaCalorHabitoCelda--hoy';
            if (!estadoDia) clase += ' mapaCalorHabitoCelda--vacio';
            else if (estadoDia === 'completado') clase += ' mapaCalorHabitoCelda--completado';
            else if (estadoDia === 'pospuesto') clase += ' mapaCalorHabitoCelda--pospuesto';
            else if (estadoDia === 'omitido') clase += ' mapaCalorHabitoCelda--omitido';
            if (editableDia) clase += ' mapaCalorHabitoCelda--editable';
            if (!esRelevanteDia) clase += ' mapaCalorHabitoCelda--noRelevante';
            return clase;
        },
        []
    );

    /* Estadísticas dinámicas */
    const estadisticasCalculadas = useMemo(() => {
        const valores = Object.values(historialLocal);
        const completados = valores.filter(v => v.estado === 'completado').length;
        const pospuestos = valores.filter(v => v.estado === 'pospuesto').length;
        const total = fechas.length;
        const porcentajeCumplimiento = total > 0 ? Math.round((completados / total) * 100) : 0;
        return {completados, pospuestos, porcentajeCumplimiento};
    }, [historialLocal, fechas]);

    /* Determinar relevancia de un día */
    const esRelevanteDia = useCallback(
        (fecha: string): boolean => {
            return calcularRelevanciaDia(fecha, frecuencia, fechasCompletadas);
        },
        [frecuencia, fechasCompletadas]
    );

    /* Datos del contenedor (cargando, error) */
    const hayDatos = Object.keys(historialLocal).length > 0;
    const mostrarEstadoCargando = estadoGuardado === 'guardando' && !hayDatos;
    const mostrarEstadisticas = !compacto && !enModal;
    const mostrarLeyenda = !compacto && !enModal;

    return {
        contenedorRef, fechas, semanas,
        historialLocal, estadoGuardado, errorGuardado,
        obtenerEstadoDia, manejarClick, obtenerClaseEstado,
        estadisticasCalculadas, esRelevanteDia,
        mostrarEstadoCargando, mostrarEstadisticas, mostrarLeyenda,
        esHoy, esEditable
    };
}

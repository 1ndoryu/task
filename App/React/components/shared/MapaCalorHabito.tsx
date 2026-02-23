/**
 * MapaCalorHabito
 *
 * Componente especializado para visualizar y editar el historial de un habito.
 * Permite marcar retroactivamente dias como completados o pospuestos.
 *
 * Interaccion:
 * - Click: cicla entre estados (vacio -> completado -> pospuesto -> vacio)
 *
 * @package App/React/components/shared
 */

import {useMemo, useCallback, useEffect, useRef, useState} from 'react';
import {useHabitosStore, useHabito} from '../../stores/habitosStore';
import {useHabitosHistorialStore, useHistorialDetallado} from '../../stores/habitosHistorialStore';
import type {EstadoHabito} from '../../types/historialHabitos';
import {generarFechasPeriodo, agruparPorSemanas, formatearFechaTooltip, esHoy, esEditable, calcularRelevanciaDia, DIAS_SEMANA_CORTO, MESES} from '../../utils/mapaCalorUtils';
import type {FrecuenciaHabito} from '../../types/dashboard';

/* Tipos */
interface MapaCalorHabitoProps {
    habitoId: number;
    periodo?: 'semana' | 'mes';
    compacto?: boolean;
    /* Modo modal: ancho 100%, sin leyenda/stats, con tooltip */
    enModal?: boolean;
    /* Frecuencia del hábito (para determinar días relevantes) */
    frecuencia?: FrecuenciaHabito;
    /* Fecha de creación del hábito (para calcular ciclos) */
    fechaCreacion?: string;
}

/**
 * Componente principal del Mapa de Calor para Hábitos
 */
export function MapaCalorHabito({habitoId, periodo = 'mes', compacto = false, enModal = false, frecuencia, fechaCreacion}: MapaCalorHabitoProps): JSX.Element {
    /* Obtener el hábito del store para tener acceso a su historial */
    const habito = useHabito(habitoId);
    const estadoGuardado = useHabitosStore(state => state.estadoGuardado);

    /* Obtener acciones del store */
    const marcarDia = useHabitosStore(state => state.marcarDia);
    const desmarcarDia = useHabitosStore(state => state.desmarcarDia);
    const cargarHistorialDetallado = useHabitosHistorialStore(state => state.cargarHistorialDetallado);

    /* Obtener historial detallado si existe (para el modal con más días) */
    const historialDetallado = useHistorialDetallado(habitoId);

    /* Set para trackear fechas que están en proceso de guardado (evita doble-click en misma celda) */
    const fechasEnProcesoRef = useRef<Set<string>>(new Set());

    /*
     * Construir historial local a partir del hábito del store
     * Esto reemplaza el estado local que teníamos antes
     */
    const historialLocal = useMemo(() => {
        const historial: Record<string, {estado: EstadoHabito; notas: string | null; fechaRegistro: string}> = {};

        /* Si hay historial detallado cargado, usarlo (tiene más información) */
        if (historialDetallado?.historial) {
            return historialDetallado.historial;
        }

        /* Si no, construir desde los arrays del hábito */
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

    /* Ref para medir el ancho del contenedor en modo modal */
    const contenedorRef = useRef<HTMLDivElement>(null);
    const [semanasCalculadas, setSemanasCalculadas] = useState<number | null>(null);

    /*
     * Constantes para el cálculo del número de semanas
     * Cada celda tiene 12px de ancho + 3px de gap = 15px por semana
     * Agregamos 18px de margen para el label de días de la semana
     */
    const ANCHO_CELDA_MODAL = 12;
    const GAP_CELDAS = 3;
    const ANCHO_POR_SEMANA = ANCHO_CELDA_MODAL + GAP_CELDAS;
    const MARGEN_LABEL = 18;

    /* Calcular semanas basado en el ancho del contenedor cuando está en modo modal */
    useEffect(() => {
        if (!enModal || !contenedorRef.current) return;

        const calcularSemanas = () => {
            const ancho = contenedorRef.current?.offsetWidth ?? 0;
            if (ancho > 0) {
                const anchoDisponible = ancho - MARGEN_LABEL;
                const numSemanas = Math.floor(anchoDisponible / ANCHO_POR_SEMANA);
                /* Mínimo 4 semanas, máximo 26 (medio año) */
                const semanasFinales = Math.max(4, Math.min(26, numSemanas));
                setSemanasCalculadas(semanasFinales);
            }
        };

        /* Calcular al montar */
        calcularSemanas();

        /* Recalcular en resize */
        const observer = new ResizeObserver(calcularSemanas);
        observer.observe(contenedorRef.current);

        return () => observer.disconnect();
    }, [enModal, ANCHO_POR_SEMANA, MARGEN_LABEL]);

    /*
     * Calcular días según período
     * En modo modal, usar el número de semanas calculado dinámicamente
     */
    const diasPeriodo = useMemo(() => {
        if (enModal && semanasCalculadas !== null) {
            return semanasCalculadas * 7;
        }
        return periodo === 'semana' ? 7 : 30;
    }, [periodo, enModal, semanasCalculadas]);

    /* Cargar historial detallado al montar (solo en modo modal que necesita más días) */
    useEffect(() => {
        if (habitoId > 0 && diasPeriodo > 30 && enModal) {
            cargarHistorialDetallado(habitoId, diasPeriodo);
        }
    }, [habitoId, diasPeriodo, enModal, cargarHistorialDetallado]);

    /* Generar fechas y agruparlas */
    const {fechas, semanas} = useMemo(() => {
        const rangoFechas = generarFechasPeriodo(diasPeriodo);
        const semanasAgrupadas = agruparPorSemanas(rangoFechas);

        return {
            fechas: rangoFechas,
            semanas: semanasAgrupadas
        };
    }, [diasPeriodo]);

    /* Obtener estado de un día */
    const obtenerEstadoDia = useCallback(
        (fecha: string): EstadoHabito | null => {
            return historialLocal[fecha]?.estado || null;
        },
        [historialLocal]
    );

    /* Obtener array de fechas completadas para cálculos de relevancia */
    const fechasCompletadas = useMemo(() => {
        return Object.entries(historialLocal)
            .filter(([, info]) => info.estado === 'completado')
            .map(([f]) => f)
            .sort();
    }, [historialLocal]);

    /*
     * Manejar click: cicla entre estados (vacio -> completado -> pospuesto -> vacio)
     *
     * IMPORTANTE: El store maneja las actualizaciones optimistas internamente.
     * Este callback solo determina el nuevo estado y llama a la acción correspondiente.
     */
    const manejarClick = useCallback(
        (fecha: string, e: React.MouseEvent) => {
            e.preventDefault();

            /* Bloquear solo esta fecha específica si ya está en proceso */
            if (fechasEnProcesoRef.current.has(fecha)) return;

            if (!esEditable(fecha)) return;

            /* Leer el estado actual del historial */
            const estadoActual = historialLocal[fecha]?.estado || null;

            /* Marcar esta fecha como en proceso */
            fechasEnProcesoRef.current.add(fecha);

            /* Determinar el nuevo estado */
            let nuevoEstado: EstadoHabito | null = null;
            if (!estadoActual) {
                nuevoEstado = 'completado';
            } else if (estadoActual === 'completado') {
                nuevoEstado = 'pospuesto';
            } else {
                nuevoEstado = null; /* Desmarcar */
            }

            /* Ejecutar la operación (el store actualiza optimistamente) */
            const operacion = nuevoEstado ? marcarDia(habitoId, fecha, nuevoEstado) : desmarcarDia(habitoId, fecha);

            /* Limpiar el bloqueo cuando termine (éxito o error) */
            operacion.finally(() => {
                fechasEnProcesoRef.current.delete(fecha);
            });
        },
        [habitoId, marcarDia, desmarcarDia, historialLocal]
    );

    /* Clase CSS segun estado */
    const obtenerClaseEstado = (estadoDia: EstadoHabito | null, editableDia: boolean, esHoyFecha: boolean, esRelevanteDia: boolean): string => {
        let clase = 'mapaCalorHabitoCelda';

        if (esHoyFecha) {
            clase += ' mapaCalorHabitoCelda--hoy';
        }

        if (!estadoDia) {
            clase += ' mapaCalorHabitoCelda--vacio';
        } else if (estadoDia === 'completado') {
            clase += ' mapaCalorHabitoCelda--completado';
        } else if (estadoDia === 'pospuesto') {
            clase += ' mapaCalorHabitoCelda--pospuesto';
        } else if (estadoDia === 'omitido') {
            clase += ' mapaCalorHabitoCelda--omitido';
        }

        if (editableDia) {
            clase += ' mapaCalorHabitoCelda--editable';
        }

        /* Agregar clase para días no relevantes según frecuencia */
        if (!esRelevanteDia) {
            clase += ' mapaCalorHabitoCelda--noRelevante';
        }

        return clase;
    };

    /* Calcular estadisticas dinamicamente basadas en el historial actual */
    const estadisticasCalculadas = useMemo(() => {
        const valores = Object.values(historialLocal);
        const completados = valores.filter(v => v.estado === 'completado').length;
        const pospuestos = valores.filter(v => v.estado === 'pospuesto').length;
        const total = fechas.length;
        const porcentajeCumplimiento = total > 0 ? Math.round((completados / total) * 100) : 0;

        return {completados, pospuestos, porcentajeCumplimiento};
    }, [historialLocal, fechas]);

    /* Renderizar celda */
    const renderCelda = (fecha: string, index: number) => {
        if (!fecha) {
            return <div key={`vacio-${index}`} className="mapaCalorHabitoCelda mapaCalorHabitoCelda--placeholder" />;
        }

        const estadoDia = obtenerEstadoDia(fecha);
        const esEditableDia = esEditable(fecha);
        const esHoyFecha = esHoy(fecha);
        /*
         * Determinar si esta fecha es relevante según la frecuencia del hábito
         * Usa utilidad compartida que contiene toda la lógica de negocio
         */
        const esRelevante = calcularRelevanciaDia(fecha, frecuencia, fechasCompletadas);

        const clase = obtenerClaseEstado(estadoDia, esEditableDia, esHoyFecha, esRelevante);

        /* Tooltip con fecha formateada + indicador de no relevante */
        let tooltipTexto = enModal ? formatearFechaTooltip(fecha) : undefined;
        if (tooltipTexto && !esRelevante) {
            tooltipTexto += ' (día libre)';
        }

        return (
            <div
                key={fecha}
                className={clase}
                onClick={e => manejarClick(fecha, e)}
                onContextMenu={e => e.preventDefault()}
                title={tooltipTexto}
                role={esEditableDia ? 'button' : undefined}
                tabIndex={esEditableDia ? 0 : undefined}
                onKeyDown={
                    esEditableDia
                        ? e => {
                              if (e.key === 'Enter') manejarClick(fecha, e as unknown as React.MouseEvent);
                          }
                        : undefined
                }
            />
        );
    };

    /* Ya no bloqueamos con "Cargando...", mostramos el mapa directamente */
    /* El estado de carga se refleja con opacidad reducida en el contenedor */

    /* Usar el estado del store para mostrar errores */
    const errorGuardado = useHabitosStore(state => state.errorGuardado);

    if (errorGuardado && estadoGuardado === 'error') {
        return (
            <div className="mapaCalorHabitoContenedor mapaCalorHabitoContenedor--error">
                <span className="mapaCalorHabitoError">{errorGuardado}</span>
            </div>
        );
    }

    /* Ocultar encabezado con estadisticas si estamos en modal */
    const mostrarEstadisticas = !compacto && !enModal;
    /* Ocultar leyenda si estamos en modal */
    const mostrarLeyenda = !compacto && !enModal;

    /* Solo mostrar estado de carga visual si NO hay datos y está guardando */
    const hayDatos = Object.keys(historialLocal).length > 0;
    const mostrarEstadoCargando = estadoGuardado === 'guardando' && !hayDatos;

    return (
        <div ref={contenedorRef} id="mapa-calor-habito" className={`mapaCalorHabitoContenedor ${compacto ? 'mapaCalorHabitoContenedor--compacto' : ''} ${enModal ? 'mapaCalorHabitoContenedor--modal' : ''} ${mostrarEstadoCargando ? 'mapaCalorHabitoContenedor--cargando' : ''}`}>
            {/* Encabezado con estadisticas dinamicas - oculto en modal */}
            {mostrarEstadisticas && (
                <div className="mapaCalorHabitoEncabezado">
                    <div className="mapaCalorHabitoStats">
                        <span className="mapaCalorHabitoStat mapaCalorHabitoStat--completado">
                            <strong>{estadisticasCalculadas.completados}</strong> completados
                        </span>
                        <span className="mapaCalorHabitoStat mapaCalorHabitoStat--pospuesto">
                            <strong>{estadisticasCalculadas.pospuestos}</strong> pospuestos
                        </span>
                        <span className="mapaCalorHabitoStat">
                            <strong>{estadisticasCalculadas.porcentajeCumplimiento}%</strong> cumplimiento
                        </span>
                    </div>
                </div>
            )}

            {/* Grid de dias */}
            <div className="mapaCalorHabitoCuerpo">
                {/* Etiquetas de dias de la semana (solo Lun, Mie, Vie) */}
                {!compacto && (
                    <div className="mapaCalorHabitoDiasSemana">
                        {DIAS_SEMANA_CORTO.map((dia, idx) => (
                            <span key={`dia-${idx}`} className="mapaCalorHabitoDiaSemana">
                                {idx === 1 || idx === 3 || idx === 5 ? dia : ''}
                            </span>
                        ))}
                    </div>
                )}

                {/* Contenedor de grid con indicadores de mes */}
                <div className="mapaCalorHabitoGridContenedor">
                    {/* Indicadores de mes */}
                    {!compacto && (
                        <div className="mapaCalorHabitoMeses">
                            {semanas.map((semana, idxSemana) => {
                                const primeraFecha = semana.find(f => f);
                                let mostrarMes = false;
                                let mesTexto = '';

                                if (primeraFecha) {
                                    const fechaDate = new Date(primeraFecha + 'T12:00:00');
                                    mesTexto = MESES[fechaDate.getMonth()];

                                    if (idxSemana === 0) {
                                        mostrarMes = true;
                                    } else {
                                        /* Verificar si cambió el mes respecto a la semana anterior */
                                        const semanaAnterior = semanas[idxSemana - 1];
                                        const fechaAnterior = semanaAnterior.find(f => f);
                                        if (fechaAnterior) {
                                            const fechaAntDate = new Date(fechaAnterior + 'T12:00:00');
                                            const mesAnt = MESES[fechaAntDate.getMonth()];
                                            if (mesAnt !== mesTexto) {
                                                mostrarMes = true;
                                            }
                                        }
                                    }
                                }

                                return (
                                    <span key={`mes-${idxSemana}`} className="mapaCalorHabitoMes">
                                        {mostrarMes ? mesTexto : ''}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Cuadricula de celdas */}
                    <div className="mapaCalorHabitoGrid">
                        {semanas.map((semana, idxSemana) => (
                            <div key={`semana-${idxSemana}`} className="mapaCalorHabitoSemana">
                                {semana.map((fecha, idxDia) => renderCelda(fecha, idxDia))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Leyenda - oculta en modal */}
            {mostrarLeyenda && (
                <div className="mapaCalorHabitoLeyenda">
                    <div className="mapaCalorHabitoLeyendaItem">
                        <div className="mapaCalorHabitoCelda mapaCalorHabitoCelda--vacio mapaCalorHabitoCelda--leyenda" />
                        <span>Sin registro</span>
                    </div>
                    <div className="mapaCalorHabitoLeyendaItem">
                        <div className="mapaCalorHabitoCelda mapaCalorHabitoCelda--completado mapaCalorHabitoCelda--leyenda" />
                        <span>Completado</span>
                    </div>
                    <div className="mapaCalorHabitoLeyendaItem">
                        <div className="mapaCalorHabitoCelda mapaCalorHabitoCelda--pospuesto mapaCalorHabitoCelda--leyenda" />
                        <span>Pospuesto</span>
                    </div>
                </div>
            )}
        </div>
    );
}

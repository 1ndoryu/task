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
import {useHabitosHistorial, type EstadoHabito} from '../../hooks/useHabitosHistorial';
import {obtenerFechaLocalISO} from '../../utils/fecha';
import {suscribirACambiosHistorial} from '../../services/historialHabitosStore';
import {esFechaRelevante} from '../../utils/frecuenciaHabitos';
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

/* Nombres de días de la semana abreviados */
const DIAS_SEMANA_COMPLETO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_SEMANA_CORTO = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/* Nombres de meses abreviados */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Genera un array de fechas para el período indicado
 */
function generarFechasPeriodo(dias: number): string[] {
    const fechas: string[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = dias - 1; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        fechas.push(obtenerFechaLocalISO(fecha));
    }

    return fechas;
}

/**
 * Agrupa las fechas por semanas
 * NOTA: Agregamos T12:00:00 al parsear fechas para evitar problemas de zona horaria
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

/**
 * Formatea una fecha para mostrar en tooltip
 */
function formatearFechaTooltip(fecha: string): string {
    const date = new Date(fecha + 'T12:00:00');
    const dia = date.getDate();
    const mes = MESES[date.getMonth()];
    const diaSemana = DIAS_SEMANA_COMPLETO[date.getDay()];
    return `${diaSemana}, ${dia} ${mes}`;
}

/**
 * Verifica si una fecha es hoy
 */
function esHoy(fecha: string): boolean {
    return fecha === obtenerFechaLocalISO();
}

/**
 * Verifica si una fecha es editable (puede ser hoy o pasado, no futuro)
 */
function esEditable(fecha: string): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaDate = new Date(fecha + 'T12:00:00');
    return fechaDate <= hoy;
}

/**
 * Componente principal del Mapa de Calor para Hábitos
 */
export function MapaCalorHabito({habitoId, periodo = 'mes', compacto = false, enModal = false, frecuencia, fechaCreacion}: MapaCalorHabitoProps): JSX.Element {
    /* Pasar habitoId al hook para que cargue del cache inmediatamente */
    const {estado, cargarHistorial, marcarDia, desmarcarDia} = useHabitosHistorial(habitoId);
    const {cargando, error, historial: historialDelHook} = estado;

    /* Set para trackear fechas que están en proceso de guardado (evita doble-click en misma celda) */
    const fechasEnProcesoRef = useRef<Set<string>>(new Set());

    /*
     * Estado local del historial para actualizaciones inmediatas
     * Se sincroniza con el hook pero permite cambios instantáneos al hacer click
     */
    const [historialLocal, setHistorialLocal] = useState(historialDelHook);

    /*
     * Sincronizar historialLocal cuando el hook trae nuevos datos
     * IMPORTANTE: No sobreescribir fechas que están en proceso de guardado
     * para evitar perder cambios optimistas
     */
    useEffect(() => {
        setHistorialLocal(prevLocal => {
            /* Si no hay fechas en proceso, simplemente usar los datos del hook */
            if (fechasEnProcesoRef.current.size === 0) {
                return historialDelHook;
            }

            /* Merge: usar datos del hook pero preservar fechas en proceso */
            const merged = {...historialDelHook};
            for (const fecha of fechasEnProcesoRef.current) {
                /* Mantener el valor local para fechas en proceso */
                if (prevLocal[fecha] !== undefined) {
                    merged[fecha] = prevLocal[fecha];
                } else {
                    /* Si fue borrada localmente, no restaurar del hook */
                    delete merged[fecha];
                }
            }
            return merged;
        });
    }, [historialDelHook]);

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

    /* Cargar historial al montar y cuando cambian los días */
    useEffect(() => {
        if (habitoId > 0 && diasPeriodo > 0) {
            cargarHistorial(habitoId, diasPeriodo);
        }
    }, [habitoId, diasPeriodo, cargarHistorial]);

    /* Suscribirse a cambios externos del historial */
    /* Esto permite sincronizar con cambios hechos desde otros componentes */
    useEffect(() => {
        const desuscribir = suscribirACambiosHistorial((idHabitoCambiado, fecha) => {
            /* Solo recargar si el cambio afecta a este habito */
            /* Y solo si la fecha no está siendo procesada por este componente */
            if (idHabitoCambiado === habitoId && !fechasEnProcesoRef.current.has(fecha)) {
                cargarHistorial(habitoId, diasPeriodo);
            }
        });

        return desuscribir;
    }, [habitoId, diasPeriodo, cargarHistorial]);

    /* Generar fechas y agruparlas */
    const {fechas, semanas} = useMemo(() => {
        const rangoFechas = generarFechasPeriodo(diasPeriodo);
        const semanasAgrupadas = agruparPorSemanas(rangoFechas);

        return {
            fechas: rangoFechas,
            semanas: semanasAgrupadas
        };
    }, [diasPeriodo]);

    /* Ref para el historial local, para poder acceder al valor actual en callbacks */
    const historialLocalRef = useRef(historialLocal);
    useEffect(() => {
        historialLocalRef.current = historialLocal;
    }, [historialLocal]);

    /* Obtener estado de un día */
    const obtenerEstadoDia = useCallback(
        (fecha: string): EstadoHabito | null => {
            return historialLocal[fecha]?.estado || null;
        },
        [historialLocal]
    );

    /*
     * Manejar click: cicla entre estados (vacio -> completado -> pospuesto -> vacio)
     *
     * IMPORTANTE: Este callback es fire-and-forget para máxima responsividad.
     * - No usa `await` para no bloquear
     * - Bloqueo por fecha individual, no global
     * - Actualiza el estado local inmediatamente para re-render instantáneo
     */
    const manejarClick = useCallback(
        (fecha: string, e: React.MouseEvent) => {
            e.preventDefault();

            /* Bloquear solo esta fecha específica si ya está en proceso */
            if (fechasEnProcesoRef.current.has(fecha)) return;

            if (!esEditable(fecha)) return;

            /* Leer el estado actual del ref para obtener el valor más reciente */
            const estadoActual = historialLocalRef.current[fecha]?.estado || null;

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

            /* Actualizar estado local inmediatamente para re-render instantáneo */
            setHistorialLocal(prev => {
                if (nuevoEstado) {
                    return {
                        ...prev,
                        [fecha]: {
                            estado: nuevoEstado,
                            notas: null,
                            fechaRegistro: new Date().toISOString()
                        }
                    };
                } else {
                    const nuevoHistorial = {...prev};
                    delete nuevoHistorial[fecha];
                    return nuevoHistorial;
                }
            });

            /* Ejecutar la operación sin await (fire-and-forget) */
            const operacion = nuevoEstado ? marcarDia(habitoId, fecha, nuevoEstado) : desmarcarDia(habitoId, fecha);

            /* Limpiar el bloqueo cuando termine (éxito o error) */
            operacion.finally(() => {
                fechasEnProcesoRef.current.delete(fecha);
            });
        },
        [habitoId, marcarDia, desmarcarDia]
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

    /* Obtener indicador de mes para mostrar encima de cada semana */
    const obtenerIndicadorMes = (fecha: string, esPrimeraSemana: boolean): string | null => {
        if (!fecha) return null;
        const fechaActual = new Date(fecha + 'T12:00:00');
        const diaDelMes = fechaActual.getDate();

        /*
         * Mostrar indicador si:
         * - Es la primera semana del periodo (siempre mostrar)
         * - O si es la primera semana del mes (dia <= 7 sugiere que el mes empezo recientemente)
         */
        if (esPrimeraSemana || diaDelMes <= 7) {
            return MESES[fechaActual.getMonth()];
        }
        return null;
    };

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
         *
         * Para 'diasEspecificos': Solo días de la semana seleccionados son relevantes
         * Para 'cadaXDias', 'semanal', 'mensual': Se calcula dinámicamente basándose
         * en los días MARCADOS en el historial. Los días entre marcados son "libres".
         */
        let esRelevante = true;

        if (frecuencia?.tipo === 'diasEspecificos') {
            /* diasEspecificos: verificar si el día de la semana está en la lista */
            esRelevante = esFechaRelevante(fecha, frecuencia);
        } else if (frecuencia?.tipo === 'cadaXDias' || frecuencia?.tipo === 'semanal' || frecuencia?.tipo === 'mensual') {
            /* Para intervalos: buscar el día completado más cercano anterior */
            const fechaDate = new Date(fecha + 'T12:00:00');
            const intervalo = frecuencia.tipo === 'semanal' ? 7 : frecuencia.tipo === 'cadaXDias' ? frecuencia.cadaDias || 2 : Math.floor(30 / (frecuencia.vecesAlMes || 4));

            /* Buscar fechas marcadas como completadas en el historial */
            const fechasCompletadas = Object.entries(historialLocal)
                .filter(([, info]) => info.estado === 'completado')
                .map(([f]) => f)
                .sort();

            if (fechasCompletadas.length > 0) {
                /* Encontrar la fecha completada más cercana ANTES o IGUAL a esta fecha */
                let fechaReferenciaStr: string | null = null;
                for (const fc of fechasCompletadas) {
                    const fcDate = new Date(fc + 'T12:00:00');
                    if (fcDate <= fechaDate) {
                        fechaReferenciaStr = fc;
                    } else {
                        break;
                    }
                }

                if (fechaReferenciaStr) {
                    const refDate = new Date(fechaReferenciaStr + 'T12:00:00');
                    const diffDias = Math.floor((fechaDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

                    /* Si la diferencia es 0 (es el día marcado) o es múltiplo del intervalo, es relevante */
                    /* Si no, es un día "libre" entre marcados */
                    esRelevante = diffDias === 0 || diffDias >= intervalo;
                }
            }
            /* Si no hay fechas completadas, todos son relevantes (el usuario puede marcar cualquiera) */
        }
        /* Para 'diario': todos los días son relevantes (esRelevante ya es true) */

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

    if (error) {
        return (
            <div className="mapaCalorHabitoContenedor mapaCalorHabitoContenedor--error">
                <span className="mapaCalorHabitoError">{error}</span>
            </div>
        );
    }

    /* Ocultar encabezado con estadisticas si estamos en modal */
    const mostrarEstadisticas = !compacto && !enModal;
    /* Ocultar leyenda si estamos en modal */
    const mostrarLeyenda = !compacto && !enModal;

    /* Solo mostrar estado de carga visual si NO hay datos en cache */
    /* Si hay datos, siempre los mostramos sin indicador de carga */
    const hayDatos = Object.keys(historialLocal).length > 0;
    const mostrarEstadoCargando = cargando && !hayDatos;

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
                                const indicador = primeraFecha ? obtenerIndicadorMes(primeraFecha, idxSemana === 0) : null;
                                return (
                                    <span key={`mes-${idxSemana}`} className="mapaCalorHabitoMes">
                                        {indicador || ''}
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

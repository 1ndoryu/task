/**
 * MapaCalor
 *
 * Componente reutilizable para visualizar actividad en formato heatmap
 * estilo GitHub. Muestra los últimos N días o meses en una cuadrícula
 * donde cada celda representa un día con su nivel de actividad.
 *
 * @package App/React/components/shared
 */

import {useMemo, useRef, useState, useEffect, useCallback} from 'react';
import {obtenerFechaLocalISO} from '../../utils/fecha';

/* Tipos */
export interface DatosHeatmapProps {
    [fecha: string]: {
        nivel: number;
        total: number;
        tipos?: {
            [tipo: string]: number;
        };
    };
}

export interface MapaCalorProps {
    /* Datos del heatmap: fecha -> {nivel, total} */
    datos: DatosHeatmapProps;
    /* Periodo a mostrar ('auto' calcula segun ancho disponible) */
    periodo?: 'auto' | 'semana' | 'mes' | 'trimestre' | 'anio';
    /* Fecha de inicio personalizada (opcional) */
    fechaInicio?: string;
    /* Fecha de fin personalizada (opcional) */
    fechaFin?: string;
    /* Título del widget */
    titulo?: string;
    /* Callback al hacer click en un día */
    onClickDia?: (fecha: string, datos: {nivel: number; total: number}) => void;
    /* Mostrar leyenda */
    mostrarLeyenda?: boolean;
    /* Tamaño de las celdas */
    tamanoCelda?: 'pequeno' | 'normal' | 'grande';
    /* Modo compacto (solo muestra la cuadrícula) */
    compacto?: boolean;
    /* ID único para el componente */
    id?: string;
}

/* Nombres de días de la semana abreviados */
const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/* Nombres de meses abreviados */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Genera un array de fechas entre dos fechas
 */
function generarRangoFechas(inicio: Date, fin: Date): string[] {
    const fechas: string[] = [];
    const actual = new Date(inicio);

    while (actual <= fin) {
        fechas.push(obtenerFechaLocalISO(actual));
        actual.setDate(actual.getDate() + 1);
    }

    return fechas;
}

/**
 * Calcula las fechas segun el periodo
 * NOTA: fin se establece a las 23:59:59.999 para garantizar que el dia de hoy
 * siempre se incluya en el rango (evita problemas de comparacion de milisegundos)
 */
function calcularFechasPeriodo(periodo: string, diasAuto?: number): {inicio: Date; fin: Date} {
    const fin = new Date();
    /* Establecer fin al FINAL del dia de hoy (23:59:59.999) para que siempre se incluya */
    fin.setHours(23, 59, 59, 999);

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    switch (periodo) {
        case 'auto':
            /* En modo auto, usar los dias calculados o default 90 */
            inicio.setDate(inicio.getDate() - ((diasAuto || 90) - 1));
            break;
        case 'semana':
            inicio.setDate(inicio.getDate() - 6); /* 7 dias incluyendo hoy = -6 */
            break;
        case 'mes':
            inicio.setDate(inicio.getDate() - 29); /* 30 dias incluyendo hoy = -29 */
            break;
        case 'trimestre':
            inicio.setDate(inicio.getDate() - 89); /* 90 dias incluyendo hoy = -89 */
            break;
        case 'anio':
            inicio.setDate(inicio.getDate() - 364); /* 365 dias incluyendo hoy = -364 */
            break;
        default:
            inicio.setDate(inicio.getDate() - 29);
    }

    return {inicio, fin};
}

/* Constantes para calculos de tamaño */
const TAMANO_CELDA = {
    pequeno: 10,
    normal: 12,
    grande: 14
};
const GAP_CELDAS = 3;
const ANCHO_DIAS_SEMANA = 20;

/**
 * Agrupa las fechas por semanas para la visualización tipo GitHub
 * NOTA: Al parsear fechas string, agregamos T12:00:00 para evitar problemas
 * de zona horaria (sin hora, JS interpreta como medianoche UTC)
 */
function agruparPorSemanas(fechas: string[]): string[][] {
    const semanas: string[][] = [];
    let semanaActual: string[] = [];

    /* Obtener el día de la semana del primer día */
    /* Agregamos T12:00:00 para evitar problemas de zona horaria */
    const primerDia = new Date(fechas[0] + 'T12:00:00');
    const diaInicio = primerDia.getDay();

    /* Agregar espacios vacíos al inicio si no empieza en domingo */
    for (let i = 0; i < diaInicio; i++) {
        semanaActual.push('');
    }

    for (const fecha of fechas) {
        /* Agregamos T12:00:00 para evitar problemas de zona horaria */
        const diaSemana = new Date(fecha + 'T12:00:00').getDay();

        if (diaSemana === 0 && semanaActual.length > 0) {
            semanas.push(semanaActual);
            semanaActual = [];
        }

        semanaActual.push(fecha);
    }

    /* Agregar la última semana si tiene elementos */
    if (semanaActual.length > 0) {
        semanas.push(semanaActual);
    }

    return semanas;
}

/**
 * Obtiene los meses visibles en el rango con sus anchos calculados
 */
function obtenerMesesVisibles(semanas: string[][], tamanoSemana: number): {mes: string; ancho: number}[] {
    const meses: {mes: string; ancho: number; semanaInicio: number}[] = [];
    let mesAnterior = -1;

    for (let semanaIdx = 0; semanaIdx < semanas.length; semanaIdx++) {
        const semana = semanas[semanaIdx];
        /* Buscar la primera fecha valida de la semana */
        const primeraFechaValida = semana.find(f => f !== '');
        if (!primeraFechaValida) continue;

        const fecha = new Date(primeraFechaValida);
        const mes = fecha.getMonth();

        if (mes !== mesAnterior) {
            /* Cerrar el mes anterior calculando su ancho */
            if (meses.length > 0) {
                const ultimoMes = meses[meses.length - 1];
                ultimoMes.ancho = (semanaIdx - ultimoMes.semanaInicio) * tamanoSemana;
            }

            meses.push({
                mes: MESES[mes],
                ancho: 0,
                semanaInicio: semanaIdx
            });
            mesAnterior = mes;
        }
    }

    /* Cerrar el ultimo mes */
    if (meses.length > 0) {
        const ultimoMes = meses[meses.length - 1];
        ultimoMes.ancho = (semanas.length - ultimoMes.semanaInicio) * tamanoSemana;
    }

    return meses.map(m => ({mes: m.mes, ancho: m.ancho}));
}

/**
 * Formatea una fecha para mostrar en tooltip
 * NOTA: Agregamos T12:00:00 para evitar problemas de zona horaria
 * (sin hora, JS interpreta como medianoche UTC)
 */
function formatearFecha(fecha: string): string {
    const date = new Date(fecha + 'T12:00:00');
    const dia = date.getDate();
    const mes = MESES[date.getMonth()];
    const anio = date.getFullYear();
    return `${dia} ${mes} ${anio}`;
}

/**
 * Componente principal del Mapa de Calor
 */
export function MapaCalor({datos, periodo = 'auto', fechaInicio, fechaFin, titulo, onClickDia, mostrarLeyenda = true, tamanoCelda = 'normal', compacto = false, id = 'mapaCalor'}: MapaCalorProps): JSX.Element {
    /* Ref para medir el contenedor */
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

        /* Observer para detectar cambios de tamaño */
        const resizeObserver = new ResizeObserver(medirAncho);
        if (contenedorRef.current) {
            resizeObserver.observe(contenedorRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    /* Calcular numero de semanas que caben en modo auto */
    const calcularSemanasAuto = useCallback((): number => {
        if (anchoContenedor === 0) return 13; /* Default: ~3 meses */

        const tamano = TAMANO_CELDA[tamanoCelda];
        /* Restar: ancho dias semana (20px) + padding del contenedor (8px aprox) */
        const anchoDisponible = anchoContenedor - ANCHO_DIAS_SEMANA - 40;
        const anchoPorSemana = tamano + GAP_CELDAS;
        const semanas = Math.floor(anchoDisponible / anchoPorSemana);

        return Math.max(4, Math.min(semanas, 53)); /* Min 4 semanas, max 1 año */
    }, [anchoContenedor, tamanoCelda]);

    /* Calcular dias para modo auto */
    const diasAuto = useMemo(() => {
        if (periodo !== 'auto') return undefined;
        const numSemanas = calcularSemanasAuto();
        return numSemanas * 7;
    }, [periodo, calcularSemanasAuto]);

    /* Tamano de semana para calculos (celda + gap) */
    const tamanoSemana = TAMANO_CELDA[tamanoCelda] + GAP_CELDAS;

    /* Fecha de hoy para dependencia del useMemo (se recalcula cuando cambia el dia) */
    const fechaHoy = obtenerFechaLocalISO();

    /* Calcular el rango de fechas */
    const {fechas, semanas, mesesVisibles} = useMemo(() => {
        let inicio: Date;
        let fin: Date;

        if (fechaInicio && fechaFin) {
            inicio = new Date(fechaInicio);
            fin = new Date(fechaFin);
        } else {
            const calculado = calcularFechasPeriodo(periodo, diasAuto);
            inicio = calculado.inicio;
            fin = calculado.fin;
        }

        const rangoFechas = generarRangoFechas(inicio, fin);
        const semanasAgrupadas = agruparPorSemanas(rangoFechas);
        const meses = obtenerMesesVisibles(semanasAgrupadas, tamanoSemana);

        return {
            fechas: rangoFechas,
            semanas: semanasAgrupadas,
            mesesVisibles: meses
        };
    }, [periodo, fechaInicio, fechaFin, diasAuto, tamanoSemana, fechaHoy]);

    /* Calcular estadísticas */
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

    /* Clase del contenedor según tamaño */
    const clasesTamano = {
        pequeno: 'mapaCalorCelda--pequeno',
        normal: '',
        grande: 'mapaCalorCelda--grande'
    };

    /* Renderizar celda de día */
    const renderCelda = (fecha: string, index: number) => {
        if (!fecha) {
            return <div key={`vacio-${index}`} className="mapaCalorCelda mapaCalorCelda--vacio" />;
        }

        const datosDia = datos[fecha] || {nivel: 0, total: 0};
        const nivel = datosDia.nivel;
        const esClickeable = Boolean(onClickDia);

        const tooltip = `${formatearFecha(fecha)}: ${datosDia.total} ${datosDia.total === 1 ? 'actividad' : 'actividades'}`;

        const handleClick = () => {
            if (onClickDia) {
                onClickDia(fecha, datosDia);
            }
        };

        return (
            <div
                key={fecha}
                className={`mapaCalorCelda mapaCalorCelda--nivel${nivel} ${clasesTamano[tamanoCelda]} ${esClickeable ? 'mapaCalorCelda--clickeable' : ''}`}
                title={tooltip}
                onClick={esClickeable ? handleClick : undefined}
                role={esClickeable ? 'button' : undefined}
                tabIndex={esClickeable ? 0 : undefined}
                onKeyDown={
                    esClickeable
                        ? e => {
                              if (e.key === 'Enter') handleClick();
                          }
                        : undefined
                }
            />
        );
    };

    return (
        <div ref={contenedorRef} id={id} className={`mapaCalorContenedor ${compacto ? 'mapaCalorContenedor--compacto' : ''} ${periodo === 'auto' ? 'mapaCalorContenedor--auto' : ''}`}>
            {/* Encabezado */}
            {!compacto && titulo && (
                <div className="mapaCalorEncabezado">
                    <h3 className="mapaCalorTitulo">{titulo}</h3>
                    <div className="mapaCalorEstadisticas">
                        <span className="mapaCalorStat">
                            <strong>{estadisticas.totalActividades}</strong> actividades
                        </span>
                        <span className="mapaCalorStat">
                            <strong>{estadisticas.diasConActividad}</strong> de {estadisticas.diasTotales} dias
                        </span>
                    </div>
                </div>
            )}

            {/* Cuadrícula principal */}
            <div className="mapaCalorCuerpo">
                {/* Etiquetas de meses */}
                {!compacto && periodo !== 'semana' && (
                    <div className="mapaCalorMeses">
                        {mesesVisibles.map((item, idx) => (
                            <span key={`mes-${idx}`} className="mapaCalorMes" style={{width: item.ancho > 0 ? `${item.ancho}px` : 'auto'}}>
                                {item.mes}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mapaCalorContenido">
                    {/* Etiquetas de días de la semana */}
                    {!compacto && (
                        <div className="mapaCalorDiasSemana">
                            {DIAS_SEMANA.map((dia, idx) => (
                                <span key={`dia-${idx}`} className="mapaCalorDiaSemana">
                                    {idx % 2 === 1 ? dia : ''}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Cuadrícula de celdas */}
                    <div className="mapaCalorGrid">
                        {semanas.map((semana, idxSemana) => (
                            <div key={`semana-${idxSemana}`} className="mapaCalorSemana">
                                {semana.map((fecha, idxDia) => renderCelda(fecha, idxDia))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Leyenda */}
            {mostrarLeyenda && !compacto && (
                <div className="mapaCalorLeyenda">
                    <span className="mapaCalorLeyendaTexto">Menos</span>
                    <div className="mapaCalorLeyendaCeldas">
                        <div className="mapaCalorCelda mapaCalorCelda--nivel0" title="Sin actividad" />
                        <div className="mapaCalorCelda mapaCalorCelda--nivel1" title="Poca actividad" />
                        <div className="mapaCalorCelda mapaCalorCelda--nivel2" title="Actividad moderada" />
                        <div className="mapaCalorCelda mapaCalorCelda--nivel3" title="Buena actividad" />
                        <div className="mapaCalorCelda mapaCalorCelda--nivel4" title="Mucha actividad" />
                    </div>
                    <span className="mapaCalorLeyendaTexto">Mas</span>
                </div>
            )}
        </div>
    );
}

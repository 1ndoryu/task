/**
 * HistorialHabito
 *
 * Componente compacto que muestra el historial de los últimos 7 días
 * de un hábito en formato de píldoras/indicadores visuales.
 *
 * Estados visuales:
 * - Completado: Indicador verde con check
 * - Pospuesto: Indicador amarillo con pausa
 * - Omitido: Indicador rojo con X
 * - Sin registro: Indicador gris vacío
 * - No aplica: Indicador con opacidad reducida (día no relevante según frecuencia)
 *
 * @package App/React/components/shared
 */

import type {EstadoHabito} from '../../types/historialHabitos';
import type {FrecuenciaHabito} from '../../types/dashboard';
import {esFechaRelevante, esFechaRelevanteConHistorial} from '../../utils/frecuenciaRelevancia';
import {obtenerFechaLocalISO, obtenerFechaEfectiva} from '../../utils/fecha';

/* Tipos */
export interface DiaResumen {
    fecha: string;
    diaSemana: string;
    estado: EstadoHabito | null;
    esHoy: boolean;
    /* Indica si este día es relevante según la frecuencia del hábito */
    esRelevante: boolean;
}

export interface HistorialHabitoProps {
    /* Resumen de los últimos 7 días */
    resumen?: DiaResumen[];
    /* Historial desde el hook (formato alternativo) */
    historial?: {
        [fecha: string]: EstadoHabito;
    };
    /* Frecuencia del hábito (para filtrar días relevantes) */
    frecuencia?: FrecuenciaHabito;
    /* Fecha de creación del hábito (para calcular ciclos en frecuencias basadas en intervalos) */
    fechaCreacion?: string;
    /* Callback al hacer click en un día */
    onClickDia?: (fecha: string, estadoActual: EstadoHabito | null) => void;
    /* Mostrar etiquetas de días */
    mostrarEtiquetas?: boolean;
    /* Modo compacto (solo indicadores sin etiquetas) */
    compacto?: boolean;
    /* ID del hábito (para generar IDs únicos) */
    habitoId?: number;
    /* Ocultar días no relevantes (en lugar de mostrarlos con opacidad) */
    ocultarNoRelevantes?: boolean;
    /* Cantidad de días a mostrar (por defecto 5) */
    cantidadDias?: number;
}

/* Iconos SVG inline para cada estado */
const iconos = {
    completado: (
        <svg viewBox="0 0 16 16" fill="currentColor" className="historialHabitoIcono">
            <path d="M13.485 3.515a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414L6 10.086l6.293-6.293a1 1 0 0 1 1.192-.178z" />
        </svg>
    ),
    pospuesto: (
        <svg viewBox="0 0 16 16" fill="currentColor" className="historialHabitoIcono">
            <path d="M5 3a1 1 0 0 0-1 1v8a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1zm6 0a1 1 0 0 0-1 1v8a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1z" />
        </svg>
    ),
    omitido: (
        <svg viewBox="0 0 16 16" fill="currentColor" className="historialHabitoIcono">
            <path d="M4.293 4.293a1 1 0 0 1 1.414 0L8 6.586l2.293-2.293a1 1 0 1 1 1.414 1.414L9.414 8l2.293 2.293a1 1 0 0 1-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L6.586 8 4.293 5.707a1 1 0 0 1 0-1.414z" />
        </svg>
    )
};

/**
 * Genera el resumen de N días a partir del historial
 *
 * Comportamiento:
 * - Siempre retorna exactamente `cantidadDias` días
 * - Omite días libres (no relevantes según frecuencia) que NO fueron marcados
 * - Incluye días libres que SÍ fueron marcados (completado/pospuesto/omitido)
 * - Busca hacia atrás en el tiempo hasta completar los días necesarios
 *
 * @param historial - Mapa de fecha -> estado
 * @param frecuencia - Frecuencia del hábito para determinar relevancia
 * @param fechaCreacion - Fecha de creación del hábito (no usado actualmente)
 * @param cantidadDias - Número de días a mostrar (por defecto 5)
 */
function generarResumenDeHistorial(historial: {[fecha: string]: EstadoHabito}, frecuencia?: FrecuenciaHabito, fechaCreacion?: string, cantidadDias: number = 5): DiaResumen[] {
    const diasSemana = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    /* Usamos obtenerFechaEfectiva para respetar la hora de fin del día */
    const hoy = obtenerFechaEfectiva();
    const hoyStr = obtenerFechaLocalISO(hoy);

    const resumen: DiaResumen[] = [];

    /*
     * Extraer historial de completados para calcular días libres
     * Solo necesitamos las fechas con estado 'completado'
     */
    const historialCompletados = Object.entries(historial)
        .filter(([, estado]) => estado === 'completado')
        .map(([fecha]) => fecha);

    /*
     * Máximo de días a revisar hacia atrás para evitar loops infinitos
     * 60 días debería ser suficiente para cualquier frecuencia
     */
    const maxDiasRevisar = 60;
    let diasRevisados = 0;

    /*
     * Buscamos hacia atrás desde hoy hasta completar los días solicitados
     * Un día se incluye si:
     * 1. Es relevante según la frecuencia, O
     * 2. Tiene un estado marcado (completado/pospuesto/omitido)
     */
    while (resumen.length < cantidadDias && diasRevisados < maxDiasRevisar) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - diasRevisados);
        const fechaStr = obtenerFechaLocalISO(fecha);

        /* Determinar si este día es relevante según la frecuencia */
        let esRelevante = true;

        if (frecuencia) {
            if (frecuencia.tipo === 'diasEspecificos') {
                /* Para días específicos, solo verificar el día de la semana */
                esRelevante = esFechaRelevante(fechaStr, frecuencia);
            } else if (frecuencia.tipo !== 'diario') {
                /*
                 * Para cadaXDias, semanal, mensual: usar la nueva función
                 * que calcula basándose en el historial de completados
                 */
                esRelevante = esFechaRelevanteConHistorial(fechaStr, frecuencia, historialCompletados);
            }
        }

        /* Verificar si el día tiene un estado marcado */
        const estadoDia = historial[fechaStr] || null;
        const tieneMarcado = estadoDia !== null;

        /*
         * Incluir el día si:
         * - Es relevante según la frecuencia, O
         * - Fue marcado (aunque sea día libre, si el usuario lo marcó, mostrarlo)
         */
        if (esRelevante || tieneMarcado) {
            /* Insertar al inicio para mantener orden cronológico (más antiguo primero) */
            resumen.unshift({
                fecha: fechaStr,
                diaSemana: diasSemana[fecha.getDay()],
                estado: estadoDia,
                esHoy: fechaStr === hoyStr,
                esRelevante
            });
        }

        diasRevisados++;
    }

    return resumen;
}

/**
 * Formatea la fecha para el tooltip
 */
function formatearFechaTooltip(fecha: string, estado: EstadoHabito | null, esRelevante: boolean = true): string {
    const date = new Date(fecha + 'T12:00:00');
    const dia = date.getDate();
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const mes = meses[date.getMonth()];

    let estadoTexto = 'Sin registro';
    if (!esRelevante) estadoTexto = 'No aplica (dia libre)';
    else if (estado === 'completado') estadoTexto = 'Completado';
    else if (estado === 'pospuesto') estadoTexto = 'Pospuesto';
    else if (estado === 'omitido') estadoTexto = 'Omitido';

    return `${dia} ${mes}: ${estadoTexto}`;
}

/**
 * Componente principal de historial de hábito
 */
export function HistorialHabito({resumen, historial, frecuencia, fechaCreacion, onClickDia, mostrarEtiquetas = false, compacto = true, habitoId, ocultarNoRelevantes = false, cantidadDias = 5}: HistorialHabitoProps): JSX.Element {
    /*
     * Usar resumen proporcionado o generarlo desde el historial
     * generarResumenDeHistorial ya omite días libres sin marcar internamente
     */
    const dias = resumen ?? (historial ? generarResumenDeHistorial(historial, frecuencia, fechaCreacion, cantidadDias) : []);

    if (dias.length === 0) {
        return <div className="historialHabitoVacio">Sin datos</div>;
    }

    const handleClickDia = (fecha: string, estadoActual: EstadoHabito | null) => {
        if (onClickDia) {
            onClickDia(fecha, estadoActual);
        }
    };

    return (
        <div id={habitoId ? `historialHabito-${habitoId}` : undefined} className={`historialHabitoContenedor ${compacto ? 'historialHabitoContenedor--compacto' : ''}`}>
            {dias.map(dia => {
                /* Solo permitir click en días relevantes y que no sean hoy */
                const esClickeable = Boolean(onClickDia) && !dia.esHoy && dia.esRelevante;
                const claseEstado = dia.estado ? `historialHabitoDia--${dia.estado}` : 'historialHabitoDia--vacio';
                /* Clase adicional para días no relevantes */
                const claseRelevancia = dia.esRelevante ? '' : 'historialHabitoDia--noRelevante';

                return (
                    <div
                        key={dia.fecha}
                        className={`historialHabitoDia ${claseEstado} ${dia.esHoy ? 'historialHabitoDia--hoy' : ''} ${esClickeable ? 'historialHabitoDia--clickeable' : ''} ${claseRelevancia}`}
                        title={formatearFechaTooltip(dia.fecha, dia.estado, dia.esRelevante)}
                        onClick={
                            esClickeable
                                ? e => {
                                      e.stopPropagation();
                                      handleClickDia(dia.fecha, dia.estado);
                                  }
                                : undefined
                        }
                        role={esClickeable ? 'button' : undefined}
                        tabIndex={esClickeable ? 0 : undefined}
                        onKeyDown={
                            esClickeable
                                ? e => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') handleClickDia(dia.fecha, dia.estado);
                                  }
                                : undefined
                        }>
                        {/* Etiqueta del día */}
                        {mostrarEtiquetas && <span className="historialHabitoDiaLabel">{dia.diaSemana}</span>}

                        {/* Indicador visual */}
                        <span className="historialHabitoDiaIndicador">{dia.estado && iconos[dia.estado]}</span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Componente contenedor para múltiples historiales
 * Útil cuando se quiere mostrar el historial inline en la tabla de hábitos
 */
export interface HistorialHabitoInlineProps {
    /* Historial del hábito (fecha -> estado) */
    historial: {
        [fecha: string]: EstadoHabito;
    };
    /* Frecuencia del hábito (para filtrar días relevantes) */
    frecuencia?: FrecuenciaHabito;
    /* Fecha de creación del hábito (para calcular ciclos) */
    fechaCreacion?: string;
    /* Callback al hacer click */
    onClickDia?: (fecha: string, estadoActual: EstadoHabito | null) => void;
    /* Ocultar días no relevantes */
    ocultarNoRelevantes?: boolean;
}

export function HistorialHabitoInline({historial, frecuencia, fechaCreacion, onClickDia, ocultarNoRelevantes = false}: HistorialHabitoInlineProps): JSX.Element {
    return <HistorialHabito historial={historial} frecuencia={frecuencia} fechaCreacion={fechaCreacion} onClickDia={onClickDia} compacto={true} mostrarEtiquetas={false} ocultarNoRelevantes={ocultarNoRelevantes} />;
}

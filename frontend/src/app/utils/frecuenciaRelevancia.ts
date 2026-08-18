/*
 * frecuenciaRelevancia
 * Utilidades para determinar relevancia de fechas según frecuencia de hábitos
 * Evalúa si una fecha específica aplica para un hábito dado su patrón de frecuencia
 */

import type {FrecuenciaHabito} from '../types/dashboard';
import {obtenerFechaLocalISO, obtenerFechaEfectiva} from './fecha';
import {DIAS_JS_A_DIASEMANA} from './frecuenciaHabitos';

/*
 * Determina si una fecha específica es relevante para un hábito según su frecuencia
 * Usado para filtrar el historial y mostrar solo días que "tocaban"
 *
 * @param fecha - Fecha a evaluar (YYYY-MM-DD)
 * @param frecuencia - Configuración de frecuencia del hábito
 * @param fechaReferencia - Fecha de referencia para calcular ciclos (creación o primer completado)
 */
export function esFechaRelevante(fecha: string, frecuencia: FrecuenciaHabito, fechaReferencia?: string): boolean {
    const fechaDate = new Date(fecha + 'T12:00:00');

    switch (frecuencia.tipo) {
        case 'diario':
            /* Todos los días son relevantes */
            return true;

        case 'cadaXDias': {
            /* Si no hay fecha de referencia, no podemos calcular */
            if (!fechaReferencia) return true;

            const intervalo = frecuencia.cadaDias || 2;
            const refDate = new Date(fechaReferencia + 'T12:00:00');
            const diffDias = Math.floor((fechaDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

            /* Es relevante si la diferencia es múltiplo del intervalo */
            return diffDias >= 0 && diffDias % intervalo === 0;
        }

        case 'semanal': {
            /* Si no hay fecha de referencia, no podemos calcular */
            if (!fechaReferencia) return true;

            const refDate = new Date(fechaReferencia + 'T12:00:00');
            const diffDias = Math.floor((fechaDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

            /* Es relevante si la diferencia es múltiplo de 7 */
            return diffDias >= 0 && diffDias % 7 === 0;
        }

        case 'diasEspecificos': {
            const diaSemana = DIAS_JS_A_DIASEMANA[fechaDate.getDay()];
            return (frecuencia.diasSemana || []).includes(diaSemana);
        }

        case 'mensual': {
            /* Si no hay fecha de referencia, no podemos calcular */
            if (!fechaReferencia) return true;

            const vecesAlMes = frecuencia.vecesAlMes || 4;
            const intervaloIdeal = Math.floor(30 / vecesAlMes);
            const refDate = new Date(fechaReferencia + 'T12:00:00');
            const diffDias = Math.floor((fechaDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

            /* Es relevante si la diferencia es múltiplo del intervalo ideal */
            return diffDias >= 0 && diffDias % intervaloIdeal === 0;
        }

        default:
            return true;
    }
}

/*
 * Genera un array de fechas relevantes para un hábito en los últimos N días
 * Solo incluye fechas que aplican según la frecuencia
 *
 * @param frecuencia - Configuración de frecuencia del hábito
 * @param cantidadDias - Cantidad de días a evaluar (default 7)
 * @param fechaReferencia - Fecha de referencia para calcular ciclos
 */
export function generarFechasRelevantes(frecuencia: FrecuenciaHabito, cantidadDias: number = 7, fechaReferencia?: string): string[] {
    const fechas: string[] = [];
    /* Usamos obtenerFechaEfectiva para respetar la hora de fin del día */
    const hoy = obtenerFechaEfectiva();

    for (let i = cantidadDias - 1; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = obtenerFechaLocalISO(fecha);

        if (esFechaRelevante(fechaStr, frecuencia, fechaReferencia)) {
            fechas.push(fechaStr);
        }
    }

    return fechas;
}

/*
 * Determina si una fecha específica es relevante para un hábito,
 * basándose en el historial de completados en lugar de la fecha de creación.
 *
 * Para frecuencias 'cadaXDias', 'semanal', 'mensual':
 * - Busca el día completado más cercano ANTES o IGUAL a la fecha evaluada
 * - Si la diferencia de días es 0 (es el día marcado) o >= intervalo, es relevante
 * - Los días entre marcados son "libres" y no son relevantes
 *
 * Para 'diasEspecificos': Solo días de la semana seleccionados son relevantes
 * Para 'diario': Todos los días son relevantes
 *
 * @param fecha - Fecha a evaluar (YYYY-MM-DD)
 * @param frecuencia - Configuración de frecuencia del hábito
 * @param historialCompletados - Array de fechas completadas (YYYY-MM-DD) ordenadas
 */
export function esFechaRelevanteConHistorial(fecha: string, frecuencia: FrecuenciaHabito, historialCompletados: string[]): boolean {
    const fechaDate = new Date(fecha + 'T12:00:00');

    switch (frecuencia.tipo) {
        case 'diario':
            /* Todos los días son relevantes */
            return true;

        case 'diasEspecificos': {
            /* Solo días de la semana seleccionados son relevantes */
            const diaSemana = DIAS_JS_A_DIASEMANA[fechaDate.getDay()];
            return (frecuencia.diasSemana || []).includes(diaSemana);
        }

        case 'cadaXDias':
        case 'semanal':
        case 'mensual': {
            /* Calcular intervalo según el tipo de frecuencia */
            let intervalo: number;
            if (frecuencia.tipo === 'semanal') {
                intervalo = 7;
            } else if (frecuencia.tipo === 'cadaXDias') {
                intervalo = frecuencia.cadaDias || 2;
            } else {
                /* mensual: dividir 30 días entre las veces al mes */
                intervalo = Math.floor(30 / (frecuencia.vecesAlMes || 4));
            }

            /* Si no hay historial de completados, todos los días son relevantes */
            if (!historialCompletados || historialCompletados.length === 0) {
                return true;
            }

            /* Ordenar el historial (por si no viene ordenado) */
            const fechasOrdenadas = [...historialCompletados].sort();

            /*
             * Encontrar la fecha completada más cercana ANTES o IGUAL a esta fecha
             * Esto nos da el punto de referencia para calcular si "toca" hoy
             */
            let fechaReferenciaStr: string | null = null;
            for (const fc of fechasOrdenadas) {
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

                /*
                 * Es relevante si:
                 * - diffDias === 0: Es el día marcado como completado
                 * - diffDias >= intervalo: Ya pasó el intervalo, "toca" hacerlo
                 * Los días con 0 < diffDias < intervalo son "libres"
                 */
                return diffDias === 0 || diffDias >= intervalo;
            }

            /* Si no hay fecha de referencia anterior, es relevante */
            return true;
        }

        default:
            return true;
    }
}

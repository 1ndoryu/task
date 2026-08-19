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

/* [H-F15-01] Relevancia por historial de completados: relevanciaHistorial.ts */
export {esFechaRelevanteConHistorial} from './relevanciaHistorial';

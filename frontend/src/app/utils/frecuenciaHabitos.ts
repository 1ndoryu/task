/*
 * frecuenciaHabitos
 * Utilidades para calcular frecuencia y estado de habitos
 * Determina si un habito "toca hoy" y calcula dias hasta proxima repeticion
 */

import type {FrecuenciaHabito, DiaSemana} from '../types/dashboard';
import {obtenerFechaEfectiva} from './fecha';

/* Mapeo de dia de semana (0=domingo, 6=sabado) a DiaSemana */
export const DIAS_JS_A_DIASEMANA: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/* Determina si un habito debe realizarse hoy basado en su frecuencia (TAREA 3: fix off-by-one) */
export function tocaHoy(frecuencia: FrecuenciaHabito, ultimoCompletado?: string): boolean {
    /* Usamos obtenerFechaEfectiva para respetar la hora de fin del día */
    const hoy = obtenerFechaEfectiva();

    switch (frecuencia.tipo) {
        case 'diario':
            return true;

        case 'cadaXDias': {
            if (!ultimoCompletado) return true;

            /* Normalizar a medianoche para evitar off-by-one */
            const ultimaFecha = new Date(ultimoCompletado + 'T00:00:00');
            const diasTranscurridos = Math.floor((hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24));

            return diasTranscurridos >= (frecuencia.cadaDias || 2);
        }

        case 'semanal': {
            if (!ultimoCompletado) return true;
            const ultimaFecha = new Date(ultimoCompletado + 'T00:00:00');
            const diasTranscurridos = Math.floor((hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24));
            return diasTranscurridos >= 7;
        }

        case 'diasEspecificos': {
            const diaActual = DIAS_JS_A_DIASEMANA[hoy.getDay()];
            return (frecuencia.diasSemana || []).includes(diaActual);
        }

        case 'mensual': {
            if (!ultimoCompletado) return true;
            const ultimaFecha = new Date(ultimoCompletado + 'T00:00:00');
            const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            const vecesAlMes = frecuencia.vecesAlMes || 4;
            const intervaloIdeal = Math.floor(diasEnMes / vecesAlMes);
            const diasTranscurridos = Math.floor((hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24));
            return diasTranscurridos >= intervaloIdeal;
        }

        default:
            return true;
    }
}

/* Dias restantes hasta proxima repeticion (0 si toca hoy, TAREA 3: fix off-by-one) */
export function diasHastaProximaRepeticion(frecuencia: FrecuenciaHabito, ultimoCompletado?: string): number {
    if (tocaHoy(frecuencia, ultimoCompletado)) return 0;
    const hoy = obtenerFechaEfectiva();
    if (!ultimoCompletado) return 0;
    const ultimaFecha = new Date(ultimoCompletado + 'T00:00:00');
    const diasTranscurridos = Math.floor((hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24));

    switch (frecuencia.tipo) {
        case 'cadaXDias': {
            const intervalo = frecuencia.cadaDias || 2;
            return Math.max(0, intervalo - diasTranscurridos);
        }

        case 'semanal':
            return Math.max(0, 7 - diasTranscurridos);

        case 'diasEspecificos': {
            const diasSemana = frecuencia.diasSemana || [];
            const diaActualJs = hoy.getDay();

            /* Buscar el proximo dia que toca */
            for (let i = 1; i <= 7; i++) {
                const diaProximoJs = (diaActualJs + i) % 7;
                const diaSemana = DIAS_JS_A_DIASEMANA[diaProximoJs];
                if (diasSemana.includes(diaSemana)) {
                    return i;
                }
            }
            return 7;
        }

        case 'mensual': {
            const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            const vecesAlMes = frecuencia.vecesAlMes || 4;
            const intervaloIdeal = Math.floor(diasEnMes / vecesAlMes);
            return Math.max(0, intervaloIdeal - diasTranscurridos);
        }

        default:
            return 0;
    }
}

/* Umbral de dias de inactividad para resetear racha */
export function calcularUmbralInactividad(frecuencia: FrecuenciaHabito): number {
    switch (frecuencia.tipo) {
        case 'diario':
            return 7; /* 7 dias sin hacer = pierde racha */

        case 'cadaXDias': {
            const intervalo = frecuencia.cadaDias || 2;
            /* Dar margen de 1.5x el intervalo */
            return Math.ceil(intervalo * 1.5);
        }

        case 'semanal':
            return 10; /* Mas de una semana + 3 dias de gracia */

        case 'diasEspecificos': {
            const diasSemana = frecuencia.diasSemana || [];
            /* Si solo hay 1-2 dias, dar una semana + margen */
            if (diasSemana.length <= 2) return 10;
            /* Si hay mas dias, umbral mas estricto */
            return 7;
        }

        case 'mensual': {
            const vecesAlMes = frecuencia.vecesAlMes || 4;
            const diasEnMes = 30; /* Aproximado */
            const intervaloIdeal = Math.floor(diasEnMes / vecesAlMes);
            return Math.ceil(intervaloIdeal * 1.5);
        }

        default:
            return 7;
    }
}

/* Re-exports para compatibilidad */
export {esFechaRelevante, generarFechasRelevantes, esFechaRelevanteConHistorial} from './frecuenciaRelevancia';
export {describirFrecuencia, obtenerIntervaloFrecuencia, estaEnVentanaOportunidad} from './frecuenciaUI';

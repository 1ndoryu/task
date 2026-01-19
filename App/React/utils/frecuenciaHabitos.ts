/*
 * frecuenciaHabitos
 * Utilidades para calcular frecuencia y estado de habitos
 * Determina si un habito "toca hoy" y calcula dias hasta proxima repeticion
 */

import type {FrecuenciaHabito, DiaSemana} from '../types/dashboard';
import {obtenerFechaLocalISO, obtenerFechaEfectiva} from './fecha';

/* Mapeo de dia de semana (0=domingo, 6=sabado) a DiaSemana */
const DIAS_JS_A_DIASEMANA: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/*
 * Determina si un habito debe realizarse hoy basado en su frecuencia
 * y la fecha del ultimo completado
 */
export function tocaHoy(frecuencia: FrecuenciaHabito, ultimoCompletado?: string): boolean {
    /* Usamos obtenerFechaEfectiva para respetar la hora de fin del día */
    const hoy = obtenerFechaEfectiva();

    switch (frecuencia.tipo) {
        case 'diario':
            return true;

        case 'cadaXDias': {
            if (!ultimoCompletado) return true;

            const ultimaFecha = new Date(ultimoCompletado);
            ultimaFecha.setHours(0, 0, 0, 0);

            const diasTranscurridos = Math.floor((hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24));

            return diasTranscurridos >= (frecuencia.cadaDias || 2);
        }

        case 'semanal': {
            if (!ultimoCompletado) return true;

            const ultimaFecha = new Date(ultimoCompletado);
            ultimaFecha.setHours(0, 0, 0, 0);

            const diasTranscurridos = Math.floor((hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24));

            return diasTranscurridos >= 7;
        }

        case 'diasEspecificos': {
            const diaActual = DIAS_JS_A_DIASEMANA[hoy.getDay()];
            return (frecuencia.diasSemana || []).includes(diaActual);
        }

        case 'mensual': {
            if (!ultimoCompletado) return true;

            const ultimaFecha = new Date(ultimoCompletado);
            const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            const vecesAlMes = frecuencia.vecesAlMes || 4;

            /* Intervalo aproximado entre completados */
            const intervaloIdeal = Math.floor(diasEnMes / vecesAlMes);

            ultimaFecha.setHours(0, 0, 0, 0);

            const diasTranscurridos = Math.floor((hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24));

            return diasTranscurridos >= intervaloIdeal;
        }

        default:
            return true;
    }
}

/*
 * Calcula los dias restantes hasta la proxima repeticion
 * Retorna 0 si toca hoy, numero positivo si falta tiempo
 */
export function diasHastaProximaRepeticion(frecuencia: FrecuenciaHabito, ultimoCompletado?: string): number {
    if (tocaHoy(frecuencia, ultimoCompletado)) {
        return 0;
    }

    const hoy = obtenerFechaEfectiva();

    if (!ultimoCompletado) return 0;

    const ultimaFecha = new Date(ultimoCompletado);
    ultimaFecha.setHours(0, 0, 0, 0);

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

/*
 * Calcula el umbral de dias de inactividad para resetear racha
 * basado en la frecuencia del habito
 */
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

/*
 * Genera texto descriptivo de la frecuencia
 */
export function describirFrecuencia(frecuencia: FrecuenciaHabito): string {
    switch (frecuencia.tipo) {
        case 'diario':
            return 'Diario';

        case 'cadaXDias':
            return `Cada ${frecuencia.cadaDias || 2} dias`;

        case 'semanal':
            return 'Semanal';

        case 'diasEspecificos': {
            const dias = frecuencia.diasSemana || [];
            if (dias.length === 7) return 'Todos los dias';
            if (dias.length === 0) return 'Sin dias';

            const abreviaturas: Record<DiaSemana, string> = {
                lunes: 'L',
                martes: 'M',
                miercoles: 'X',
                jueves: 'J',
                viernes: 'V',
                sabado: 'S',
                domingo: 'D'
            };

            return dias.map(d => abreviaturas[d]).join(', ');
        }

        case 'mensual':
            return `${frecuencia.vecesAlMes || 4}x/mes`;

        default:
            return '';
    }
}

/*
 * Obtiene el intervalo numerico de la frecuencia para mostrar en UI compacta
 * Retorna null para frecuencias diarias (no necesitan indicador)
 */
export function obtenerIntervaloFrecuencia(frecuencia: FrecuenciaHabito): number | null {
    switch (frecuencia.tipo) {
        case 'diario':
            return null;

        case 'cadaXDias':
            return frecuencia.cadaDias || 2;

        case 'semanal':
            return 7;

        case 'diasEspecificos': {
            const dias = frecuencia.diasSemana || [];
            if (dias.length === 0 || dias.length === 7) return null;
            return dias.length;
        }

        case 'mensual':
            return frecuencia.vecesAlMes || 4;

        default:
            return null;
    }
}

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

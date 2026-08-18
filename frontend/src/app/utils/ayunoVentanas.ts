/*
 * ayunoVentanas
 * Utilidades para calcular ventanas de comida y próximos inicios de ayuno
 * Basado en la frecuencia del hábito asociado al plugin.
 */

import type {DiaSemana, FrecuenciaHabito} from '../types/dashboard';

const MS_DIA = 24 * 60 * 60 * 1000;

/* Mapeo de day() JS (0=domingo) a DiaSemana */
const DIAS_JS_A_DIASEMANA: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export function formatearDuracionAyuno(ms: number): string {
    const msSeguro = Math.max(0, ms);
    const totalSegundos = Math.floor(msSeguro / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    if (horas > 0) {
        return `${horas}h ${minutos.toString().padStart(2, '0')}m ${segundos.toString().padStart(2, '0')}s`;
    }
    return `${minutos}m ${segundos.toString().padStart(2, '0')}s`;
}

function obtenerDiasIntervaloFrecuencia(frecuencia: FrecuenciaHabito | undefined): number {
    if (!frecuencia) return 1;

    switch (frecuencia.tipo) {
        case 'diario':
            return 1;
        case 'cadaXDias':
            return Math.max(1, frecuencia.cadaDias ?? 2);
        case 'semanal':
            return 7;
        case 'mensual': {
            const veces = Math.max(1, frecuencia.vecesAlMes ?? 4);
            return Math.max(1, Math.floor(30 / veces));
        }
        case 'diasEspecificos':
            /* Se calcula dinámicamente (no es intervalo fijo) */
            return 1;
        default:
            return 1;
    }
}

export function calcularPeriodoAyunoMs(frecuencia: FrecuenciaHabito | undefined, referenciaMs?: number): number {
    if (frecuencia?.tipo === 'diasEspecificos') {
        const ref = referenciaMs ?? Date.now();
        const diasHasta = calcularDiasHastaProximoDiaEspecifico(ref, frecuencia.diasSemana ?? []);
        return Math.max(1, diasHasta) * MS_DIA;
    }

    const diasIntervalo = obtenerDiasIntervaloFrecuencia(frecuencia);
    return Math.max(1, diasIntervalo) * MS_DIA;
}

function calcularDiasHastaProximoDiaEspecifico(inicioAyunoMs: number, diasSemana: DiaSemana[]): number {
    if (!diasSemana || diasSemana.length === 0) return 1;

    const fechaInicio = new Date(inicioAyunoMs);
    const diaActualJs = fechaInicio.getDay();

    for (let i = 1; i <= 7; i++) {
        const diaProximoJs = (diaActualJs + i) % 7;
        const diaSemana = DIAS_JS_A_DIASEMANA[diaProximoJs];
        if (diasSemana.includes(diaSemana)) {
            return i;
        }
    }

    return 7;
}

/*
 * Calcula cuándo debería empezar el próximo ayuno según la frecuencia del hábito.
 * Se ancla al inicio del ayuno actual/último (misma hora del día).
 */
export function calcularInicioProximoAyunoMsDesdeFin(finAyunoMs: number, duracionObjetivoMs: number, frecuencia: FrecuenciaHabito | undefined): number {
    const periodoMs = calcularPeriodoAyunoMs(frecuencia, finAyunoMs);
    const ventanaComidaMs = Math.max(0, periodoMs - Math.max(0, duracionObjetivoMs));
    return finAyunoMs + ventanaComidaMs;
}

export function calcularVentanaComidaMs(params: {finAyunoMs: number; duracionObjetivoMs: number; frecuencia: FrecuenciaHabito | undefined}): {
    inicioVentanaComidaMs: number;
    finVentanaComidaMs: number;
    duracionVentanaComidaMs: number;
    inicioProximoAyunoMs: number;
    periodoMs: number;
} {
    const inicioVentanaComidaMs = params.finAyunoMs;
    const periodoMs = calcularPeriodoAyunoMs(params.frecuencia, params.finAyunoMs);
    const duracionVentanaComidaMs = Math.max(0, periodoMs - Math.max(0, params.duracionObjetivoMs));
    const finVentanaComidaMs = inicioVentanaComidaMs + duracionVentanaComidaMs;
    const inicioProximoAyunoMs = finVentanaComidaMs;

    return {
        inicioVentanaComidaMs,
        finVentanaComidaMs,
        duracionVentanaComidaMs,
        inicioProximoAyunoMs,
        periodoMs
    };
}

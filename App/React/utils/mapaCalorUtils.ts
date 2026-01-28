/**
 * Utilidades para el componente MapaCalorHabito
 * @package App/React/utils
 */

import {obtenerFechaLocalISO, obtenerFechaEfectiva, obtenerFechaHoy} from './fecha';
import {FrecuenciaHabito} from '../types/dashboard';
import {esFechaRelevante} from './frecuenciaHabitos';

/* Nombres de días de la semana abreviados */
export const DIAS_SEMANA_COMPLETO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_SEMANA_CORTO = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/* Nombres de meses abreviados */
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Genera un array de fechas para el período indicado
 */
export function generarFechasPeriodo(dias: number): string[] {
    const fechas: string[] = [];
    /* Usamos obtenerFechaEfectiva para respetar la hora de fin del día */
    const hoy = obtenerFechaEfectiva();

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
export function agruparPorSemanas(fechas: string[]): string[][] {
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
export function formatearFechaTooltip(fecha: string): string {
    const date = new Date(fecha + 'T12:00:00');
    const dia = date.getDate();
    const mes = MESES[date.getMonth()];
    const diaSemana = DIAS_SEMANA_COMPLETO[date.getDay()];
    return `${diaSemana}, ${dia} ${mes}`;
}

/**
 * Verifica si una fecha es hoy (respeta hora de fin del día)
 */
export function esHoy(fecha: string): boolean {
    return fecha === obtenerFechaHoy();
}

/**
 * Verifica si una fecha es editable (puede ser hoy o pasado, no futuro)
 */
export function esEditable(fecha: string): boolean {
    /* Usamos obtenerFechaEfectiva para respetar la hora de fin del día */
    const hoy = obtenerFechaEfectiva();
    const fechaDate = new Date(fecha + 'T12:00:00');
    return fechaDate <= hoy;
}

/**
 * Calcula si un día es relevante según la frecuencia del hábito
 */
export function calcularRelevanciaDia(fecha: string, frecuencia: FrecuenciaHabito | undefined, fechasCompletadas: string[]): boolean {
    if (!frecuencia) return true;

    /* Para 'diario': todos los días son relevantes */
    if (frecuencia.tipo === 'diario') return true;

    if (frecuencia.tipo === 'diasEspecificos') {
        /* diasEspecificos: verificar si el día de la semana está en la lista */
        return esFechaRelevante(fecha, frecuencia);
    }

    if (frecuencia.tipo === 'cadaXDias' || frecuencia.tipo === 'semanal' || frecuencia.tipo === 'mensual') {
        /* Para intervalos: buscar el día completado más cercano anterior */
        const fechaDate = new Date(fecha + 'T12:00:00');
        const intervalo = frecuencia.tipo === 'semanal' ? 7 : frecuencia.tipo === 'cadaXDias' ? frecuencia.cadaDias || 2 : Math.floor(30 / (frecuencia.vecesAlMes || 4));

        if (fechasCompletadas.length > 0) {
            /* Encontrar la fecha completada más cercana ANTES o IGUAL a esta fecha */
            /* Asumimos que fechasCompletadas está ordenado */
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
                return diffDias === 0 || diffDias >= intervalo;
            }
        }
    }

    return true;
}

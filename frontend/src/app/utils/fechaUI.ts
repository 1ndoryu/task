/*
 * Utilidades de Fecha - UI
 * [H-F15-01] Funciones de presentacion y formateo de fechas para la interfaz.
 * Las fechas rápidas de modales viven en fechasRapidas.ts (se re-exportan).
 */

import {obtenerFechaEfectiva} from './fecha';

/*
 * Informacion de urgencia para fechas limite
 */
export interface InfoUrgenciaFecha {
    diasRestantes: number;
    esUrgente: boolean;
    vencida: boolean;
    esHoy: boolean;
    esMañana: boolean;
}

/*
 * Calcula la urgencia de una fecha limite
 * Retorna null si no hay fecha
 * Respeta la configuración de hora de fin del día.
 */
export function calcularUrgenciaFechaLimite(fechaLimite: string | undefined): InfoUrgenciaFecha | null {
    if (!fechaLimite) return null;

    const hoy = obtenerFechaEfectiva();
    const fecha = new Date(fechaLimite + 'T00:00:00');
    fecha.setHours(0, 0, 0, 0);

    const diferencia = fecha.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    return {
        diasRestantes,
        esUrgente: diasRestantes <= 3 && diasRestantes >= 0,
        vencida: diasRestantes < 0,
        esHoy: diasRestantes === 0,
        esMañana: diasRestantes === 1
    };
}

/*
 * Formatea una fecha en formato corto (ej: "20 dic")
 */
export function formatearFechaCorta(fechaIso: string): string {
    const fecha = new Date(fechaIso + 'T12:00:00');
    const dia = fecha.getDate();
    const mes = fecha.toLocaleDateString('es-ES', {month: 'short'});
    return `${dia} ${mes}`;
}

/*
 * Obtiene el texto descriptivo para una fecha limite
 * Incluye indicadores como "Hoy", "Mañana", "Vencida"
 */
export function obtenerTextoFechaLimite(fechaIso: string | undefined): string {
    const info = calcularUrgenciaFechaLimite(fechaIso);
    if (!info || !fechaIso) return '';

    if (info.vencida) {
        const diasVencida = Math.abs(info.diasRestantes);
        return `Vencida (${diasVencida}d)`;
    }
    if (info.esHoy) return 'Hoy';
    if (info.esMañana) return 'Mañana';

    return formatearFechaCorta(fechaIso);
}

/*
 * Determina la variante visual para un badge de fecha
 * Retorna: 'urgente' si vencida, 'advertencia' si es hoy o urgente, 'normal' en otro caso
 */
export type VarianteFechaLimite = 'urgente' | 'advertencia' | 'exito' | 'normal';

export function obtenerVarianteFechaLimite(fechaIso: string | undefined): VarianteFechaLimite {
    const info = calcularUrgenciaFechaLimite(fechaIso);
    if (!info) return 'normal';

    if (info.vencida) return 'urgente';
    if (info.esHoy) return 'advertencia';
    if (info.esUrgente) return 'advertencia';

    return 'normal';
}

/*
 * Formatea una fecha en formato relativo (ej: "hace 2 días", "hace 1 semana")
 * Util para mostrar cuando ocurrio algo
 */
export function formatearFechaRelativa(fechaIso: string | null | undefined): string {
    if (!fechaIso) return '';

    const fecha = new Date(fechaIso);
    const ahora = new Date();
    const diferenciaSeg = Math.floor((ahora.getTime() - fecha.getTime()) / 1000);

    if (diferenciaSeg < 60) return 'hace un momento';
    if (diferenciaSeg < 3600) {
        const minutos = Math.floor(diferenciaSeg / 60);
        return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    }
    if (diferenciaSeg < 86400) {
        const horas = Math.floor(diferenciaSeg / 3600);
        return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    }
    if (diferenciaSeg < 604800) {
        const dias = Math.floor(diferenciaSeg / 86400);
        return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }
    if (diferenciaSeg < 2592000) {
        const semanas = Math.floor(diferenciaSeg / 604800);
        return `hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
    }

    const meses = Math.floor(diferenciaSeg / 2592000);
    return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}

/* [H-F15-01] Fechas rápidas de modales: fechasRapidas.ts */
export {calcularFechaDesdeKey, calcularFechaDesdeOpcion} from './fechasRapidas';
export type {ClaveFechaRapida} from './fechasRapidas';

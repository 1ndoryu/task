/*
 * Utilidades de Fecha - UI
 * Funciones de presentacion y formateo de fechas para la interfaz
 * Separadas del modulo core para respetar SRP y limites de lineas
 */

import {obtenerFechaLocalISO, obtenerFechaEfectiva} from './fecha';

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

/*
 * Claves de fecha rapida usadas en modales de creacion
 * 'hoy' | 'manana' | 'semana'
 */
export type ClaveFechaRapida = 'hoy' | 'manana' | 'semana';

/*
 * Convierte una clave de fecha rapida a fecha ISO (YYYY-MM-DD)
 * Usado por modales de creacion rapida para calcular fechas desde opciones predefinidas
 *
 * @param clave - La clave de fecha rapida ('hoy', 'manana', 'semana')
 * @returns Fecha en formato ISO o undefined si la clave no es valida
 */
export function calcularFechaDesdeKey(clave: string | undefined): string | undefined {
    if (!clave) return undefined;

    const hoy = new Date();

    switch (clave) {
        case 'hoy':
            return obtenerFechaLocalISO(hoy);
        case 'manana': {
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);
            return obtenerFechaLocalISO(manana);
        }
        case 'semana': {
            const semana = new Date(hoy);
            semana.setDate(semana.getDate() + 7);
            return obtenerFechaLocalISO(semana);
        }
        default:
            /* [253A-9] Si es una fecha ISO (YYYY-MM-DD), pasarla directamente */
            if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) return clave;
            return undefined;
    }
}

/*
 * Calcular fecha real desde opcion rapida de fecha
 * Usado en BottomSheets para conversion de shortcuts a fechas ISO
 * Opciones: 'hoy', 'manana', 'semana', 'mes', 'trimestre', 'ano'
 */
export function calcularFechaDesdeOpcion(opcion: string): string {
    const hoy = new Date();
    switch (opcion) {
        case 'hoy':
            return obtenerFechaLocalISO(hoy);
        case 'manana': {
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);
            return obtenerFechaLocalISO(manana);
        }
        case 'semana': {
            const finSemana = new Date(hoy);
            finSemana.setDate(finSemana.getDate() + (7 - finSemana.getDay()));
            return obtenerFechaLocalISO(finSemana);
        }
        case 'mes': {
            const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
            return obtenerFechaLocalISO(finMes);
        }
        case 'trimestre': {
            const mesActual = hoy.getMonth();
            const finTrimestre = new Date(hoy.getFullYear(), Math.floor(mesActual / 3 + 1) * 3, 0);
            return obtenerFechaLocalISO(finTrimestre);
        }
        case 'ano': {
            const finAno = new Date(hoy.getFullYear(), 11, 31);
            return obtenerFechaLocalISO(finAno);
        }
        default:
            return opcion;
    }
}

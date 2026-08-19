/*
 * utils/fechasRapidas.ts
 * [H-F15-01] Claves y conversión de fechas rápidas de modales de creación
 * (extraído de fechaUI.ts).
 */

import {obtenerFechaLocalISO} from './fecha';

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

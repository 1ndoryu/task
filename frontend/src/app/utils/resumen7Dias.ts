/*
 * utils/resumen7Dias.ts
 * [H-F15-01] Resumen de los últimos 7 días de un hábito (extraído de
 * habitosLogica.ts).
 */

import type {Habito} from '../types/dashboard';
import type {DiaHistorial, EstadoHabito} from '../types/historialHabitos';
import {obtenerFechaLocalISO, obtenerFechaEfectiva} from './fecha';

/**
 * Genera el resumen de los últimos 7 días
 */
export function generarResumen7Dias(habito: Habito): DiaHistorial[] {
    const dias: DiaHistorial[] = [];
    /* Usamos obtenerFechaEfectiva para respetar la hora de fin del día */
    const hoy = obtenerFechaEfectiva();
    const diasSemana = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

    for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = obtenerFechaLocalISO(fecha);

        let estado: EstadoHabito | null = null;
        if (habito.historialCompletados?.includes(fechaStr)) {
            estado = 'completado';
        } else if (habito.historialPospuestos?.includes(fechaStr)) {
            estado = 'pospuesto';
        }

        dias.push({
            fecha: fechaStr,
            diaSemana: diasSemana[fecha.getDay()],
            estado,
            esHoy: i === 0
        });
    }

    return dias;
}

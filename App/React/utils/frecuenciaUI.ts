/*
 * frecuenciaUI
 * Utilidades de presentacion para frecuencia de habitos
 * Texto descriptivo e intervalos para mostrar en UI
 */

import type {FrecuenciaHabito, DiaSemana, Habito} from '../types/dashboard';

/* Genera texto descriptivo de la frecuencia */
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

/* Comprueba si un hábito está en su ventana de oportunidad actual */
export function estaEnVentanaOportunidad(habito: Habito): boolean {
    if (!habito.ventanaOportunidad || !habito.ventanaOportunidad.habilitada) return false;
    const ahora = new Date();
    const totalActual = ahora.getHours() * 60 + ahora.getMinutes();
    const {horaInicio, minutoInicio, horaFin, minutoFin} = habito.ventanaOportunidad;
    const totalInicio = horaInicio * 60 + minutoInicio;
    const totalFin = horaFin * 60 + minutoFin;
    if (totalInicio <= totalFin) {
        return totalActual >= totalInicio && totalActual <= totalFin;
    }
    /* Caso cruza medianoche (ej: 22:00 a 06:00) */
    return totalActual >= totalInicio || totalActual <= totalFin;
}

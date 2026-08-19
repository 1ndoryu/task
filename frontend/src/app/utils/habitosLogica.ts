/**
 * Lógica de negocio pura para Hábitos
 * Extraída de habitosStore.ts para cumplir SRP
 */

import type {Habito} from '../types/dashboard';
import {calcularDiasDesde} from './fecha';

/**
 * Calcula el nuevo estado al hacer toggle (completar/desmarcar)
 */
export function calcularToggleHabito(
    habito: Habito,
    hoy: string,
    estabaCompletadoHoy: boolean
): {
    accion: 'completado' | 'desmarcado';
    nuevoHabito: Habito;
} {
    if (estabaCompletadoHoy) {
        /* Desmarcar */
        const historialSinHoy = (habito.historialCompletados || []).filter(f => f !== hoy);
        const ultimoAnterior = historialSinHoy.length > 0 ? historialSinHoy[historialSinHoy.length - 1] : undefined;
        const diasInactividadCalculado = ultimoAnterior ? calcularDiasDesde(ultimoAnterior) : calcularDiasDesde(habito.fechaCreacion);

        return {
            accion: 'desmarcado',
            nuevoHabito: {
                ...habito,
                diasInactividad: diasInactividadCalculado,
                racha: Math.max(0, habito.racha - 1),
                ultimoCompletado: ultimoAnterior,
                historialCompletados: historialSinHoy
            }
        };
    } else {
        /* Completar */
        const diasDesdeUltimo = calcularDiasDesde(habito.ultimoCompletado);
        const nuevaRacha = diasDesdeUltimo <= 1 ? habito.racha + 1 : 1;
        const nuevoHistorial = [...(habito.historialCompletados || []), hoy].slice(-365);

        return {
            accion: 'completado',
            nuevoHabito: {
                ...habito,
                diasInactividad: 0,
                racha: nuevaRacha,
                ultimoCompletado: hoy,
                historialCompletados: nuevoHistorial
            }
        };
    }
}

/**
 * Calcula el nuevo estado al posponer
 */
export function calcularPosponerHabito(
    habito: Habito,
    hoy: string,
    estabaPospuestoHoy: boolean
): {
    accion: 'pospuesto' | 'despospuesto';
    nuevoHabito: Habito;
} {
    if (estabaPospuestoHoy) {
        /* Quitar pospuesto — también limpiar pospuestoHasta si existe */
        const {pospuestoHasta: _, ...resto} = habito;
        return {
            accion: 'despospuesto',
            nuevoHabito: {
                ...resto,
                historialPospuestos: (habito.historialPospuestos || []).filter(f => f !== hoy)
            } as Habito
        };
    } else {
        /* Posponer */
        const nuevoHistorialPospuestos = [...(habito.historialPospuestos || []), hoy].slice(-90);

        return {
            accion: 'pospuesto',
            nuevoHabito: {
                ...habito,
                historialPospuestos: nuevoHistorialPospuestos
            }
        };
    }
}

/**
 * Calcula el nuevo estado al pausar/reanudar
 */
export function calcularPausarHabito(
    habito: Habito,
    hoy: string,
    estaPausado: boolean
): {
    accion: 'pausado' | 'reanudado';
    nuevoHabito: Habito;
} {
    if (estaPausado) {
        /* Reanudar */
        return {
            accion: 'reanudado',
            nuevoHabito: {
                ...habito,
                pausado: false,
                fechaPausa: undefined
            }
        };
    } else {
        /* Pausar */
        return {
            accion: 'pausado',
            nuevoHabito: {
                ...habito,
                pausado: true,
                fechaPausa: hoy
            }
        };
    }
}

/* [H-F15-01] Resumen de 7 días: resumen7Dias.ts */
export {generarResumen7Dias} from './resumen7Dias';

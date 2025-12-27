/**
 * Tipos para el historial de habitos
 *
 * Estos tipos se comparten entre:
 * - hooks/useHabitosHistorial.ts
 * - services/historialHabitosStore.ts
 *
 * @package App/React/types
 */

export type EstadoHabito = 'completado' | 'pospuesto' | 'omitido';

export interface DiaHistorial {
    fecha: string;
    diaSemana: string;
    estado: EstadoHabito | null;
    esHoy: boolean;
}

export interface HistorialHabito {
    [fecha: string]: {
        estado: EstadoHabito;
        notas: string | null;
        fechaRegistro: string;
    };
}

export interface EstadisticasHabito {
    completados: number;
    pospuestos: number;
    omitidos: number;
    total: number;
    porcentajeCumplimiento: number;
    dias: number;
}

export interface HistorialMultiple {
    [habitoId: number]: {
        [fecha: string]: EstadoHabito;
    };
}

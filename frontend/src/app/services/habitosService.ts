/* [18-08-2026] habitosService contra /api/habits/:id/history (backend Rust).
 * Se mapea {habitId, history, summary7Days, stats} a {historial, resumen7Dias,
 * estadisticas} del front original. Sesion por cookie HttpOnly + CSRF. */
import type {HistorialHabito, EstadisticasHabito, DiaHistorial} from '../types/historialHabitos';
import {apiFetch} from '../utils/apiClient';

interface EntradaHistorialRust {
    date: string;
    status: string;
    notes: string | null;
    recordedAt: string;
}

interface DiaResumenRust {
    date: string;
    weekday: number;
    status: string | null;
    isToday: boolean;
}

interface EstadisticasRust {
    completed: number;
    postponed: number;
    skipped: number;
    total: number;
    completionRate: number;
    days: number;
}

interface HistorialRust {
    habitId: number;
    history: EntradaHistorialRust[];
    summary7Days: DiaResumenRust[];
    stats: EstadisticasRust;
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function mapearHistorial(datos: HistorialRust): HistorialHabito {
    const historial: HistorialHabito = {};
    for (const entrada of datos.history || []) {
        historial[entrada.date] = {
            estado: entrada.status as HistorialHabito[string]['estado'],
            notas: entrada.notes,
            fechaRegistro: entrada.recordedAt
        };
    }
    return historial;
}

function mapearResumen(datos: HistorialRust): DiaHistorial[] {
    return (datos.summary7Days || []).map((dia): DiaHistorial => ({
        fecha: dia.date,
        diaSemana: DIAS_SEMANA[dia.weekday] ?? String(dia.weekday),
        estado: (dia.status ?? null) as DiaHistorial['estado'],
        esHoy: dia.isToday
    }));
}

function mapearEstadisticas(datos: HistorialRust): EstadisticasHabito | null {
    if (!datos.stats) return null;
    return {
        completados: datos.stats.completed,
        pospuestos: datos.stats.postponed,
        omitidos: datos.stats.skipped,
        total: datos.stats.total,
        porcentajeCumplimiento: datos.stats.completionRate,
        dias: datos.stats.days
    };
}

export const habitosService = {
    /**
     * Marca un día con un estado específico (completado, pospuesto, etc)
     */
    async marcarDia(habitoId: number, fecha: string, estado: string | null): Promise<boolean> {
        await apiFetch<HistorialRust>(`/habits/${habitoId}/history`, {
            method: 'PUT',
            body: JSON.stringify({
                date: fecha,
                status: estado || 'completado',
                notes: null
            })
        });
        return true;
    },

    /**
     * Elimina el registro de un día (desmarcar)
     */
    async desmarcarDia(habitoId: number, fecha: string): Promise<boolean> {
        await apiFetch<HistorialRust>(`/habits/${habitoId}/history/${fecha}`, {
            method: 'DELETE'
        });
        return true;
    },

    /**
     * Obtiene el historial detallado, resumen y estadísticas
     */
    async obtenerHistorialDetallado(habitoId: number, dias: number): Promise<{historial: HistorialHabito; resumen7Dias: DiaHistorial[]; estadisticas: EstadisticasHabito | null}> {
        const datos = await apiFetch<HistorialRust>(`/habits/${habitoId}/history?days=${dias}`);

        return {
            historial: mapearHistorial(datos),
            resumen7Dias: mapearResumen(datos),
            estadisticas: mapearEstadisticas(datos)
        };
    }
};

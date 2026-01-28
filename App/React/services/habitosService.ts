/**
 * Servicio de Hábitos
 * Maneja la comunicación con la API para operaciones de hábitos
 */
import type {HistorialHabito, EstadisticasHabito, DiaHistorial} from '../types/historialHabitos';

function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

export const habitosService = {
    /**
     * Marca un día con un estado específico (completado, pospuesto, etc)
     */
    async marcarDia(habitoId: number, fecha: string, estado: string | null): Promise<boolean> {
        const response = await fetch(`/wp-json/glory/v1/habitos/${habitoId}/historial`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': obtenerNonce()
            },
            body: JSON.stringify({fecha, estado})
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Error al marcar día');
        }
        return true;
    },

    /**
     * Elimina el registro de un día (desmarcar)
     */
    async desmarcarDia(habitoId: number, fecha: string): Promise<boolean> {
        const response = await fetch(`/wp-json/glory/v1/habitos/${habitoId}/historial/${fecha}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': obtenerNonce()
            }
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Error al desmarcar día');
        }

        return true;
    },

    /**
     * Obtiene el historial detallado, resumen y estadísticas
     */
    async obtenerHistorialDetallado(habitoId: number, dias: number): Promise<{historial: HistorialHabito; resumen7Dias: DiaHistorial[]; estadisticas: EstadisticasHabito | null}> {
        const response = await fetch(`/wp-json/glory/v1/habitos/${habitoId}/historial?dias=${dias}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': obtenerNonce()
            }
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Error al cargar historial');
        }

        return {
            historial: data.historial,
            resumen7Dias: data.resumen7Dias,
            estadisticas: data.estadisticas
        };
    }
};

/*
 * Herramientas MCP para gestión de Hábitos
 * Incluye: listar hábitos
 */

import {z} from 'zod';
import {gloryClient} from '../api/gloryClient.js';

/* Esquemas Zod para validación */
export const obtenerHabitosSchema = z.object({
    importancia: z.enum(['Alta', 'Media', 'Baja']).optional().describe('Filtrar por importancia')
});

/* Handlers */

export async function handleObtenerHabitos(args: z.infer<typeof obtenerHabitosSchema>) {
    const dashboard = await gloryClient.obtenerDashboard();
    let habitos = dashboard.habitos || [];

    if (args.importancia) {
        habitos = habitos.filter(h => h.importancia === args.importancia);
    }

    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(
                    {
                        total: habitos.length,
                        filtro: args.importancia || 'todos',
                        habitos: habitos.map(h => ({
                            id: h.id,
                            nombre: h.nombre,
                            importancia: h.importancia,
                            racha: h.racha,
                            diasInactividad: h.diasInactividad,
                            frecuencia: h.frecuencia?.tipo || 'diario',
                            ultimoCompletado: h.ultimoCompletado,
                            tags: h.tags
                        }))
                    },
                    null,
                    2
                )
            }
        ]
    };
}

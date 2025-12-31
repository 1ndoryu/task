/*
 * Herramientas MCP para gestión de Proyectos
 * Incluye: listar proyectos y obtener detalles
 */

import {z} from 'zod';
import {gloryClient} from '../api/gloryClient.js';

/* Esquemas Zod para validación */
export const obtenerProyectosSchema = z.object({
    estado: z.enum(['activo', 'completado', 'pausado', 'todos']).optional().describe('Filtrar por estado')
});

export const obtenerProyectoSchema = z.object({
    id: z.number().describe('ID del proyecto')
});

/* Handlers */

export async function handleObtenerProyectos(args: z.infer<typeof obtenerProyectosSchema>) {
    const dashboard = await gloryClient.obtenerDashboard();
    let proyectos = dashboard.proyectos || [];

    if (args.estado && args.estado !== 'todos') {
        proyectos = proyectos.filter(p => p.estado === args.estado);
    }

    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(
                    {
                        total: proyectos.length,
                        filtro: args.estado || 'todos',
                        proyectos: proyectos.map(p => ({
                            id: p.id,
                            nombre: p.nombre,
                            descripcion: p.descripcion,
                            estado: p.estado,
                            prioridad: p.prioridad,
                            urgencia: p.urgencia,
                            progreso: p.progreso,
                            fechaLimite: p.fechaLimite
                        }))
                    },
                    null,
                    2
                )
            }
        ]
    };
}

export async function handleObtenerProyecto(args: z.infer<typeof obtenerProyectoSchema>) {
    const dashboard = await gloryClient.obtenerDashboard();
    const proyectos = dashboard.proyectos || [];
    const proyecto = proyectos.find(p => p.id === args.id);

    if (!proyecto) {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: `Error: No se encontró el proyecto con ID ${args.id}`
                }
            ],
            isError: true
        };
    }

    /* Obtener tareas del proyecto */
    const tareasProyecto = await gloryClient.obtenerTareasProyecto(args.id);

    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(
                    {
                        ...proyecto,
                        tareas: {
                            total: tareasProyecto.length,
                            completadas: tareasProyecto.filter(t => t.completado).length,
                            pendientes: tareasProyecto.filter(t => !t.completado).length,
                            lista: tareasProyecto.map(t => ({
                                id: t.id,
                                texto: t.texto,
                                completado: t.completado
                            }))
                        }
                    },
                    null,
                    2
                )
            }
        ]
    };
}

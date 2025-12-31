/*
 * Herramientas MCP para gestión de Tareas
 * Incluye: listar, crear, editar, completar y eliminar tareas
 */

import {z} from 'zod';
import {gloryClient} from '../api/gloryClient.js';

/* Esquemas Zod para validación de parámetros */
export const obtenerTareasSchema = z.object({
    filtro: z.enum(['pendientes', 'completadas', 'todas']).optional().describe('Filtrar tareas por estado')
});

export const obtenerTareasProyectoSchema = z.object({
    proyectoId: z.number().describe('ID del proyecto')
});

export const obtenerTareaSchema = z.object({
    id: z.number().describe('ID de la tarea')
});

export const crearTareaSchema = z.object({
    texto: z.string().describe('Texto/título de la tarea'),
    proyectoId: z.number().optional().describe('ID del proyecto (opcional)'),
    prioridad: z.enum(['alta', 'media', 'baja']).optional().describe('Nivel de prioridad'),
    urgencia: z.enum(['bloqueante', 'urgente', 'normal', 'chill']).optional().describe('Nivel de urgencia'),
    fechaMaxima: z.string().optional().describe('Fecha límite en formato ISO'),
    tags: z.array(z.string()).optional().describe('Etiquetas de la tarea')
});

export const editarTareaSchema = z.object({
    id: z.number().describe('ID de la tarea a editar'),
    texto: z.string().optional().describe('Nuevo texto de la tarea'),
    prioridad: z.enum(['alta', 'media', 'baja']).nullable().optional().describe('Nueva prioridad (null para eliminar)'),
    urgencia: z.enum(['bloqueante', 'urgente', 'normal', 'chill']).nullable().optional().describe('Nueva urgencia'),
    proyectoId: z.number().optional().describe('Nuevo proyecto'),
    tags: z.array(z.string()).optional().describe('Nuevas etiquetas')
});

export const completarTareaSchema = z.object({
    id: z.number().describe('ID de la tarea a completar/descompletar')
});

export const eliminarTareaSchema = z.object({
    id: z.number().describe('ID de la tarea a eliminar')
});

/* Handlers de las herramientas */

export async function handleObtenerTareas(args: z.infer<typeof obtenerTareasSchema>) {
    const filtro = args.filtro || 'todas';
    const tareas = await gloryClient.obtenerTareasFiltradas(filtro);

    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(
                    {
                        total: tareas.length,
                        filtro,
                        tareas: tareas.map(t => ({
                            id: t.id,
                            texto: t.texto,
                            completado: t.completado,
                            prioridad: t.prioridad,
                            urgencia: t.urgencia,
                            proyectoId: t.proyectoId,
                            fechaMaxima: t.configuracion?.fechaMaxima,
                            tags: t.tags
                        }))
                    },
                    null,
                    2
                )
            }
        ]
    };
}

export async function handleObtenerTareasProyecto(args: z.infer<typeof obtenerTareasProyectoSchema>) {
    const tareas = await gloryClient.obtenerTareasProyecto(args.proyectoId);

    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(
                    {
                        proyectoId: args.proyectoId,
                        total: tareas.length,
                        tareas: tareas.map(t => ({
                            id: t.id,
                            texto: t.texto,
                            completado: t.completado,
                            prioridad: t.prioridad,
                            urgencia: t.urgencia
                        }))
                    },
                    null,
                    2
                )
            }
        ]
    };
}

export async function handleObtenerTarea(args: z.infer<typeof obtenerTareaSchema>) {
    const tarea = await gloryClient.obtenerTarea(args.id);

    if (!tarea) {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: `Error: No se encontró la tarea con ID ${args.id}`
                }
            ],
            isError: true
        };
    }

    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(tarea, null, 2)
            }
        ]
    };
}

export async function handleCrearTarea(args: z.infer<typeof crearTareaSchema>) {
    const nuevaTarea = await gloryClient.crearTarea({
        texto: args.texto,
        prioridad: args.prioridad,
        urgencia: args.urgencia,
        proyectoId: args.proyectoId,
        configuracion: args.fechaMaxima ? {fechaMaxima: args.fechaMaxima} : undefined,
        tags: args.tags
    });

    return {
        content: [
            {
                type: 'text' as const,
                text: `✓ Tarea creada exitosamente:\n${JSON.stringify(nuevaTarea, null, 2)}`
            }
        ]
    };
}

export async function handleEditarTarea(args: z.infer<typeof editarTareaSchema>) {
    const tareaActualizada = await gloryClient.editarTarea(args.id, {
        texto: args.texto,
        prioridad: args.prioridad,
        urgencia: args.urgencia,
        proyectoId: args.proyectoId,
        tags: args.tags
    });

    if (!tareaActualizada) {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: `Error: No se encontró la tarea con ID ${args.id}`
                }
            ],
            isError: true
        };
    }

    return {
        content: [
            {
                type: 'text' as const,
                text: `✓ Tarea actualizada:\n${JSON.stringify(tareaActualizada, null, 2)}`
            }
        ]
    };
}

export async function handleCompletarTarea(args: z.infer<typeof completarTareaSchema>) {
    const tarea = await gloryClient.toggleCompletarTarea(args.id);

    if (!tarea) {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: `Error: No se encontró la tarea con ID ${args.id}`
                }
            ],
            isError: true
        };
    }

    const estado = tarea.completado ? 'completada' : 'pendiente';
    return {
        content: [
            {
                type: 'text' as const,
                text: `✓ Tarea marcada como ${estado}: "${tarea.texto}"`
            }
        ]
    };
}

export async function handleEliminarTarea(args: z.infer<typeof eliminarTareaSchema>) {
    const eliminada = await gloryClient.eliminarTarea(args.id);

    if (!eliminada) {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: `Error: No se encontró la tarea con ID ${args.id}`
                }
            ],
            isError: true
        };
    }

    return {
        content: [
            {
                type: 'text' as const,
                text: `✓ Tarea eliminada exitosamente (ID: ${args.id})`
            }
        ]
    };
}

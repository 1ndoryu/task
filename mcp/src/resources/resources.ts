/*
 * Recursos MCP (solo lectura)
 * Provee datos del dashboard como recursos accesibles
 */

import {gloryClient} from '../api/gloryClient.js';

/* Handlers para recursos */

export async function handleRecursoTareas(uri: string) {
    const tareas = await gloryClient.obtenerTareas();

    /* URI: tareas://pendientes o tareas://todas */
    const esPendientes = uri.includes('pendientes');
    const tareasFiltradas = esPendientes ? tareas.filter(t => !t.completado) : tareas;

    return {
        contents: [
            {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(tareasFiltradas, null, 2)
            }
        ]
    };
}

export async function handleRecursoProyectos() {
    const dashboard = await gloryClient.obtenerDashboard();
    const proyectos = dashboard.proyectos || [];

    return {
        contents: [
            {
                uri: 'proyectos://todos',
                mimeType: 'application/json',
                text: JSON.stringify(proyectos, null, 2)
            }
        ]
    };
}

export async function handleRecursoHabitos() {
    const dashboard = await gloryClient.obtenerDashboard();
    const habitos = dashboard.habitos || [];

    return {
        contents: [
            {
                uri: 'habitos://todos',
                mimeType: 'application/json',
                text: JSON.stringify(habitos, null, 2)
            }
        ]
    };
}

/* Lista de recursos disponibles */
export const listaRecursos = [
    {
        uri: 'tareas://todas',
        name: 'Todas las Tareas',
        description: 'Lista completa de tareas (pendientes y completadas)',
        mimeType: 'application/json'
    },
    {
        uri: 'tareas://pendientes',
        name: 'Tareas Pendientes',
        description: 'Solo tareas pendientes de completar',
        mimeType: 'application/json'
    },
    {
        uri: 'proyectos://todos',
        name: 'Todos los Proyectos',
        description: 'Lista de todos los proyectos',
        mimeType: 'application/json'
    },
    {
        uri: 'habitos://todos',
        name: 'Todos los Hábitos',
        description: 'Lista de todos los hábitos',
        mimeType: 'application/json'
    }
];

/*
 * Herramientas MCP para Dashboard/Resumen
 * Incluye: estadísticas generales
 */

import {gloryClient} from '../api/gloryClient.js';

/* Handler para resumen del dashboard */

export async function handleResumenDashboard() {
    const dashboard = await gloryClient.obtenerDashboard();

    const tareas = dashboard.tareas || [];
    const proyectos = dashboard.proyectos || [];
    const habitos = dashboard.habitos || [];

    const tareasCompletas = tareas.filter(t => t.completado).length;
    const tareasPendientes = tareas.filter(t => !t.completado).length;
    const tareasUrgentes = tareas.filter(t => !t.completado && (t.urgencia === 'urgente' || t.urgencia === 'bloqueante')).length;
    const tareasConFechaLimite = tareas.filter(t => !t.completado && t.configuracion?.fechaMaxima).length;

    const proyectosActivos = proyectos.filter(p => p.estado === 'activo').length;
    const proyectosPausados = proyectos.filter(p => p.estado === 'pausado').length;
    const proyectosCompletados = proyectos.filter(p => p.estado === 'completado').length;

    const habitosAlta = habitos.filter(h => h.importancia === 'Alta').length;
    const rachaPromedio = habitos.length > 0 ? Math.round(habitos.reduce((sum, h) => sum + h.racha, 0) / habitos.length) : 0;

    /* SOLO ESTADISTICAS - Sin incluir listas de datos para evitar bloqueos */
    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(
                    {
                        resumen: {
                            tareas: {
                                total: tareas.length,
                                completadas: tareasCompletas,
                                pendientes: tareasPendientes,
                                urgentes: tareasUrgentes,
                                conFechaLimite: tareasConFechaLimite
                            },
                            proyectos: {
                                total: proyectos.length,
                                activos: proyectosActivos,
                                pausados: proyectosPausados,
                                completados: proyectosCompletados
                            },
                            habitos: {
                                total: habitos.length,
                                altaImportancia: habitosAlta,
                                rachaPromedio
                            }
                        },
                        mensaje: 'Para ver detalles especificos, usa obtener_tareas, obtener_proyectos u obtener_habitos'
                    },
                    null,
                    2
                )
            }
        ]
    };
}

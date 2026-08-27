/*
 * config/ejecucionIA.ts
 * [H-F15-01] Ejecución de acciones IA: validación y despacho a los ejecutores
 * del dashboard, incluida la confirmación de destructivas (de accionesIA.ts).
 */

import type {DatosEdicionTarea} from '../types/dashboard';
import {useHabitosStore} from '../stores/habitosStore';
import {useIAStore} from '../stores/iaStore';
import {ejecutarAccionExternaIA} from './accionesExternasIA';
import {validarPrioridad, validarUrgencia, validarImportancia} from './validadoresIA';
import type {AccionLLM, EjecutoresTareasIA, ResultadoAccion} from './tiposAccionesIA';

/*
 * Ejecutar acciones recibidas del LLM
 * Valida cada acción antes de ejecutarla y retorna resultados
 */
export async function ejecutarAcciones(acciones: AccionLLM[], ejecutoresTareas: EjecutoresTareasIA): Promise<ResultadoAccion[]> {
    const resultados: ResultadoAccion[] = [];
    const storeHabitos = useHabitosStore.getState();

    for (const accion of acciones) {
        try {
            switch (accion.tipo) {
                case 'crear_tarea': {
                    const texto = String(accion.parametros.texto || '').trim();
                    if (!texto) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: 'Texto vacío'});
                        break;
                    }
                    ejecutoresTareas.crearTarea({
                        texto,
                        prioridad: validarPrioridad(accion.parametros.prioridad),
                        urgencia: validarUrgencia(accion.parametros.urgencia)
                    });
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Tarea: "${texto}"`});
                    break;
                }
                case 'completar_tarea': {
                    const id = Number(accion.parametros.id);
                    if (!id || !ejecutoresTareas.tareas.some(t => t.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Tarea #${id} no encontrada`});
                        break;
                    }
                    ejecutoresTareas.toggleTarea(id);
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Tarea #${id} toggleada`});
                    break;
                }
                case 'editar_tarea': {
                    const id = Number(accion.parametros.id);
                    if (!id || !ejecutoresTareas.tareas.some(t => t.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Tarea #${id} no encontrada`});
                        break;
                    }
                    const datos: DatosEdicionTarea = {};
                    if (accion.parametros.texto) datos.texto = String(accion.parametros.texto);
                    if (accion.parametros.prioridad !== undefined) datos.prioridad = validarPrioridad(accion.parametros.prioridad);
                    if (accion.parametros.urgencia !== undefined) datos.urgencia = validarUrgencia(accion.parametros.urgencia);
                    ejecutoresTareas.editarTarea(id, datos);
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Tarea #${id} editada`});
                    break;
                }
                case 'eliminar_tarea': {
                    const id = Number(accion.parametros.id);
                    if (!id || !ejecutoresTareas.tareas.some(t => t.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Tarea #${id} no encontrada`});
                        break;
                    }
                    /* [303A-11] Las eliminaciones requieren confirmación explícita del usuario.
                     * No se ejecutan inmediatamente — se marcan como pendientes. */
                    const tarea = ejecutoresTareas.tareas.find(t => t.id === id);
                    resultados.push({tipo: accion.tipo, exito: false, descripcion: `Eliminar "${tarea?.texto || `#${id}`}" — pendiente de confirmación`, pendienteConfirmacion: true});
                    break;
                }
                case 'crear_habito': {
                    const nombre = String(accion.parametros.nombre || '').trim();
                    if (!nombre) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: 'Nombre vacío'});
                        break;
                    }
                    storeHabitos.crearHabito({
                        nombre,
                        importancia: validarImportancia(accion.parametros.importancia),
                        tags: Array.isArray(accion.parametros.tags) ? accion.parametros.tags.map(String) : []
                    });
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Hábito: "${nombre}"`});
                    break;
                }
                case 'completar_habito': {
                    const id = Number(accion.parametros.id);
                    if (!id || !storeHabitos.habitos.some(h => h.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Hábito #${id} no encontrado`});
                        break;
                    }
                    storeHabitos.toggleHabito(id);
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Hábito #${id} toggleado`});
                    break;
                }
                case 'eliminar_habito': {
                    const id = Number(accion.parametros.id);
                    if (!id || !storeHabitos.habitos.some(h => h.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Hábito #${id} no encontrado`});
                        break;
                    }
                    /* [303A-11] Las eliminaciones requieren confirmación — no se ejecutan directamente */
                    const habito = storeHabitos.habitos.find(h => h.id === id);
                    resultados.push({tipo: accion.tipo, exito: false, descripcion: `Eliminar "${habito?.nombre || `#${id}`}" — pendiente de confirmación`, pendienteConfirmacion: true});
                    break;
                }
                default: {
                    /* [27-08-2026] Respetar los permisos de herramientas del
                     * usuario: si el toggle está desactivado, la acción se
                     * rechaza aunque el modelo la proponga. */
                    const storeIA = useIAStore.getState();
                    if (accion.tipo === 'programar_recordatorio' && storeIA.permitirRecordatorios === false) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: 'Los recordatorios están desactivados en la configuración'});
                        break;
                    }
                    if (accion.tipo === 'research_web' && storeIA.permitirBusquedaWeb === false) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: 'La búsqueda web está desactivada en la configuración'});
                        break;
                    }
                    const externa = await ejecutarAccionExternaIA(accion);
                    resultados.push(externa ?? {tipo: accion.tipo, exito: false, descripcion: 'Acción no reconocida'});
                    break;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            resultados.push({tipo: accion.tipo, exito: false, descripcion: msg});
        }
    }

    return resultados;
}

/* [303A-11] Ejecutar una acción destructiva previamente pendiente de confirmación.
 * Se usa cuando el usuario hace click en "Confirmar" en el UI del chat. */
export function ejecutarAccionDestructiva(accion: AccionLLM, ejecutoresTareas: EjecutoresTareasIA): ResultadoAccion {
    const storeHabitos = useHabitosStore.getState();
    try {
        if (accion.tipo === 'eliminar_tarea') {
            const id = Number(accion.parametros.id);
            if (!id || !ejecutoresTareas.tareas.some(t => t.id === id)) {
                return {tipo: accion.tipo, exito: false, descripcion: `Tarea #${id} no encontrada`};
            }
            ejecutoresTareas.eliminarTarea(id);
            return {tipo: accion.tipo, exito: true, descripcion: `Tarea #${id} eliminada`};
        }
        if (accion.tipo === 'eliminar_habito') {
            const id = Number(accion.parametros.id);
            if (!id || !storeHabitos.habitos.some(h => h.id === id)) {
                return {tipo: accion.tipo, exito: false, descripcion: `Hábito #${id} no encontrado`};
            }
            storeHabitos.eliminarHabito(id);
            return {tipo: accion.tipo, exito: true, descripcion: `Hábito #${id} eliminado`};
        }
        return {tipo: accion.tipo, exito: false, descripcion: 'Acción no es destructiva'};
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        return {tipo: accion.tipo, exito: false, descripcion: msg};
    }
}

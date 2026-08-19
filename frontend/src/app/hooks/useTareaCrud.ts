/*
 * hooks/useTareaCrud.ts
 * [H-F12-02] Crear, editar y eliminar tareas con undo y tombstones. Las
 * transformaciones viven en utils/mergeTarea.ts y los eventos de cambio en
 * utils/eventosCambioTarea.ts; aquí solo se orquesta estado y deshacer.
 */

import {useCallback} from 'react';
import type {Tarea, DatosEdicionTarea} from '../types/dashboard';
import {obtenerSubtareas} from '../utils/jerarquiaTareas';
import {marcarBorrado, desmarcarBorrado} from '../utils/borradosPendientes';
import {calcularIndiceInsercion, crearTareaNueva, aplicarDatosEdicion} from '../utils/mergeTarea';
import {registrarEventosCambios} from '../utils/eventosCambioTarea';
import {generarIdTarea} from '../utils/repeticionTareas';
import type {UseTareasParams} from './useTareas';

export function useTareaCrud({tareas, setTareas, registrarAccion, mostrarMensaje}: UseTareasParams): {
    crearTarea: (datos: DatosEdicionTarea) => void;
    editarTarea: (id: number, datos: DatosEdicionTarea) => void;
    eliminarTarea: (id: number) => void;
} {
    /*
     * Crear una tarea nueva. Si se indica insertarDespuesDe, inserta tras esa
     * tarea; si no, antes de la primera completada. Recalcula el orden global.
     */
    const crearTarea = useCallback(
        (datos: DatosEdicionTarea) => {
            /* [H-F12-09] ID único generado fuera del callback para referenciarlo en deshacer */
            const nuevoId = generarIdTarea();

            setTareas(prev => {
                const indiceInsercion = calcularIndiceInsercion(prev, datos.insertarDespuesDe);
                const nuevaTarea = crearTareaNueva(datos, indiceInsercion, nuevoId);

                const nuevaLista = [...prev];
                nuevaLista.splice(indiceInsercion, 0, nuevaTarea);
                return nuevaLista.map((t, idx) => ({...t, orden: idx}));
            });

            /* El evento 'creado' se registra tras sincronizar (el ID real cambia
             * al local), por eso aquí solo se deja el undo de la creación local. */
            registrarAccion(`Tarea creada`, () => {
                setTareas(prev => prev.filter(t => t.id !== nuevoId));
            });
        },
        [setTareas, registrarAccion]
    );

    /*
     * Eliminar con undo. Las subtareas huérfanas se promueven a principales.
     */
    const eliminarTarea = useCallback(
        (id: number) => {
            const tareaEliminada = tareas.find(t => t.id === id);
            if (!tareaEliminada) return;

            /* Guardar índice original para restaurar en la misma posición */
            const indiceOriginal = tareas.findIndex(t => t.id === id);
            const subtareasHuerfanas = obtenerSubtareas(tareas, id);

            setTareas(prev =>
                prev
                    .filter(t => t.id !== id)
                    .map(t => {
                        if (t.parentId === id) {
                            const {parentId: _, ...tareaSinParent} = t;
                            return tareaSinParent as Tarea;
                        }
                        return t;
                    })
            );

            /* [18-08-2026] Tombstone: el sync por entidad no informa borrados al
             * servidor; sin este registro la tarea reaparecía en el siguiente
             * refresh. Solo para IDs reales (positivos): las virtuales de hábitos
             * nunca existieron en servidor. */
            if (id > 0) marcarBorrado('tareas', id);

            const mensajeExtra = subtareasHuerfanas.length > 0 ? ` (${subtareasHuerfanas.length} subtareas promovidas)` : '';
            mostrarMensaje?.(`Tarea eliminada${mensajeExtra}`, 'exito');

            registrarAccion(`Tarea eliminada`, () => {
                /* Deshacer: desmarcar tombstone para que el próximo upsert la reviva */
                if (id > 0) desmarcarBorrado('tareas', id);
                setTareas(prev => {
                    const nuevaLista = [...prev];
                    nuevaLista.splice(indiceOriginal, 0, tareaEliminada);
                    /* Restaurar relación padre-hijo de las subtareas */
                    return nuevaLista.map(t => {
                        const eraSubtarea = subtareasHuerfanas.find(s => s.id === t.id);
                        return eraSubtarea ? {...t, parentId: id} : t;
                    });
                });
            });
        },
        [tareas, setTareas, mostrarMensaje, registrarAccion]
    );

    /* Editar con undo: fusiona los datos en utils/mergeTarea y registra los
     * cambios significativos en el timeline. */
    const editarTarea = useCallback(
        (id: number, datos: DatosEdicionTarea) => {
            const tareaAnterior = tareas.find(t => t.id === id);
            if (!tareaAnterior) return;

            setTareas(prev => prev.map(t => (t.id === id ? aplicarDatosEdicion(t, datos) : t)));
            registrarEventosCambios(id, tareaAnterior, datos);

            registrarAccion(`Tarea editada`, () => {
                setTareas(prev => prev.map(t => (t.id === id ? tareaAnterior : t)));
            });
        },
        [tareas, setTareas, registrarAccion]
    );

    return {crearTarea, editarTarea, eliminarTarea};
}

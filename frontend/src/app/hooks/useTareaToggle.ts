/*
 * hooks/useTareaToggle.ts
 * [H-F12-02] Responsabilidad: completar/desmarcar una tarea con repetición,
 * undo y efectos laterales (timeline, tracking, heatmap). Compuesto por
 * useTareas; la lógica de repetición y los efectos viven en utils.
 */

import {useCallback} from 'react';
import type {Tarea} from '../types/dashboard';
import {generarTareaRepetida} from '../utils/repeticionTareas';
import {registrarEventoToggleSistema, registrarActividadToggle} from '../utils/registroActividadTarea';
import type {UseTareasParams} from './useTareas';

export type OpcionesToggleTarea = {detallesActividad?: Record<string, unknown>};

export function useTareaToggle({tareas, setTareas, registrarAccion}: UseTareasParams): {
    toggleTarea: (id: number, opciones?: OpcionesToggleTarea) => void;
} {
    const toggleTarea = useCallback(
        (id: number, opciones?: OpcionesToggleTarea) => {
            const tarea = tareas.find(t => t.id === id);
            if (!tarea) return;

            const estadoAnterior = tarea.completado;
            const accion = estadoAnterior ? 'pendiente' : 'completada';

            /* Repetición: generar nueva tarea si se completa y tiene repetición */
            let nuevaTareaRepetida: Tarea | null = null;
            if (!estadoAnterior) {
                nuevaTareaRepetida = generarTareaRepetida(tarea, tareas);
            }

            setTareas(prev => {
                const actualizadas = prev.map(t => (t.id === id ? {...t, completado: !t.completado, updatedAt: Date.now()} : t));

                if (nuevaTareaRepetida) {
                    /* Insertar al inicio y recalcular ordenes */
                    const listaConNueva = [nuevaTareaRepetida, ...actualizadas];
                    return listaConNueva.map((t, i) => ({...t, orden: i}));
                }

                return actualizadas;
            });

            registrarEventoToggleSistema(tarea, estadoAnterior);

            registrarAccion(`Tarea "${tarea.texto.substring(0, 30)}..." ${accion}`, () => {
                setTareas(prev => {
                    /* Restaurar estado original y eliminar tarea generada si existe */
                    let listaRestaurada = prev.filter(t => t.id !== nuevaTareaRepetida?.id).map(t => (t.id === id ? {...t, completado: estadoAnterior} : t));

                    /* Si habia repeticion, normalizar ordenes tras eliminar la nueva */
                    if (nuevaTareaRepetida) {
                        listaRestaurada = listaRestaurada.map((t, i) => ({...t, orden: i}));
                    }

                    return listaRestaurada;
                });
            });

            registrarActividadToggle(tarea, estadoAnterior, opciones?.detallesActividad);
        },
        [tareas, setTareas, registrarAccion]
    );

    return {toggleTarea};
}

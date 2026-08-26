/*
 * hooks/useTareaToggle.ts
 * [H-F12-02] Responsabilidad: completar/desmarcar una tarea con repetición,
 * undo y efectos laterales (timeline, tracking, heatmap). Compuesto por
 * useTareas; la lógica de repetición y los efectos viven en utils.
 */

import {useCallback} from 'react';
import type {Tarea} from '../types/dashboard';
import {obtenerFechaHoy} from '../utils/fecha';
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
                const actualizadas = prev.map(t =>
                    t.id === id
                        ? {
                              ...t,
                              completado: !t.completado,
                              /* [27-08-2026] La fecha real de completado vive en el
                               * payload (el backend deriva de ahi el panel de
                               * Actividad). Sin ella, el backend inventaba
                               * completed_at = NOW() y tareas viejas importadas
                               * aparecian como completadas hoy. */
                              fechaCompletado: !t.completado ? obtenerFechaHoy() : undefined,
                              updatedAt: Date.now()
                          }
                        : t
                );

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
                    let listaRestaurada = prev.filter(t => t.id !== nuevaTareaRepetida?.id).map(t => (t.id === id ? {...t, completado: estadoAnterior, fechaCompletado: estadoAnterior ? tarea.fechaCompletado : undefined} : t));

                    /* Si habia repeticion, normalizar ordenes tras eliminar la nueva */
                    if (nuevaTareaRepetida) {
                        listaRestaurada = listaRestaurada.map((t, i) => ({...t, orden: i}));
                    }

                    return listaRestaurada;
                });

                /* [27-08-2026] Deshacer debe revertir TAMBIÉN la actividad: al
                 * completar se registró tarea_completada y, si solo se restauraba
                 * el store, el evento quedaba en el backend y el panel de
                 * Actividad seguía mostrando la tarea. Registrar la acción
                 * inversa (desmarcada/completada) borra/crea el evento real.
                 * `!estadoAnterior` invierte la semántica de registrarActividadToggle. */
                registrarActividadToggle(tarea, !estadoAnterior);
            });

            registrarActividadToggle(tarea, estadoAnterior, opciones?.detallesActividad);
        },
        [tareas, setTareas, registrarAccion]
    );

    return {toggleTarea};
}

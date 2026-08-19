/*
 * hooks/useTareaReordenar.ts
 * [H-F12-02] Responsabilidad: reordenar tareas (drag & drop) fusionando la
 * lista reordenada con las tareas no afectadas. Compuesto por useTareas.
 */

import {useCallback} from 'react';
import type {Tarea} from '../types/dashboard';
import type {UseTareasParams} from './useTareas';

export function useTareaReordenar({setTareas}: UseTareasParams): {
    reordenarTareas: (tareas: Tarea[]) => void;
} {
    /*
     * Reordenar tareas (para drag & drop).
     * Fusiona las tareas reordenadas con las existentes que no están en la lista:
     * permite reordenar tareas de un proyecto sin perder las de otros proyectos.
     *
     * [044A-12] Filtra tareas virtuales de hábitos (IDs negativos) que vienen
     * de tareasConHabitos via handleReorder. Sin este filtro, las tareas virtuales
     * se persisten como reales y se multiplican en cada reorder, causando cientos
     * de subtareas fantasma. También limpia parentId corrompidos que apuntan a
     * IDs de hábitos virtuales.
     */
    const reordenarTareas = useCallback(
        (tareasReordenadas: Tarea[]) => {
            setTareas(prev => {
                /* Excluir tareas virtuales de hábitos (IDs negativos) de ambas listas */
                const soloReales = tareasReordenadas.filter(t => t.id > 0);
                const prevLimpias = prev.filter(t => t.id > 0);

                const idsReordenados = new Set(soloReales.map(t => t.id));
                const tareasNoAfectadas = prevLimpias.filter(t => !idsReordenados.has(t.id));
                const tareasFinales = [...soloReales, ...tareasNoAfectadas];

                /* Recalcular orden y restaurar parentId corrompidos (apuntan a IDs negativos) */
                return tareasFinales.map((t, idx) => ({
                    ...t,
                    orden: idx,
                    ...(t.parentId !== undefined && t.parentId < 0 ? {parentId: undefined} : {})
                }));
            });
        },
        [setTareas]
    );

    return {reordenarTareas};
}

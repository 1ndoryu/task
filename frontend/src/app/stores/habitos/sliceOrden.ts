/*
 * stores/habitos/sliceOrden.ts
 * [H-F11-01] Slice de orden: tareas del hábito, drag & drop manual y el
 * orden exclusivo del panel de Ejecución.
 */

import type {HabitosSliceOrden, CrearSliceHabitos} from './tipos';

export const crearSliceOrden: CrearSliceHabitos<HabitosSliceOrden> = (set) => ({
        /* Actualizar orden de tareas del hábito - Fase 14.8 */
        actualizarOrdenTareasHabito: (habitoId, tareasIds) => {
            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== habitoId) return h;
                        return {
                            ...h,
                            tareasIds
                        };
                    })
                }),
                false,
                'actualizarOrdenTareasHabito'
            );
        },

        /* [218A-1] Reordenar hábitos: asigna campo orden según posición en el array recibido */
        reordenarHabitos: habitosReordenados => {
            set(
                state => {
                    /* Crear mapa de orden por ID */
                    const ordenMap = new Map(habitosReordenados.map((h, index) => [h.id, index]));

                    return {
                        habitos: state.habitos.map(h => {
                            const nuevoOrden = ordenMap.get(h.id);
                            if (nuevoOrden === undefined) return h;
                            if (h.orden === nuevoOrden) return h;
                            return {...h, orden: nuevoOrden};
                        })
                    };
                },
                false,
                'reordenarHabitos'
            );
        },

        /* [218A-2] Actualizar orden de hábitos desde drag en panel de ejecución.
         * Recibe un Map<habitoId, orden> con la nueva posición de cada hábito. */
        actualizarOrdenHabitos: ordenes => {
            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        const nuevoOrden = ordenes.get(h.id);
                        if (nuevoOrden === undefined) return h;
                        if (h.orden === nuevoOrden) return h;
                        return {...h, orden: nuevoOrden};
                    })
                }),
                false,
                'actualizarOrdenHabitos'
            );
        },

        /* Orden exclusivo para el panel de Ejecución: separa el orden del drag en
         * Ejecución del orden manual del panel de Hábitos. */
        actualizarOrdenEjecucionHabitos: ordenes => {
            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        const nuevoOrden = ordenes.get(h.id);
                        if (nuevoOrden === undefined) return h;
                        if (h.ordenEjecucion === nuevoOrden) return h;
                        return {...h, ordenEjecucion: nuevoOrden};
                    })
                }),
                false,
                'actualizarOrdenEjecucionHabitos'
            );
        }
    });

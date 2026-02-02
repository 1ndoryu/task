/*
 * seleccionMultipleStore
 * Store para gestionar la selección múltiple de tareas
 * Permite seleccionar varias tareas con Ctrl+Click y aplicar acciones masivas
 */

import {create} from 'zustand';

interface TareaSeleccionada {
    id: number;
    texto: string;
    proyectoId?: number;
    prioridad?: string;
    esHabito?: boolean;
    urgencia?: string;
}

interface SeleccionMultipleState {
    /* IDs de tareas seleccionadas */
    tareasSeleccionadas: Map<number, TareaSeleccionada>;

    /* Modo selección activo (se activa al tener al menos 1 tarea seleccionada) */
    modoSeleccionActivo: boolean;

    /* Posición del menú de acciones masivas */
    menuPosicion: {x: number; y: number} | null;

    /* Modo selección manual (activado por botón) */
    modoSeleccionManual: boolean;
}

interface SeleccionMultipleAcciones {
    /* Alternar selección de una tarea */
    toggleSeleccion: (tarea: TareaSeleccionada) => void;

    /* Seleccionar múltiples tareas a la vez */
    seleccionarVarias: (tareas: TareaSeleccionada[]) => void;

    /* Verificar si una tarea está seleccionada */
    estaSeleccionada: (tareaId: number) => boolean;

    /* Limpiar todas las selecciones */
    limpiarSeleccion: () => void;

    /* Mostrar menú de acciones masivas */
    mostrarMenu: (x: number, y: number) => void;

    /* Ocultar menú de acciones masivas */
    ocultarMenu: () => void;

    /* Obtener IDs de tareas seleccionadas como array */
    obtenerIdsSeleccionados: () => number[];

    /* Obtener tareas seleccionadas como array */
    obtenerTareasSeleccionadas: () => TareaSeleccionada[];

    /* Alternar modo selección manual */
    toggleModoSeleccionManual: () => void;
}

type SeleccionMultipleStore = SeleccionMultipleState & SeleccionMultipleAcciones;

export const useSeleccionMultipleStore = create<SeleccionMultipleStore>((set, get) => ({
    tareasSeleccionadas: new Map(),
    modoSeleccionActivo: false,
    modoSeleccionManual: false,
    menuPosicion: null,

    toggleSeleccion: (tarea: TareaSeleccionada) => {
        set(state => {
            const nuevaSeleccion = new Map(state.tareasSeleccionadas);

            if (nuevaSeleccion.has(tarea.id)) {
                nuevaSeleccion.delete(tarea.id);
            } else {
                nuevaSeleccion.set(tarea.id, tarea);
            }

            return {
                tareasSeleccionadas: nuevaSeleccion,
                modoSeleccionActivo: state.modoSeleccionManual || nuevaSeleccion.size > 0
            };
        });
    },

    seleccionarVarias: (tareas: TareaSeleccionada[]) => {
        set(state => {
            const nuevaSeleccion = new Map<number, TareaSeleccionada>();
            tareas.forEach(t => nuevaSeleccion.set(t.id, t));
            return {
                tareasSeleccionadas: nuevaSeleccion,
                modoSeleccionActivo: state.modoSeleccionManual || nuevaSeleccion.size > 0
            };
        });
    },

    estaSeleccionada: (tareaId: number) => {
        return get().tareasSeleccionadas.has(tareaId);
    },

    limpiarSeleccion: () => {
        set(state => ({
            tareasSeleccionadas: new Map(),
            modoSeleccionActivo: state.modoSeleccionManual, // Mantener activo si está en modo manual
            menuPosicion: null
        }));
    },

    mostrarMenu: (x: number, y: number) => {
        set({menuPosicion: {x, y}});
    },

    ocultarMenu: () => {
        set({menuPosicion: null});
    },

    obtenerIdsSeleccionados: () => {
        return Array.from(get().tareasSeleccionadas.keys());
    },

    obtenerTareasSeleccionadas: () => {
        return Array.from(get().tareasSeleccionadas.values());
    },

    toggleModoSeleccionManual: () => {
        set(state => {
            const nuevoModo = !state.modoSeleccionManual;
            return {
                modoSeleccionManual: nuevoModo,
                modoSeleccionActivo: nuevoModo || state.tareasSeleccionadas.size > 0,
                // Si desactivamos y no hay tareas, limpiar todo
                ...(!nuevoModo && state.tareasSeleccionadas.size === 0 ? {modoSeleccionActivo: false} : {})
            };
        });
    }
}));

/*
 * Hook auxiliar para obtener el número de tareas seleccionadas
 * Útil para mostrar contador en UI
 */
export function useCantidadSeleccionadas(): number {
    return useSeleccionMultipleStore(state => state.tareasSeleccionadas.size);
}

/*
 * useTareas
 * [H-F12-02] Hook compuesto: orquesta los sub-hooks cohesivos y expone la
 * misma API pública de siempre para sus consumidores.
 *   - useTareaCrud      → crear/editar/eliminar con undo y tombstones
 *   - useTareaToggle    → completar/desmarcar con repetición y efectos
 *   - useTareaReordenar → drag & drop con fusión de lista
 * Las transformaciones de datos viven en utils puras (mergeTarea,
 * repeticionTareas, eventosCambioTarea, registroActividadTarea).
 */

import {useTareaCrud} from './useTareaCrud';
import {useTareaToggle} from './useTareaToggle';
import {useTareaReordenar} from './useTareaReordenar';
import type {Tarea, DatosEdicionTarea} from '../types/dashboard';

export interface UseTareasParams {
    tareas: Tarea[];
    setTareas: React.Dispatch<React.SetStateAction<Tarea[]>>;
    registrarAccion: (mensaje: string, deshacer: () => void) => void;
    mostrarMensaje?: (mensaje: string, tipo: 'exito' | 'error') => void;
}

export interface UseTareasReturn {
    toggleTarea: (id: number, opciones?: {detallesActividad?: Record<string, unknown>}) => void;
    crearTarea: (datos: DatosEdicionTarea) => void;
    editarTarea: (id: number, datos: DatosEdicionTarea) => void;
    eliminarTarea: (id: number) => void;
    reordenarTareas: (tareas: Tarea[]) => void;
}

export function useTareas(params: UseTareasParams): UseTareasReturn {
    const {toggleTarea} = useTareaToggle(params);
    const {crearTarea, editarTarea, eliminarTarea} = useTareaCrud(params);
    const {reordenarTareas} = useTareaReordenar(params);

    return {toggleTarea, crearTarea, editarTarea, eliminarTarea, reordenarTareas};
}

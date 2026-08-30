/* [H-F13-01] Contrato de props de ListaTareas, extraído del componente:
 * la superficie de 35 props opcionales es un contrato (tipos puros), no lógica
 * de renderizado; el componente queda enfocado en comportamiento. */

import type {Tarea, DatosEdicionTarea, DatosNuevoHabito, Proyecto, Participante} from '../../../types/dashboard';

/* Frente ISP 1408: ListaTareasProps dividida en fragmentos cohesivos via
 * extends (misma forma plana; cada declaracion <= 10 campos). */
export interface ListaTareasBase {
    tareas: Tarea[];
    proyectoId?: number;
    proyectos?: Proyecto[];
    habilitarDrag?: boolean;
    modoCompacto?: boolean;
    ocultarCompletadas?: boolean;
    ocultarBadgeProyecto?: boolean;
    ocultarSubtareasAutomaticamente?: boolean;
    ocultarPlaceholderVacio?: boolean;
}
export interface ListaTareasTarea {
    onToggleTarea?: (id: number) => void;
    onCrearTarea?: (datos: DatosEdicionTarea) => void;
    onEditarTarea?: (id: number, datos: DatosEdicionTarea) => void;
    onEliminarTarea?: (id: number) => void;
    onReordenarTareas?: (tareas: Tarea[]) => void;
    onConfigurarTarea?: (tarea: Tarea) => void;
    onAbrirModalCrear?: () => void;
    onCompartirTarea?: (tarea: Tarea) => void;
    estaCompartida?: (tareaId: number) => boolean;
    obtenerParticipantes?: (tarea: Tarea) => Participante[];
}
export interface ListaTareasHabito {
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onToggleHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    onPosponerHabitoConTiempo?: (habitoId: number, hasta: string | null) => void;
    onPausarHabito?: (habitoId: number) => void;
    onActualizarHabito?: (habitoId: number, datos: Partial<DatosNuevoHabito>) => void;
    onAbrirModalCrearHabito?: () => void;
    onReordenarHabitos?: (ordenes: Map<number, number>) => void;
}
export interface ListaTareasSubHabito {
    onToggleSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    onEliminarSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    onPosponerSubHabitoConTiempo?: (habitoPadreId: number, subHabitoId: number, hasta: string | null) => void;
    onActualizarSubHabito?: (habitoPadreId: number, subHabitoId: number, datos: Partial<DatosNuevoHabito>) => void;
    onConfigurarSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
}
export interface ListaTareasProps extends ListaTareasBase, ListaTareasTarea, ListaTareasHabito, ListaTareasSubHabito {}

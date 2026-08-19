/* [H-F13-01] Contrato de props de ListaTareas, extraído del componente:
 * la superficie de 35 props opcionales es un contrato (tipos puros), no lógica
 * de renderizado; el componente queda enfocado en comportamiento. */

import type {Tarea, DatosEdicionTarea, DatosNuevoHabito, Proyecto, Participante} from '../../../types/dashboard';

export interface ListaTareasProps {
    tareas: Tarea[];
    proyectoId?: number;
    onToggleTarea?: (id: number) => void;
    onCrearTarea?: (datos: DatosEdicionTarea) => void;
    onEditarTarea?: (id: number, datos: DatosEdicionTarea) => void;
    onEliminarTarea?: (id: number) => void;
    onReordenarTareas?: (tareas: Tarea[]) => void;
    habilitarDrag?: boolean;
    proyectos?: Proyecto[];
    ocultarCompletadas?: boolean;
    ocultarBadgeProyecto?: boolean;
    /* Ocultar subtareas automáticamente (colapsadas por defecto) */
    ocultarSubtareasAutomaticamente?: boolean;
    onCompartirTarea?: (tarea: Tarea) => void;
    estaCompartida?: (tareaId: number) => boolean;
    obtenerParticipantes?: (tarea: Tarea) => Participante[];
    /* Callbacks para hábitos - Sincronizado con TablaHabitos (Fase UI/UX) */
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onToggleHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    onPosponerHabitoConTiempo?: (habitoId: number, hasta: string | null) => void;
    onPausarHabito?: (habitoId: number) => void;
    onActualizarHabito?: (habitoId: number, datos: Partial<DatosNuevoHabito>) => void;
    /* [207A-3] Callbacks para subhábitos */
    onToggleSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    onEliminarSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    /* [217A-2] Subhábitos: acciones independientes */
    onPosponerSubHabitoConTiempo?: (habitoPadreId: number, subHabitoId: number, hasta: string | null) => void;
    onActualizarSubHabito?: (habitoPadreId: number, subHabitoId: number, datos: Partial<DatosNuevoHabito>) => void;
    onConfigurarSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    modoCompacto?: boolean;
    onConfigurarTarea?: (tarea: Tarea) => void;
    /* Callback para abrir modal de creación rápida (usado en estado vacío y botón añadir) */
    onAbrirModalCrear?: () => void;
    /* [207A-4] Callback para abrir modal de creación de hábito desde areaNuevoInline */
    onAbrirModalCrearHabito?: () => void;
    /* Ocultar placeholder vacío completo (útil dentro de proyectos expandidos) */
    ocultarPlaceholderVacio?: boolean;
    /* [218A-2] Callback para actualizar orden de hábitos desde drag */
    onReordenarHabitos?: (ordenes: Map<number, number>) => void;
}

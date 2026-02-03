import type {Tarea, DatosEdicionTarea} from '../../../types/dashboard';

export interface TareaItemProps {
    tarea: Tarea;
    onToggle?: () => void;
    onEditar?: (datos: DatosEdicionTarea) => void;
    onEliminar?: () => void;
    esSubtarea?: boolean;
    onIndent?: () => void;
    onOutdent?: () => void;
    /* Crear nueva tarea debajo (hereda parentId si es subtarea, tareaActualId para posicion) */
    onCrearNueva?: (parentId: number | undefined, tareaActualId: number) => void;
    /* Abrir panel de configuracion */
    onConfigurar?: () => void;
    /* Nombre del proyecto al que pertenece (opcional) */
    nombreProyecto?: string;
    /* Mostrar solo el icono del proyecto sin texto */
    soloIconoProyecto?: boolean;
    /* Mover tarea a otro proyecto */
    onMoverProyecto?: () => void;
    /* Compartir tarea con companeros */
    onCompartir?: () => void;
    /* Indica si la tarea esta siendo compartida */
    estaCompartida?: boolean;
    /* Contador de mensajes no leídos (para badge) */
    mensajesNoLeidos?: number;
    /* Callbacks específicos para tareas-hábito (Fase 7.6.1) - Sincronizado con TablaHabitos */
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onToggleHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    onPausarHabito?: (habitoId: number) => void;
    onActualizarHabito?: (habitoId: number, datos: any) => void;
    /* Indica si la tarea hábito fue completada hoy (para menú contextual) */
    habitoCompletadoHoy?: boolean;
    /* Indica si el hábito está pausado (para menú contextual) */
    habitoPausado?: boolean;
    /* Indica si la tarea tiene subtareas (para ajustar padding y evitar colisión con el contador) */
    tieneSubtareas?: boolean;
    modoCompacto?: boolean;
    /* Props para selección múltiple (Ctrl+Click) */
    estaSeleccionada?: boolean;
    onSeleccionMultiple?: (tarea: Tarea, evento: React.MouseEvent) => void;
    modoSeleccionActivo?: boolean;
}

export interface MenuContextualEstado {
    visible: boolean;
    x: number;
    y: number;
}

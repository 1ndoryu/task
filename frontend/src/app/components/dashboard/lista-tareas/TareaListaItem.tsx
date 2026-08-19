/* [H-F13-01] Fila de tarea "conectada": el cableado de ~30 props hacia
 * TareaConColapsador (contrato de ListaTareas + estado del hook) vivía dentro
 * de ListaTareas como closure; ahora es un componente propio y ListaTareas
 * solo le pasa `tarea`, `esSubtarea`, `listaProps` y `estado`. */

import type {Tarea} from '../../../types/dashboard';
import {useHabitosStore} from '../../../stores/habitosStore';
import {TareaConColapsador} from './TareaConColapsador';
import type {ListaTareasProps} from './ListaTareasProps';

export interface EstadoFilaTarea {
    tareas: Tarea[];
    tareasExpandidas: Set<number>;
    onToggleExpandir: (id: number) => void;
    estaSeleccionada: (id: number) => boolean;
    manejarSeleccionMultiple: (tarea: Tarea, evento: React.MouseEvent) => void;
    modoSeleccionActivo: boolean;
    abrirConfiguracion: (id: number) => void;
    setTareaMoviendo: (tarea: Tarea | null) => void;
    handleIndent: (id: number) => void;
    handleOutdent: (id: number) => void;
    handleCrearNueva: (parentId: number | undefined, tareaActualId: number) => void;
    mensajesNoLeidosPorTarea: Record<number, number>;
    suprimirClickRef: React.RefObject<boolean>;
}

interface TareaListaItemProps {
    tarea: Tarea;
    esSubtarea: boolean;
    listaProps: ListaTareasProps;
    estado: EstadoFilaTarea;
}

export function TareaListaItem({tarea, esSubtarea, listaProps, estado}: TareaListaItemProps): JSX.Element {
    const habitos = useHabitosStore(state => state.habitos);

    return (
        <TareaConColapsador
            tarea={tarea}
            esSubtarea={esSubtarea}
            tareas={estado.tareas}
            tareasExpandidas={estado.tareasExpandidas}
            onToggleExpandir={estado.onToggleExpandir}
            proyectos={listaProps.proyectos ?? []}
            modoCompacto={listaProps.modoCompacto ?? false}
            ocultarBadgeProyecto={listaProps.ocultarBadgeProyecto ?? false}
            mensajesNoLeidos={estado.mensajesNoLeidosPorTarea[tarea.id] || 0}
            estaCompartida={listaProps.estaCompartida?.(tarea.id) ?? false}
            // Acciones
            onToggleTarea={listaProps.onToggleTarea}
            onEditarTarea={listaProps.onEditarTarea}
            onEliminarTarea={listaProps.onEliminarTarea}
            onIndent={estado.handleIndent}
            onOutdent={estado.handleOutdent}
            onCrearNueva={estado.handleCrearNueva}
            onConfigurar={estado.abrirConfiguracion}
            onMoverProyecto={estado.setTareaMoviendo}
            onCompartir={listaProps.onCompartirTarea}
            // Hábitos - Sincronizado con TablaHabitos
            onEditarHabito={listaProps.onEditarHabito}
            onEliminarHabito={listaProps.onEliminarHabito}
            onToggleHabito={listaProps.onToggleHabito}
            onPosponerHabito={listaProps.onPosponerHabito}
            onPosponerHabitoConTiempo={listaProps.onPosponerHabitoConTiempo}
            onPausarHabito={listaProps.onPausarHabito}
            onActualizarHabito={listaProps.onActualizarHabito}
            /* [207A-3] Subhábitos */
            onToggleSubHabito={listaProps.onToggleSubHabito}
            onEliminarSubHabito={listaProps.onEliminarSubHabito}
            /* [217A-2] Subhábitos: acciones independientes */
            onPosponerSubHabitoConTiempo={listaProps.onPosponerSubHabitoConTiempo}
            onActualizarSubHabito={listaProps.onActualizarSubHabito}
            onConfigurarSubHabito={listaProps.onConfigurarSubHabito}
            // Suprimir click tras drag - [218A-2]
            suprimirClickRef={estado.suprimirClickRef}
            // Selección múltiple - TAREA 3.1
            estaSeleccionada={estado.estaSeleccionada(tarea.id)}
            onSeleccionMultiple={estado.manejarSeleccionMultiple}
            modoSeleccionActivo={estado.modoSeleccionActivo}
            // Dependencias
            todasTareas={listaProps.tareas}
            todosHabitos={habitos}
        />
    );
}

import React from 'react';
import {ChevronRight} from 'lucide-react';
import {Tarea, Proyecto, DatosEdicionTarea} from '../../../types/dashboard';
import {TareaItem} from '../TareaItem';
import {tieneSubtareas, contarSubtareas} from '../../../utils/jerarquiaTareas';

interface TareaConColapsadorProps {
    tarea: Tarea;
    esSubtarea: boolean;
    tareas: Tarea[];
    tareasExpandidas: Set<number>;
    onToggleExpandir: (id: number) => void;
    proyectos: Proyecto[];
    modoCompacto: boolean;
    ocultarBadgeProyecto: boolean;
    mensajesNoLeidos: number;
    estaCompartida: boolean;

    // Callbacks
    onToggleTarea?: (id: number) => void;
    onEditarTarea?: (id: number, datos: DatosEdicionTarea) => void;
    onEliminarTarea?: (id: number) => void;
    onIndent: (id: number) => void;
    onOutdent: (id: number) => void;
    onCrearNueva: (parentId: number | undefined, tareaActualId: number) => void;
    onConfigurar: (id: number) => void;
    onMoverProyecto: (tarea: Tarea) => void;
    onCompartir?: (tarea: Tarea) => void;

    // Habitos
    onEditarHabito?: (id: number) => void;
    onEliminarHabito?: (id: number) => void;
    onPosponerHabito?: (id: number) => void;
}

export const TareaConColapsador: React.FC<TareaConColapsadorProps> = ({tarea, esSubtarea, tareas, tareasExpandidas, onToggleExpandir, proyectos, modoCompacto, ocultarBadgeProyecto, mensajesNoLeidos, estaCompartida, onToggleTarea, onEditarTarea, onEliminarTarea, onIndent, onOutdent, onCrearNueva, onConfigurar, onMoverProyecto, onCompartir, onEditarHabito, onEliminarHabito, onPosponerHabito}) => {
    const esColapsable = !esSubtarea && tieneSubtareas(tareas, tarea.id);
    const estaExpandida = tareasExpandidas.has(tarea.id);
    const subtareasOcultas = !estaExpandida;
    const numSubtareas = contarSubtareas(tareas, tarea.id);

    const proyecto = tarea.proyectoId ? proyectos?.find(p => p.id === tarea.proyectoId) : undefined;
    let nombreProyecto: string | undefined = undefined;

    if (proyecto?.nombre) {
        nombreProyecto = proyecto.nombre;
        if (!ocultarBadgeProyecto && nombreProyecto.length > 20) {
            nombreProyecto = nombreProyecto.substring(0, 20) + '...';
        }
    }

    return (
        <div className={`tareaConColapsador ${modoCompacto ? 'tareaConColapsador--compacto' : ''}`} key={`wrapper-${tarea.id}`}>
            <TareaItem tarea={tarea} esSubtarea={esSubtarea} onToggle={() => onToggleTarea?.(tarea.id)} onEditar={datos => onEditarTarea?.(tarea.id, datos)} onEliminar={() => onEliminarTarea?.(tarea.id)} onIndent={() => onIndent(tarea.id)} onOutdent={() => onOutdent(tarea.id)} onCrearNueva={onCrearNueva} onConfigurar={() => onConfigurar(tarea.id)} nombreProyecto={nombreProyecto} soloIconoProyecto={ocultarBadgeProyecto} onMoverProyecto={() => onMoverProyecto(tarea)} onCompartir={() => onCompartir?.(tarea)} estaCompartida={estaCompartida} mensajesNoLeidos={mensajesNoLeidos} onEditarHabito={onEditarHabito} onEliminarHabito={onEliminarHabito} onPosponerHabito={onPosponerHabito} tieneSubtareas={esColapsable} modoCompacto={modoCompacto} />
            {esColapsable && (
                <button className="tareaColapsadorBoton" onClick={() => onToggleExpandir(tarea.id)} onPointerDown={e => e.stopPropagation()} title={subtareasOcultas ? `Expandir ${numSubtareas.total} subtareas` : `Colapsar ${numSubtareas.total} subtareas`}>
                    {subtareasOcultas ? (
                        <>
                            <ChevronRight size={12} />
                            <span className="tareaColapsadorContador">
                                {numSubtareas.completadas}/{numSubtareas.total}
                            </span>
                        </>
                    ) : (
                        <span className="tareaColapsadorContador tareaColapsadorContadorExpandido">
                            {numSubtareas.completadas}/{numSubtareas.total}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
};

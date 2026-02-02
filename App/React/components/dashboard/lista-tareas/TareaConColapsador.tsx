/*
 * TareaConColapsador
 * Wrapper que añade funcionalidad de colapso de subtareas y swipe en móvil
 * Tarea 0.1: Integración de SwipeableItem para gestos móviles
 */

import React from 'react';
import {ChevronRight, Check, Trash2} from 'lucide-react';
import {Tarea, Proyecto, DatosEdicionTarea, esTareaHabito} from '../../../types/dashboard';
import {TareaItem} from '../TareaItem';
import {tieneSubtareas, contarSubtareas} from '../../../utils/jerarquiaTareas';
import {SwipeableItem} from '../../shared/SwipeableItem';
import {useEsMovil} from '../../../hooks/useEsMovil';

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

    // Hábitos - Sincronizado con TablaHabitos (Fase UI/UX)
    onEditarHabito?: (id: number) => void;
    onEliminarHabito?: (id: number) => void;
    onToggleHabito?: (id: number) => void;
    onPosponerHabito?: (id: number) => void;
    onPausarHabito?: (id: number) => void;
    onActualizarHabito?: (id: number, datos: any) => void;

    // Selección múltiple (Ctrl+Click) - TAREA 3.1
    estaSeleccionada?: boolean;
    onSeleccionMultiple?: (tarea: Tarea, evento: React.MouseEvent) => void;
}

export const TareaConColapsador: React.FC<TareaConColapsadorProps> = ({tarea, esSubtarea, tareas, tareasExpandidas, onToggleExpandir, proyectos, modoCompacto, ocultarBadgeProyecto, mensajesNoLeidos, estaCompartida, onToggleTarea, onEditarTarea, onEliminarTarea, onIndent, onOutdent, onCrearNueva, onConfigurar, onMoverProyecto, onCompartir, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPausarHabito, onActualizarHabito, estaSeleccionada, onSeleccionMultiple}) => {
    const {esMovil} = useEsMovil();
    const esHabito = esTareaHabito(tarea);
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

    /* Callbacks para swipe - Solo tareas normales, no hábitos */
    const manejarSwipeCompletar = () => {
        if (esHabito && onToggleHabito) {
            onToggleHabito((tarea as any).habitoId);
        } else {
            onToggleTarea?.(tarea.id);
        }
    };

    const manejarSwipeEliminar = () => {
        if (esHabito && onEliminarHabito) {
            onEliminarHabito((tarea as any).habitoId);
        } else {
            onEliminarTarea?.(tarea.id);
        }
    };

    /* Configuración de acciones de swipe */
    const accionCompletar = {
        color: 'var(--dashboard-estadoExito)',
        icono: <Check size={20} />,
        etiqueta: tarea.completado ? 'Reactivar' : 'Completar'
    };

    const accionEliminar = {
        color: 'var(--dashboard-estadoError)',
        icono: <Trash2 size={20} />,
        etiqueta: 'Eliminar'
    };

    /* TareaItem con todas las props */
    const tareaItemElement = (
        <TareaItem
            tarea={tarea}
            esSubtarea={esSubtarea}
            onToggle={() => onToggleTarea?.(tarea.id)}
            onEditar={datos => onEditarTarea?.(tarea.id, datos)}
            onEliminar={() => onEliminarTarea?.(tarea.id)}
            onIndent={() => onIndent(tarea.id)}
            onOutdent={() => onOutdent(tarea.id)}
            onCrearNueva={onCrearNueva}
            onConfigurar={() => onConfigurar(tarea.id)}
            nombreProyecto={nombreProyecto}
            soloIconoProyecto={ocultarBadgeProyecto}
            onMoverProyecto={() => onMoverProyecto(tarea)}
            onCompartir={() => onCompartir?.(tarea)}
            estaCompartida={estaCompartida}
            mensajesNoLeidos={mensajesNoLeidos}
            /* Props de hábitos - Sincronizado con TablaHabitos */
            onEditarHabito={onEditarHabito}
            onEliminarHabito={onEliminarHabito}
            onToggleHabito={onToggleHabito}
            onPosponerHabito={onPosponerHabito}
            onPausarHabito={onPausarHabito}
            onActualizarHabito={onActualizarHabito}
            /* Las tareas-hábito solo aparecen si NO están completadas ni pausadas */
            habitoCompletadoHoy={false}
            habitoPausado={false}
            tieneSubtareas={esColapsable}
            modoCompacto={modoCompacto}
            /* Props de selección múltiple - TAREA 3.1 */
            estaSeleccionada={estaSeleccionada}
            onSeleccionMultiple={onSeleccionMultiple}
        />
    );

    return (
        <div className={`tareaConColapsador ${modoCompacto ? 'tareaConColapsador--compacto' : ''}`} key={`wrapper-${tarea.id}`}>
            {/* En móvil: envolver con SwipeableItem para gestos */}
            {esMovil ? (
                <SwipeableItem onSwipeRight={manejarSwipeCompletar} onSwipeLeft={manejarSwipeEliminar} accionDerecha={accionCompletar} accionIzquierda={accionEliminar}>
                    {tareaItemElement}
                </SwipeableItem>
            ) : (
                tareaItemElement
            )}
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

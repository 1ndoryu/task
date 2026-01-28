/*
 * ListaTareasHabito
 * Componente para gestionar las tareas asociadas a un hábito
 * Similar a ListaTareasCompacta pero con funcionalidad de creación inline
 *
 * Fase 14.8: Subtareas de hábitos
 * - Las tareas heredan el orden definido en el hábito
 * - Se pueden reordenar con drag & drop
 * - Funcionan como tareas normales con todos sus campos
 */

import {useState, useCallback} from 'react';
import {CheckSquare, Square, Plus, Trash2, GripVertical} from 'lucide-react';
import {Reorder, useDragControls} from 'framer-motion';
import type {Tarea, DatosEdicionTarea, NivelImportancia, NivelPrioridad} from '../../../types/dashboard';

interface ListaTareasHabitoProps {
    /* Tareas asociadas al hábito */
    tareas: Tarea[];
    /* ID del hábito para crear nuevas tareas */
    habitoId: number;
    /* Callbacks */
    onToggleTarea: (id: number) => void;
    onCrearTarea: (datos: DatosEdicionTarea) => void;
    onEliminarTarea: (id: number) => void;
    onConfigurarTarea?: (tarea: Tarea) => void;
    /* Callback para actualizar el orden de las tareas en el hábito */
    onReordenarTareas?: (tareasIds: number[]) => void;
    /* Importancia del hábito para herencia */
    importancia?: NivelImportancia;
    /* Callback para editar tarea (cambiar prioridad inline) */
    onEditarTarea?: (id: number, datos: DatosEdicionTarea) => void;
}

/* Componente interno para Item reordenable */
const TareaHabitoItem = ({tarea, onToggle, onConfigurar, onEliminar, onCambiarPrioridad}: {tarea: Tarea; onToggle: (id: number) => void; onConfigurar?: (t: Tarea) => void; onEliminar: (id: number) => void; onCambiarPrioridad: (id: number, actual: NivelPrioridad) => void}) => {
    const controls = useDragControls();

    const prioridadColor = {
        alta: 'var(--rojo-500)',
        media: 'var(--naranja-500)',
        baja: 'var(--azul-500)'
    };

    const prioridadLabel = {
        alta: 'Alta',
        media: 'Media',
        baja: 'Baja'
    };

    const p = tarea.prioridad || 'media';

    return (
        <Reorder.Item value={tarea} as="div" className={`listaTareasHabito__item ${tarea.completado ? 'listaTareasHabito__item--completado' : ''}`} dragListener={false} dragControls={controls}>
            {/* Handle Drag */}
            <div className="listaTareasHabito__dragHandle" onPointerDown={e => controls.start(e)} style={{touchAction: 'none', cursor: 'grab', display: 'flex', alignItems: 'center', paddingRight: 4, color: 'var(--texto-terciario)'}}>
                <GripVertical size={14} />
            </div>

            {/* Checkbox - Cuadrado */}
            <button
                type="button"
                className="listaTareasHabito__checkbox"
                onClick={e => {
                    e.stopPropagation();
                    onToggle(tarea.id);
                }}
                onPointerDown={e => e.stopPropagation()}>
                {tarea.completado ? <CheckSquare size={16} className="iconoCheck" /> : <Square size={16} className="iconoCirculo" />}
            </button>

            {/* Texto de la tarea */}
            <span
                className="listaTareasHabito__texto"
                onClick={e => {
                    e.stopPropagation();
                    onConfigurar?.(tarea);
                }}
                onPointerDown={e => e.stopPropagation()}
                title="Click para configurar">
                {tarea.texto}
            </span>

            {/* Badge Prioridad */}
            <button
                type="button"
                className="listaTareasHabito__badgePrioridad"
                onClick={e => {
                    e.stopPropagation();
                    onCambiarPrioridad(tarea.id, p);
                }}
                style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: `${prioridadColor[p]}20`,
                    color: prioridadColor[p],
                    border: 'none',
                    marginRight: '8px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    minWidth: '45px',
                    textAlign: 'center'
                }}
                title="Cambiar prioridad">
                {prioridadLabel[p]}
            </button>

            {/* Botón eliminar */}
            <button
                type="button"
                className="listaTareasHabito__eliminar"
                onClick={e => {
                    e.stopPropagation();
                    onEliminar(tarea.id);
                }}
                onPointerDown={e => e.stopPropagation()}
                title="Eliminar">
                <Trash2 size={14} />
            </button>
        </Reorder.Item>
    );
};

export function ListaTareasHabito({tareas, habitoId, onToggleTarea, onCrearTarea, onEliminarTarea, onConfigurarTarea, onReordenarTareas, importancia, onEditarTarea}: ListaTareasHabitoProps): JSX.Element {
    const [textoNuevaTarea, setTextoNuevaTarea] = useState('');
    const [mostrarInput, setMostrarInput] = useState(false);

    /* Crear nueva tarea del hábito */
    const manejarCrearTarea = useCallback(() => {
        if (!textoNuevaTarea.trim()) return;

        /* Convertir importancia del hábito a prioridad de tarea */
        const prioridadHeredada: NivelPrioridad = (importancia?.toLowerCase() as NivelPrioridad) || 'media';

        onCrearTarea({
            texto: textoNuevaTarea.trim(),
            habitoId,
            prioridad: prioridadHeredada
        });

        setTextoNuevaTarea('');
        /* Mantener el input visible para crear más tareas */
    }, [textoNuevaTarea, habitoId, onCrearTarea, importancia]);

    /* Manejar Enter en el input */
    const manejarKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                manejarCrearTarea();
            } else if (e.key === 'Escape') {
                setMostrarInput(false);
                setTextoNuevaTarea('');
            }
        },
        [manejarCrearTarea]
    );

    /* Manejar reordenamiento */
    const manejarReorder = useCallback(
        (tareasReordenadas: Tarea[]) => {
            if (onReordenarTareas) {
                onReordenarTareas(tareasReordenadas.map(t => t.id));
            }
        },
        [onReordenarTareas]
    );

    /* Contador de progreso */
    const completadas = tareas.filter(t => t.completado).length;
    const total = tareas.length;

    return (
        <div className="listaTareasHabito listaTareasHabito--compacto">
            {/* Header con contador - solo si hay tareas */}
            {total > 0 && (
                <div className="listaTareasHabito__encabezado">
                    <span className="listaTareasHabito__titulo">Metas</span>
                    <span className="listaTareasHabito__contador">
                        {completadas}/{total}
                    </span>
                </div>
            )}

            {/* Lista de tareas con drag & drop - item completo arrastrable */}
            {tareas.length > 0 && (
                <Reorder.Group axis="y" values={tareas} onReorder={manejarReorder} className="listaTareasHabito__lista">
                    {tareas.map(tarea => (
                        <TareaHabitoItem
                            key={tarea.id}
                            tarea={tarea}
                            onToggle={onToggleTarea}
                            onConfigurar={onConfigurarTarea}
                            onEliminar={onEliminarTarea}
                            onCambiarPrioridad={(id, actual) => {
                                const ciclo: Record<NivelPrioridad, NivelPrioridad> = {
                                    baja: 'media',
                                    media: 'alta',
                                    alta: 'baja'
                                };
                                const nueva = ciclo[actual];
                                if (onEditarTarea) {
                                    onEditarTarea(id, {prioridad: nueva});
                                }
                            }}
                        />
                    ))}
                </Reorder.Group>
            )}

            {/* Mensaje vacío */}
            {tareas.length === 0 && !mostrarInput && <div className="listaTareasHabito__vacio">No hay metas o tareas para este hábito</div>}

            {/* Input para nueva tarea */}
            {mostrarInput ? (
                <div className="listaTareasHabito__inputContenedor">
                    <input
                        type="text"
                        className="listaTareasHabito__input"
                        placeholder="Ej: Bajar 5 kilos..."
                        value={textoNuevaTarea}
                        onChange={e => setTextoNuevaTarea(e.target.value)}
                        onKeyDown={manejarKeyDown}
                        onBlur={() => {
                            if (!textoNuevaTarea.trim()) {
                                setMostrarInput(false);
                            }
                        }}
                        autoFocus
                    />
                </div>
            ) : (
                <button type="button" className="listaTareasHabito__botonAgregar" onClick={() => setMostrarInput(true)}>
                    <Plus size={12} />
                    <span>Añadir</span>
                </button>
            )}
        </div>
    );
}

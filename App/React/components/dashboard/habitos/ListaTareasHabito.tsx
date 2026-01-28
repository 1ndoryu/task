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
import {CheckCircle2, Circle, Plus, Trash2} from 'lucide-react';
import {Reorder} from 'framer-motion';
import type {Tarea, DatosEdicionTarea} from '../../../types/dashboard';

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
}

export function ListaTareasHabito({tareas, habitoId, onToggleTarea, onCrearTarea, onEliminarTarea, onConfigurarTarea, onReordenarTareas}: ListaTareasHabitoProps): JSX.Element {
    const [textoNuevaTarea, setTextoNuevaTarea] = useState('');
    const [mostrarInput, setMostrarInput] = useState(false);

    /* Crear nueva tarea del hábito */
    const manejarCrearTarea = useCallback(() => {
        if (!textoNuevaTarea.trim()) return;

        onCrearTarea({
            texto: textoNuevaTarea.trim(),
            habitoId
        });

        setTextoNuevaTarea('');
        /* Mantener el input visible para crear más tareas */
    }, [textoNuevaTarea, habitoId, onCrearTarea]);

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
                        <Reorder.Item key={tarea.id} value={tarea} as="div" className={`listaTareasHabito__item ${tarea.completado ? 'listaTareasHabito__item--completado' : ''}`}>
                            {/* Checkbox - stopPropagation para no interferir con drag */}
                            <button
                                type="button"
                                className="listaTareasHabito__checkbox"
                                onClick={e => {
                                    e.stopPropagation();
                                    onToggleTarea(tarea.id);
                                }}
                                onPointerDown={e => e.stopPropagation()}>
                                {tarea.completado ? <CheckCircle2 size={14} className="iconoCheck" /> : <Circle size={14} className="iconoCirculo" />}
                            </button>

                            {/* Texto de la tarea - clickeable para configurar */}
                            <span
                                className="listaTareasHabito__texto"
                                onClick={e => {
                                    e.stopPropagation();
                                    onConfigurarTarea?.(tarea);
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                title="Click para configurar">
                                {tarea.texto}
                            </span>

                            {/* Botón eliminar - solo visible en hover */}
                            <button
                                type="button"
                                className="listaTareasHabito__eliminar"
                                onClick={e => {
                                    e.stopPropagation();
                                    onEliminarTarea(tarea.id);
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                title="Eliminar">
                                <Trash2 size={12} />
                            </button>
                        </Reorder.Item>
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

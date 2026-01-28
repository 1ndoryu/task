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

import {useState, useCallback, useEffect} from 'react';
import {CheckSquare, Square, Plus, Trash2, GripVertical, Flag} from 'lucide-react';
import {Reorder, useDragControls} from 'framer-motion';
import {MenuContextual} from '../../shared/MenuContextual';
import {ETIQUETAS_PRIORIDAD} from '../../shared/PropiedadesCompactas';
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
const TareaHabitoItem = ({tarea, onToggle, onConfigurar, onEliminar, onMenuPrioridad, onDragEnd}: {tarea: Tarea; onToggle: (id: number) => void; onConfigurar?: (t: Tarea) => void; onEliminar: (id: number) => void; onMenuPrioridad: (e: React.MouseEvent, id: number) => void; onDragEnd?: () => void}) => {
    const controls = useDragControls();
    const p = tarea.prioridad || 'media';

    return (
        <Reorder.Item value={tarea} as="div" className={`listaTareasHabito__item ${tarea.completado ? 'listaTareasHabito__item--completado' : ''}`} dragListener={false} dragControls={controls} onDragEnd={() => onDragEnd?.()} layout dragElastic={0} whileDrag={{scale: 1.02, cursor: 'grabbing'}}>
            {/* Handle Drag */}
            <div className="listaTareasHabito__dragHandle" onPointerDown={e => controls.start(e)}>
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

            {/* Badge de Prioridad - Estilo Hito (Pill) */}
            <button
                type="button"
                className={`pillOpcion listaTareasHabito__pillPrioridad ${p === 'media' ? 'listaTareasHabito__pillPrioridad--media pillOpcion--vacio' : ''} ${p === 'alta' ? 'listaTareasHabito__pillPrioridad--alta' : ''} ${p === 'baja' ? 'listaTareasHabito__pillPrioridad--baja' : ''}`}
                title={`Prioridad: ${ETIQUETAS_PRIORIDAD[p]}`}
                onClick={e => {
                    e.stopPropagation();
                    onMenuPrioridad(e, tarea.id);
                }}>
                <Flag size={12} fill={p === 'alta' ? 'currentColor' : 'none'} />
                <span>{ETIQUETAS_PRIORIDAD[p]}</span>
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

    /*
     * Estado local optimista para Drag & Drop fluido
     * Reorder de Framer Motion necesita feedback inmediato
     */
    const [tareasLocales, setTareasLocales] = useState(tareas);

    /* Sincronizar props con estado local cuando cambian externamente */
    /* Importante: Usamos JSON.stringify para comparación profunda simple y evitar loops */
    useEffect(() => {
        setTareasLocales(tareas);
    }, [tareas]);

    /* Estado para menú contextual de prioridad */
    const [menuAbiertoId, setMenuAbiertoId] = useState<number | null>(null);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});

    const abrirMenuPrioridad = (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setPosicionMenu({x: rect.left, y: rect.bottom + 4});
        setMenuAbiertoId(id);
    };

    const cerrarMenu = () => setMenuAbiertoId(null);

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

    /* Manejar reordenamiento optimista */
    const manejarReorder = (nuevoOrden: Tarea[]) => {
        setTareasLocales(nuevoOrden);
    };

    /* Manejar fin del arrastre - Solo aquí actualizamos al padre para evitar saltos */
    const manejarDragEnd = () => {
        if (onReordenarTareas) {
            onReordenarTareas(tareasLocales.map(t => t.id));
        }
    };

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
            {tareasLocales.length > 0 && (
                <Reorder.Group axis="y" values={tareasLocales} onReorder={manejarReorder} className="listaTareasHabito__lista" layoutScroll>
                    {tareasLocales.map(tarea => (
                        <TareaHabitoItem key={tarea.id} tarea={tarea} onToggle={onToggleTarea} onConfigurar={onConfigurarTarea} onEliminar={onEliminarTarea} onMenuPrioridad={abrirMenuPrioridad} onDragEnd={manejarDragEnd} />
                    ))}
                </Reorder.Group>
            )}

            {/* Menu Contextual Prioridad */}
            {menuAbiertoId && (
                <MenuContextual
                    opciones={Object.entries(ETIQUETAS_PRIORIDAD).map(([key, label]) => ({
                        id: key,
                        etiqueta: label,
                        icono: <Flag size={12} />
                    }))}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        if (onEditarTarea) {
                            onEditarTarea(menuAbiertoId, {prioridad: id as NivelPrioridad});
                        }
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
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

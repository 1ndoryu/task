/*
 * ListaSubtareas
 * Componente para gestionar subtareas dentro de la configuración de una Tarea padre.
 * Basado en ListaTareasHabito pero adaptado para tareas normales.
 */

import {useState, useCallback, useEffect} from 'react';
import {CheckSquare, Square, Plus, Trash2, GripVertical, Flag} from 'lucide-react';
import {Reorder, useDragControls} from 'framer-motion';
import {MenuContextual} from '../../shared/MenuContextual';
import {ETIQUETAS_PRIORIDAD} from '../../shared/PropiedadesCompactas';
import type {Tarea, DatosEdicionTarea, NivelPrioridad} from '../../../types/dashboard';

interface ListaSubtareasProps {
    /* Subtareas asociadas */
    tareas: Tarea[];
    /* ID de la tarea padre */
    parentId: number;
    /* Prioridad del padre para herencia */
    prioridadPadre?: NivelPrioridad;
    /* Callbacks */
    onToggleTarea: (id: number) => void;
    onCrearTarea: (datos: DatosEdicionTarea) => void;
    onEliminarTarea: (id: number) => void;
    onConfigurarTarea?: (tarea: Tarea) => void;
    onEditarTarea?: (id: number, datos: DatosEdicionTarea) => void;
    /* Callback opcional para reordenar (si se implementa en el futuro para tareas normales) */
    onReordenarTareas?: (tareasIds: number[]) => void;
}

/* Componente interno para Item reordenable */
const SubtareaItem = ({tarea, onToggle, onConfigurar, onEliminar, onMenuPrioridad, dragEnabled}: {tarea: Tarea; onToggle: (id: number) => void; onConfigurar?: (t: Tarea) => void; onEliminar: (id: number) => void; onMenuPrioridad: (e: React.MouseEvent, id: number) => void; dragEnabled: boolean}) => {
    const controls = useDragControls();
    const p = tarea.prioridad || 'media';

    const itemContent = (
        <div className={`listaTareasHabito__item ${tarea.completado ? 'listaTareasHabito__item--completado' : ''}`} style={{paddingLeft: dragEnabled ? 0 : 8}}>
            {/* Handle Drag - Solo si habilitado */}
            {dragEnabled && (
                <div className="listaTareasHabito__dragHandle" onPointerDown={e => controls.start(e)} style={{touchAction: 'none', cursor: 'grab', display: 'flex', alignItems: 'center', paddingRight: 4, color: 'var(--texto-terciario)'}}>
                    <GripVertical size={14} />
                </div>
            )}

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
                className={`pillOpcion ${p === 'media' ? 'pillOpcion--vacio' : ''}`}
                title={`Prioridad: ${ETIQUETAS_PRIORIDAD[p]}`}
                onClick={e => {
                    e.stopPropagation();
                    onMenuPrioridad(e, tarea.id);
                }}
                style={{
                    padding: '2px 8px',
                    height: '24px',
                    fontSize: '11px',
                    marginRight: '8px',
                    color: p === 'alta' ? 'var(--dashboard-estadoAlta)' : p === 'baja' ? 'var(--dashboard-estadoBaja)' : undefined,
                    borderColor: p === 'alta' ? 'var(--dashboard-estadoAlta)' : undefined,
                    background: 'transparent'
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
        </div>
    );

    if (dragEnabled) {
        return (
            <Reorder.Item value={tarea} as="div" dragListener={false} dragControls={controls}>
                {itemContent}
            </Reorder.Item>
        );
    }

    return <div>{itemContent}</div>;
};

export function ListaSubtareas({tareas, parentId, prioridadPadre, onToggleTarea, onCrearTarea, onEliminarTarea, onConfigurarTarea, onReordenarTareas, onEditarTarea}: ListaSubtareasProps): JSX.Element {
    const [textoNuevaTarea, setTextoNuevaTarea] = useState('');
    const [mostrarInput, setMostrarInput] = useState(false);

    /* Estado local optimista */
    const [tareasLocales, setTareasLocales] = useState(tareas);

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

    /* Crear nueva subtarea */
    const manejarCrearTarea = useCallback(() => {
        if (!textoNuevaTarea.trim()) return;

        onCrearTarea({
            texto: textoNuevaTarea.trim(),
            parentId: parentId,
            prioridad: prioridadPadre || 'media'
        });

        setTextoNuevaTarea('');
    }, [textoNuevaTarea, parentId, onCrearTarea, prioridadPadre]);

    /* Manejar Enter */
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
        if (onReordenarTareas) {
            onReordenarTareas(nuevoOrden.map(t => t.id));
        }
    };

    const completadas = tareas.filter(t => t.completado).length;
    const total = tareas.length;

    return (
        <div className="listaTareasHabito listaTareasHabito--compacto">
            {/* Header con contador */}
            <div className="listaTareasHabito__encabezado">
                <span className="listaTareasHabito__titulo">Subtareas</span>
                {total > 0 && (
                    <span className="listaTareasHabito__contador">
                        {completadas}/{total}
                    </span>
                )}
            </div>

            {/* Lista */}
            {tareasLocales.length > 0 &&
                (onReordenarTareas ? (
                    <Reorder.Group axis="y" values={tareasLocales} onReorder={manejarReorder} className="listaTareasHabito__lista">
                        {tareasLocales.map(tarea => (
                            <SubtareaItem key={tarea.id} tarea={tarea} onToggle={onToggleTarea} onConfigurar={onConfigurarTarea} onEliminar={onEliminarTarea} onMenuPrioridad={abrirMenuPrioridad} dragEnabled={true} />
                        ))}
                    </Reorder.Group>
                ) : (
                    <div className="listaTareasHabito__lista">
                        {tareasLocales.map(tarea => (
                            <SubtareaItem key={tarea.id} tarea={tarea} onToggle={onToggleTarea} onConfigurar={onConfigurarTarea} onEliminar={onEliminarTarea} onMenuPrioridad={abrirMenuPrioridad} dragEnabled={false} />
                        ))}
                    </div>
                ))}

            {/* Empty State */}
            {tareas.length === 0 && !mostrarInput && <div className="listaTareasHabito__vacio">No hay subtareas</div>}

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

            {/* Input */}
            {mostrarInput ? (
                <div className="listaTareasHabito__inputContenedor">
                    <input
                        type="text"
                        className="listaTareasHabito__input"
                        placeholder="Nueva subtarea..."
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
                    <span>Añadir subtarea</span>
                </button>
            )}
        </div>
    );
}

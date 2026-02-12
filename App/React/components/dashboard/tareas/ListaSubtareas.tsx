/*
 * ListaSubtareas
 * Componente para gestionar subtareas dentro de la configuración de una Tarea padre.
 * Basado en ListaTareasHabito pero adaptado para tareas normales.
 */

import {useState, useCallback, useEffect} from 'react';
import {Check, Plus, Trash2, Flag} from 'lucide-react';
import {Boton} from '../../ui';
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

/* Componente interno para Item (sin drag) */
const SubtareaItem = ({tarea, onToggle, onConfigurar, onEliminar, onMenuPrioridad}: {tarea: Tarea; onToggle: (id: number) => void; onConfigurar?: (t: Tarea) => void; onEliminar: (id: number) => void; onMenuPrioridad: (e: React.MouseEvent, id: number) => void}) => {
    const p = tarea.prioridad || 'media';

    return (
        <div className={`listaTareasHabito__item ${tarea.completado ? 'listaTareasHabito__item--completado' : ''} listaTareasHabito__item--sinDrag`}>
            {/* Checkbox - Estilo unificado con TareaItem */}
            <div
                className={`tareaCheckbox ${tarea.completado ? 'tareaCheckboxCompletado' : ''}`}
                onClick={e => {
                    e.stopPropagation();
                    onToggle(tarea.id);
                }}
                onPointerDown={e => e.stopPropagation()}>
                {tarea.completado && <Check size={10} color="white" />}
            </div>

            {/* Contenido (Texto + Badge) */}
            <div className="listaTareasHabito__contenido">
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

                {
                    /* Badge de Prioridad - Estilo Panel Ejecucion (Texto) */
                    p && p !== 'media' && (
                        <button
                            type="button"
                            className={`badgeInfo badgeInfo--prioridad${p === 'muy_alta' ? 'MuyAlta' : p.charAt(0).toUpperCase() + p.slice(1)} badgeInfoClickable`}
                            style={{marginLeft: 4, height: 16, fontSize: '0.65rem', padding: '0 4px'}}
                            title={`Prioridad: ${ETIQUETAS_PRIORIDAD[p]}`}
                            onClick={e => {
                                e.stopPropagation();
                                onMenuPrioridad(e, tarea.id);
                            }}>
                            <span className="badgeInfoTexto">{ETIQUETAS_PRIORIDAD[p].toUpperCase()}</span>
                        </button>
                    )
                }
            </div>

            {/* Botón eliminar */}
            <Boton
                variante="icono"
                onClick={e => {
                    e.stopPropagation();
                    onEliminar(tarea.id);
                }}
                icono={<Trash2 size={14} />}
                title="Eliminar"
                claseAdicional="listaTareasHabito__eliminar"
            />
        </div>
    );
};

export function ListaSubtareas({tareas, parentId, prioridadPadre, onToggleTarea, onCrearTarea, onEliminarTarea, onConfigurarTarea, onReordenarTareas, onEditarTarea}: ListaSubtareasProps): JSX.Element {
    const [textoNuevaTarea, setTextoNuevaTarea] = useState('');
    const [mostrarInput, setMostrarInput] = useState(false);

    /* Estado local optimista */
    const [tareasLocales, setTareasLocales] = useState(tareas);

    useEffect(() => {
        /* Ordenar por prioridad: Muy Alta > Alta > Media > Baja */
        const peso: Record<string, number> = {muy_alta: 4, alta: 3, media: 2, baja: 1};
        const tareasOrdenadas = [...tareas].sort((a, b) => {
            const pesoA = peso[a.prioridad || 'media'] || 2;
            const pesoB = peso[b.prioridad || 'media'] || 2;
            return pesoB - pesoA;
        });
        setTareasLocales(tareasOrdenadas);
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

            {/* Lista solo visual (sin DnD) */}
            {tareasLocales.length > 0 && (
                <div className="listaTareasHabito__lista">
                    {tareasLocales.map(tarea => (
                        <SubtareaItem key={tarea.id} tarea={tarea} onToggle={onToggleTarea} onConfigurar={onConfigurarTarea} onEliminar={onEliminarTarea} onMenuPrioridad={abrirMenuPrioridad} />
                    ))}
                </div>
            )}

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
                <form
                    className="listaTareasHabito__inputContenedor"
                    onSubmit={e => {
                        e.preventDefault();
                        manejarCrearTarea();
                    }}>
                    <input
                        type="text"
                        className="listaTareasHabito__input"
                        placeholder="Nueva subtarea..."
                        value={textoNuevaTarea}
                        onChange={e => setTextoNuevaTarea(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') {
                                setMostrarInput(false);
                                setTextoNuevaTarea('');
                            }
                        }}
                        onBlur={() => {
                            /* Timeout para permitir que el evento de submit se procese antes del blur si es por Enter/Click */
                            if (!textoNuevaTarea.trim()) {
                                setTimeout(() => setMostrarInput(false), 150);
                            }
                        }}
                        autoFocus
                    />
                </form>
            ) : (
                <Boton
                    variante="secundario"
                    onClick={() => setMostrarInput(true)}
                    icono={<Plus size={12} />}
                    claseAdicional="listaTareasHabito__botonAgregar"
                >
                    Añadir subtarea
                </Boton>
            )}
        </div>
    );
}

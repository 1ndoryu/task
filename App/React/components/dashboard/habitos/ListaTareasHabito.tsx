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
import {Check, Plus, Trash2} from 'lucide-react';
import {Boton, Input} from '../../ui';
import {MenuContextual} from '../../shared/MenuContextual';
import {ETIQUETAS_PRIORIDAD, opcionesMenuPrioridad} from '../../../utils/nivelesConfig';
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

/* Componente interno para Item (sin drag) */
const TareaHabitoItem = ({tarea, onToggle, onConfigurar, onEliminar, onMenuPrioridad}: {tarea: Tarea; onToggle: (id: number) => void; onConfigurar?: (t: Tarea) => void; onEliminar: (id: number) => void; onMenuPrioridad: (e: React.MouseEvent, id: number) => void}) => {
    const p = tarea.prioridad || 'media';

    return (
        <div className={`listaTareasHabito__item ${tarea.completado ? 'listaTareasHabito__item--completado' : ''}`}>
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

                {/* Badge de Prioridad - Estilo Panel Ejecucion (Texto) */}
                {p && p !== 'media' && (
                    <Boton
                        variante="icono"
                        onClick={e => {
                            e.stopPropagation();
                            onMenuPrioridad(e, tarea.id);
                        }}
                        title={`Prioridad: ${ETIQUETAS_PRIORIDAD[p]}`}
                        claseAdicional={`badgeInfo badgeInfo--prioridad${p === 'muy_alta' ? 'MuyAlta' : p.charAt(0).toUpperCase() + p.slice(1)} badgeInfoClickable`}
                    >
                        <span className="badgeInfoTexto">{ETIQUETAS_PRIORIDAD[p].toUpperCase()}</span>
                    </Boton>
                )}
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
            />
        </div>
    );
};

export function ListaTareasHabito({tareas, habitoId, onToggleTarea, onCrearTarea, onEliminarTarea, onConfigurarTarea, onReordenarTareas: _onReordenarTareas, importancia, onEditarTarea}: ListaTareasHabitoProps): JSX.Element {
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

            {/* Lista de tareas (sin drag) */}
            {tareasLocales.length > 0 && (
                <div className="listaTareasHabito__lista">
                    {tareasLocales.map(tarea => (
                        <TareaHabitoItem key={tarea.id} tarea={tarea} onToggle={onToggleTarea} onConfigurar={onConfigurarTarea} onEliminar={onEliminarTarea} onMenuPrioridad={abrirMenuPrioridad} />
                    ))}
                </div>
            )}

            {/* Menu Contextual Prioridad */}
            {menuAbiertoId && (
                <MenuContextual
                    opciones={opcionesMenuPrioridad(12)}
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
                <form
                    className="listaTareasHabito__inputContenedor"
                    onSubmit={e => {
                        e.preventDefault();
                        manejarCrearTarea();
                    }}>
                    <Input
                        tipo="text"
                        claseAdicional="listaTareasHabito__input"
                        placeholder="Leer un libro..."
                        value={textoNuevaTarea}
                        onChange={e => setTextoNuevaTarea(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') {
                                setMostrarInput(false);
                                setTextoNuevaTarea('');
                            }
                        }}
                        onBlur={() => {
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
                >
                    Añadir
                </Boton>
            )}
        </div>
    );
}

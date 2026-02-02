/*
 * ListaSubHabitos
 * Componente para gestionar subhábitos dentro de la configuración de un Hábito padre.
 * Usa los mismos estilos CSS que ListaSubtareas (listaTareasHabito__*) para consistencia visual.
 * Los subhábitos heredan frecuencia e importancia del padre al crearse.
 */

import {useState, useCallback} from 'react';
import {Check, Plus, Trash2} from 'lucide-react';
import type {SubHabito, NivelImportancia, FrecuenciaHabito, DatosNuevoSubHabito} from '../../../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../../../types/dashboard';
import {obtenerFechaHoy} from '../../../utils/fecha';

interface ListaSubHabitosProps {
    subhabitos: SubHabito[];
    onCrear: (datos: DatosNuevoSubHabito) => void;
    onEditar: (subHabitoId: number, datos: DatosNuevoSubHabito) => void;
    onEliminar: (subHabitoId: number) => void;
    onToggle: (subHabitoId: number) => void;
    importanciaPadre: NivelImportancia;
    frecuenciaPadre?: FrecuenciaHabito;
}

/*
 * Fila individual de subhábito - Usa clases listaTareasHabito__* para consistencia con subtareas
 */
interface FilaSubHabitoProps {
    subhabito: SubHabito;
    onToggle: () => void;
    onEliminar: () => void;
}

function FilaSubHabito({subhabito, onToggle, onEliminar}: FilaSubHabitoProps): JSX.Element {
    const hoy = obtenerFechaHoy();
    const completadoHoy = subhabito.ultimoCompletado === hoy;

    return (
        <div className={`listaTareasHabito__item ${completadoHoy ? 'listaTareasHabito__item--completado' : ''} listaTareasHabito__item--sinDrag`}>
            {/* Checkbox - Estilo unificado con tareaCheckbox */}
            <div
                className={`tareaCheckbox ${completadoHoy ? 'tareaCheckboxCompletado' : ''}`}
                onClick={e => {
                    e.stopPropagation();
                    onToggle();
                }}
                onPointerDown={e => e.stopPropagation()}>
                {completadoHoy && <Check size={10} color="white" />}
            </div>

            {/* Contenido (Texto) */}
            <div className="listaTareasHabito__contenido">
                <span className="listaTareasHabito__texto">{subhabito.nombre}</span>
                {/* Badge de racha si tiene */}
                {subhabito.racha > 0 && (
                    <span className="badgeInfo badgeInfo--racha" style={{marginLeft: 4, height: 16, fontSize: '0.65rem', padding: '0 4px'}}>
                        <span className="badgeInfoTexto">🔥 {subhabito.racha}</span>
                    </span>
                )}
            </div>

            {/* Botón eliminar */}
            <button
                type="button"
                className="listaTareasHabito__eliminar"
                onClick={e => {
                    e.stopPropagation();
                    onEliminar();
                }}
                onPointerDown={e => e.stopPropagation()}
                title="Eliminar">
                <Trash2 size={14} />
            </button>
        </div>
    );
}

/*
 * Lista principal de subhábitos - Usa clases listaTareasHabito__* para consistencia con subtareas
 */
export function ListaSubHabitos({subhabitos, onCrear, onEliminar, onToggle, importanciaPadre, frecuenciaPadre}: ListaSubHabitosProps): JSX.Element {
    const [textoNuevo, setTextoNuevo] = useState('');
    const [mostrarInput, setMostrarInput] = useState(false);

    /* Crear nuevo subhábito - hereda propiedades del padre */
    const manejarCrear = useCallback(() => {
        if (!textoNuevo.trim()) return;

        onCrear({
            nombre: textoNuevo.trim(),
            importancia: importanciaPadre,
            frecuencia: frecuenciaPadre || FRECUENCIA_POR_DEFECTO
        });

        setTextoNuevo('');
    }, [textoNuevo, onCrear, importanciaPadre, frecuenciaPadre]);

    /* Manejar Enter para guardar, Escape para cancelar */
    const manejarKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                manejarCrear();
            } else if (e.key === 'Escape') {
                setMostrarInput(false);
                setTextoNuevo('');
            }
        },
        [manejarCrear]
    );

    const hoy = obtenerFechaHoy();
    const completados = subhabitos.filter(sh => sh.ultimoCompletado === hoy).length;
    const total = subhabitos.length;

    return (
        <div className="listaTareasHabito listaTareasHabito--compacto">
            {/* Header con contador - Sin colapsar */}
            <div className="listaTareasHabito__encabezado">
                <span className="listaTareasHabito__titulo">Subhábitos</span>
                {total > 0 && (
                    <span className="listaTareasHabito__contador">
                        {completados}/{total}
                    </span>
                )}
            </div>

            {/* Lista de subhábitos */}
            {subhabitos.length > 0 && (
                <div className="listaTareasHabito__lista">
                    {subhabitos.map(sh => (
                        <FilaSubHabito key={sh.id} subhabito={sh} onToggle={() => onToggle(sh.id)} onEliminar={() => onEliminar(sh.id)} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {subhabitos.length === 0 && !mostrarInput && <div className="listaTareasHabito__vacio">No hay subhábitos</div>}

            {/* Input simple - Enter para guardar */}
            {mostrarInput ? (
                <div className="listaTareasHabito__inputContenedor">
                    <input
                        type="text"
                        className="listaTareasHabito__input"
                        placeholder="Nuevo subhábito..."
                        value={textoNuevo}
                        onChange={e => setTextoNuevo(e.target.value)}
                        onKeyDown={manejarKeyDown}
                        onBlur={() => {
                            if (!textoNuevo.trim()) {
                                setMostrarInput(false);
                            }
                        }}
                        autoFocus
                    />
                </div>
            ) : (
                <button type="button" className="listaTareasHabito__botonAgregar" onClick={() => setMostrarInput(true)}>
                    <Plus size={12} />
                    <span>Añadir subhábito</span>
                </button>
            )}
        </div>
    );
}

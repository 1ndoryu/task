/*
 * ListaSubHabitos
 * Componente para mostrar y gestionar subhábitos dentro de un hábito padre
 * Los subhábitos son hábitos anidados con frecuencia e importancia independiente
 * Solo permite un nivel de anidación (sin subhábitos recursivos)
 */

import {useState, useCallback} from 'react';
import {Plus, Check, ChevronDown, ChevronRight, Trash2, Edit2} from 'lucide-react';
import type {SubHabito, NivelImportancia, FrecuenciaHabito, DatosNuevoSubHabito} from '../../../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../../../types/dashboard';
import {obtenerFechaHoy} from '../../../utils/fecha';
import {describirFrecuencia} from '../../../utils/frecuenciaHabitos';
import {SelectorImportanciaPill, SelectorFrecuenciaPill} from '../../shared';

interface ListaSubHabitosProps {
    subhabitos: SubHabito[];
    onCrear: (datos: DatosNuevoSubHabito) => void;
    onEditar: (subHabitoId: number, datos: DatosNuevoSubHabito) => void;
    onEliminar: (subHabitoId: number) => void;
    onToggle: (subHabitoId: number) => void;
    importanciaPadre: NivelImportancia;
    frecuenciaPadre?: FrecuenciaHabito;
}

interface FormularioSubHabitoProps {
    datosIniciales?: DatosNuevoSubHabito;
    importanciaPadre: NivelImportancia;
    frecuenciaPadre?: FrecuenciaHabito;
    onGuardar: (datos: DatosNuevoSubHabito) => void;
    onCancelar: () => void;
    modoEdicion?: boolean;
}

/*
 * Formulario inline para crear/editar subhábitos
 */
function FormularioSubHabito({datosIniciales, importanciaPadre, frecuenciaPadre, onGuardar, onCancelar, modoEdicion = false}: FormularioSubHabitoProps): JSX.Element {
    const [nombre, setNombre] = useState(datosIniciales?.nombre || '');
    const [importancia, setImportancia] = useState<NivelImportancia>(datosIniciales?.importancia || importanciaPadre);
    const [frecuencia, setFrecuencia] = useState<FrecuenciaHabito>(datosIniciales?.frecuencia || frecuenciaPadre || FRECUENCIA_POR_DEFECTO);

    const manejarSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        onGuardar({nombre: nombre.trim(), importancia, frecuencia});
    };

    return (
        <form onSubmit={manejarSubmit} className="formularioSubHabito">
            <div className="formularioSubHabito__campos">
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del subhábito" className="formularioSubHabito__input" autoFocus />
            </div>
            <div className="formularioSubHabito__propiedades">
                <SelectorImportanciaPill importancia={importancia} onChange={setImportancia} />
                <SelectorFrecuenciaPill frecuencia={frecuencia} onChange={setFrecuencia} />
            </div>
            <div className="formularioSubHabito__acciones">
                <button type="button" onClick={onCancelar} className="formularioSubHabito__boton formularioSubHabito__boton--cancelar">
                    Cancelar
                </button>
                <button type="submit" disabled={!nombre.trim()} className="formularioSubHabito__boton formularioSubHabito__boton--guardar">
                    {modoEdicion ? 'Guardar' : 'Añadir'}
                </button>
            </div>
        </form>
    );
}

/*
 * Fila individual de subhábito
 */
interface FilaSubHabitoProps {
    subhabito: SubHabito;
    onToggle: () => void;
    onEditar: () => void;
    onEliminar: () => void;
}

function FilaSubHabito({subhabito, onToggle, onEditar, onEliminar}: FilaSubHabitoProps): JSX.Element {
    const hoy = obtenerFechaHoy();
    const completadoHoy = subhabito.ultimoCompletado === hoy;
    const frecuenciaTexto = describirFrecuencia(subhabito.frecuencia || FRECUENCIA_POR_DEFECTO);

    return (
        <div className={`subHabitoFila ${completadoHoy ? 'subHabitoFila--completado' : ''}`}>
            <button type="button" className={`subHabitoFila__check ${completadoHoy ? 'subHabitoFila__check--activo' : ''}`} onClick={onToggle} title={completadoHoy ? 'Desmarcar' : 'Completar hoy'}>
                {completadoHoy && <Check size={12} />}
            </button>
            <div className="subHabitoFila__contenido">
                <span className="subHabitoFila__nombre">{subhabito.nombre}</span>
                <div className="subHabitoFila__meta">
                    <span className="subHabitoFila__importancia subHabitoFila__importancia--{subhabito.importancia.toLowerCase().replace(' ', '')}">{subhabito.importancia}</span>
                    <span className="subHabitoFila__frecuencia">{frecuenciaTexto}</span>
                    {subhabito.racha > 0 && <span className="subHabitoFila__racha">🔥 {subhabito.racha}</span>}
                </div>
            </div>
            <div className="subHabitoFila__acciones">
                <button type="button" onClick={onEditar} className="subHabitoFila__boton" title="Editar">
                    <Edit2 size={12} />
                </button>
                <button type="button" onClick={onEliminar} className="subHabitoFila__boton subHabitoFila__boton--eliminar" title="Eliminar">
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}

/*
 * Lista principal de subhábitos
 */
export function ListaSubHabitos({subhabitos, onCrear, onEditar, onEliminar, onToggle, importanciaPadre, frecuenciaPadre}: ListaSubHabitosProps): JSX.Element {
    const [expandido, setExpandido] = useState(true);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);

    const manejarCrear = useCallback(
        (datos: DatosNuevoSubHabito) => {
            onCrear(datos);
            setMostrarFormulario(false);
        },
        [onCrear]
    );

    const manejarEditar = useCallback(
        (subHabitoId: number, datos: DatosNuevoSubHabito) => {
            onEditar(subHabitoId, datos);
            setEditandoId(null);
        },
        [onEditar]
    );

    const subhabitoEditando = editandoId !== null ? subhabitos.find(sh => sh.id === editandoId) : null;

    return (
        <div className="listaSubHabitos">
            {/* Encabezado colapsable */}
            <button type="button" className="listaSubHabitos__encabezado" onClick={() => setExpandido(!expandido)}>
                {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="listaSubHabitos__titulo">Subhábitos</span>
                <span className="listaSubHabitos__contador">{subhabitos.length}</span>
            </button>

            {expandido && (
                <div className="listaSubHabitos__contenido">
                    {/* Lista de subhábitos */}
                    {subhabitos.map(sh =>
                        editandoId === sh.id ? (
                            <FormularioSubHabito
                                key={sh.id}
                                datosIniciales={{nombre: sh.nombre, importancia: sh.importancia, frecuencia: sh.frecuencia}}
                                importanciaPadre={importanciaPadre}
                                frecuenciaPadre={frecuenciaPadre}
                                onGuardar={datos => manejarEditar(sh.id, datos)}
                                onCancelar={() => setEditandoId(null)}
                                modoEdicion
                            />
                        ) : (
                            <FilaSubHabito key={sh.id} subhabito={sh} onToggle={() => onToggle(sh.id)} onEditar={() => setEditandoId(sh.id)} onEliminar={() => onEliminar(sh.id)} />
                        )
                    )}

                    {/* Formulario de creación */}
                    {mostrarFormulario ? (
                        <FormularioSubHabito importanciaPadre={importanciaPadre} frecuenciaPadre={frecuenciaPadre} onGuardar={manejarCrear} onCancelar={() => setMostrarFormulario(false)} />
                    ) : (
                        <button type="button" className="listaSubHabitos__botonAnadir" onClick={() => setMostrarFormulario(true)}>
                            <Plus size={14} />
                            <span>Añadir subhábito</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

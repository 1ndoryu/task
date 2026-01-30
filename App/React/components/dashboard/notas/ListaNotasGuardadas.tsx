import {Clock, Trash2, Edit2} from 'lucide-react';
import type {Nota} from '../../../types/notas';
import {formatearFechaRelativa} from '../../../utils/fecha';

interface ListaNotasGuardadasProps {
    notas: Nota[];
    modo: 'grid' | 'lista';
    notaActivaId?: number | null;
    onSeleccionar: (nota: Nota) => void;
    onEliminar: (id: number) => void;
}

export function ListaNotasGuardadas({notas, modo, notaActivaId = null, onSeleccionar, onEliminar}: ListaNotasGuardadasProps): JSX.Element {
    if (modo === 'grid') {
        return (
            <div className="modalNotasGrid">
                {notas.map(nota => (
                    <div key={nota.id} className="modalNotasItem" onClick={() => onSeleccionar(nota)}>
                        <button
                            className="modalNotasItemEliminar"
                            onClick={e => {
                                e.stopPropagation();
                                onEliminar(nota.id);
                            }}
                            title="Eliminar nota">
                            <Trash2 size={14} />
                        </button>
                        <div className="modalNotasItemContenido">
                            <div className="modalNotasItemTitulo">{nota.titulo}</div>
                            {/* Fecha de creación debajo del título */}
                            <div className="modalNotasItemFechaCreacion">
                                <Clock size={10} />
                                <span>{formatearFechaRelativa(nota.fechaCreacion)}</span>
                            </div>
                            <div className="modalNotasItemPreview">
                                {nota.contenido.slice(0, 150)}
                                {nota.contenido.length > 150 ? '...' : ''}
                            </div>
                            {/* Fecha de modificación y contador de caracteres */}
                            <div className="modalNotasItemMetasInferiores">
                                <div className="modalNotasItemContador">{nota.contenido.length}</div>
                                <div className="modalNotasItemFechaModificacion">
                                    <Edit2 size={9} />
                                    <span>{formatearFechaRelativa(nota.fechaModificacion)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="listaNotasGuardadas">
            {notas.map(nota => (
                <div key={nota.id} className={`listaNotasItem ${notaActivaId === nota.id ? 'listaNotasItem--activo' : ''}`} onClick={() => onSeleccionar(nota)}>
                    <div className="listaNotasItemPrincipal">
                        <div className="listaNotasItemTitulo">{nota.titulo}</div>
                        {/* Fecha de creación debajo del título */}
                        <div className="listaNotasItemFechaCreacion">
                            <Clock size={10} />
                            <span>{formatearFechaRelativa(nota.fechaCreacion)}</span>
                        </div>
                        <div className="listaNotasItemPreview">
                            {nota.contenido.slice(0, 120)}
                            {nota.contenido.length > 120 ? '...' : ''}
                        </div>
                    </div>
                    <div className="listaNotasItemMetas">
                        {/* Fecha de modificación y contador */}
                        <div className="listaNotasItemMetasInferiores">
                            <span className="listaNotasItemContador">{nota.contenido.length}</span>
                            <div className="listaNotasItemFechaModificacion">
                                <Edit2 size={9} />
                                <span>{formatearFechaRelativa(nota.fechaModificacion)}</span>
                            </div>
                        </div>
                        <button
                            className="listaNotasItemEliminar"
                            onClick={e => {
                                e.stopPropagation();
                                onEliminar(nota.id);
                            }}
                            title="Eliminar nota">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

import {Clock, Trash2} from 'lucide-react';
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
                            <div className="modalNotasItemPreview">
                                {nota.contenido.slice(0, 150)}
                                {nota.contenido.length > 150 ? '...' : ''}
                            </div>
                            <div className="modalNotasItemFecha">
                                <Clock size={10} />
                                <span>{formatearFechaRelativa(nota.fechaModificacion)}</span>
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
                        <div className="listaNotasItemPreview">
                            {nota.contenido.slice(0, 120)}
                            {nota.contenido.length > 120 ? '...' : ''}
                        </div>
                    </div>
                    <div className="listaNotasItemMetas">
                        <div className="listaNotasItemFecha">
                            <Clock size={10} />
                            <span>{formatearFechaRelativa(nota.fechaModificacion)}</span>
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

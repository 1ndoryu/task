import {Clock, Trash2, Edit2} from 'lucide-react';
import {Boton} from '../../ui';
import type {Nota, CarpetaNota} from '../../../types/notas';
import {formatearFechaRelativa} from '../../../utils/fechaUI';
import {NotaItem} from './NotaItem';

interface ListaNotasGuardadasProps {
    notas: Nota[];
    modo: 'grid' | 'lista';
    notaActivaId?: number | null;
    onSeleccionar: (nota: Nota) => void;
    onEliminar: (id: number) => void;
    carpetas?: CarpetaNota[];
    onMoverNota?: (notaId: number, carpetaId: number | null) => Promise<boolean>;
}

export function ListaNotasGuardadas({notas, modo, notaActivaId = null, onSeleccionar, onEliminar, carpetas = [], onMoverNota}: ListaNotasGuardadasProps): JSX.Element {
    if (modo === 'grid') {
        return (
            <div className="modalNotasGrid">
                {notas.map(nota => (
                    <div key={nota.id} className="modalNotasItem" onClick={() => onSeleccionar(nota)}>
                        <Boton
                            claseAdicional="modalNotasItemEliminar"
                            onClick={e => {
                                e.stopPropagation();
                                onEliminar(nota.id);
                            }}
                            title="Eliminar nota">
                            <Trash2 size={14} />
                        </Boton>
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
                <NotaItem key={nota.id} nota={nota} activa={notaActivaId === nota.id} onSeleccionar={onSeleccionar} onEliminar={onEliminar} carpetas={carpetas} onMoverNota={onMoverNota} />
            ))}
        </div>
    );
}

import {useState, useEffect, useCallback, useMemo} from 'react';
import {Search, FileText, Loader, AlertCircle} from 'lucide-react';
import {Modal} from '../../shared';
import {Scratchpad} from '../Scratchpad';
import {ListaNotasGuardadas} from './ListaNotasGuardadas';
import type {Nota} from '../../../types/notas';
import type {TamanoFuente} from '../../../hooks/useConfiguracionScratchpad';

interface ModalNotasExpandidoProps {
    abierto: boolean;
    onCerrar: () => void;
    tamanoFuente: TamanoFuente;
    delayGuardado: number;
}

import {useNotasStore} from '../../../stores/notasStore';
import {extraerTitulo} from '../../../utils/notasUtils';

export function ModalNotasExpandido({abierto, onCerrar, tamanoFuente, delayGuardado}: ModalNotasExpandidoProps): JSX.Element | null {
    /* Estado global de notas */
    const notas = useNotasStore(s => s.notas);
    const notaActiva = useNotasStore(s => s.notaActiva);
    const total = useNotasStore(s => s.total);
    const cargando = useNotasStore(s => s.cargando);
    const error = useNotasStore(s => s.error);
    const cargarNotas = useNotasStore(s => s.cargarNotas);
    const eliminarNota = useNotasStore(s => s.eliminarNota);
    const buscarNotas = useNotasStore(s => s.buscarNotas);
    const seleccionarNota = useNotasStore(s => s.seleccionarNota);
    const actualizarContenido = useNotasStore(s => s.actualizarContenidoNotaActiva);
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState<Nota[] | null>(null);
    const [buscando, setBuscando] = useState(false);

    useEffect(() => {
        if (abierto) {
            cargarNotas();
            setTerminoBusqueda('');
            setResultadosBusqueda(null);
        }
    }, [abierto, cargarNotas]);

    useEffect(() => {
        if (!terminoBusqueda.trim()) {
            setResultadosBusqueda(null);
            return;
        }

        const timeout = setTimeout(async () => {
            setBuscando(true);
            const resultados = await buscarNotas(terminoBusqueda);
            setResultadosBusqueda(resultados);
            setBuscando(false);
        }, 300);

        return () => clearTimeout(timeout);
    }, [terminoBusqueda, buscarNotas]);

    const manejarEliminar = useCallback(
        (notaId: number) => {
            eliminarNota(notaId);
        },
        [eliminarNota]
    );

    const notasMostrar = resultadosBusqueda ?? notas;
    const tituloActivo = useMemo(() => extraerTitulo(notaActiva.contenido), [notaActiva.contenido]);

    if (!abierto) return null;

    return (
        <Modal estaAbierto={abierto} titulo="Notas Guardadas" onCerrar={onCerrar} claseExtra="modalContenedor--expandido modalNotasExpandidoContenedor">
            <div id="modal-notas-expandida" className="vistaNotasExpandida">
                <div className="vistaNotasColumnaLista">
                    <div className="vistaNotasBusqueda">
                        <div className="modalNotasBusqueda">
                            <Search size={14} className="modalNotasBusquedaIcono" />
                            <input type="text" className="modalNotasBusquedaInput" placeholder="Buscar notas..." value={terminoBusqueda} onChange={e => setTerminoBusqueda(e.target.value)} autoFocus />
                            {buscando && <Loader size={14} className="modalNotasBusquedaLoader animacionGirar" />}
                        </div>
                    </div>
                    <div className="vistaNotasListaContenido">
                        {cargando && !notas.length ? (
                            <div className="modalNotasVacio">
                                <Loader size={24} className="animacionGirar" />
                                <span>Cargando notas...</span>
                            </div>
                        ) : error ? (
                            <div className="modalNotasError">
                                <AlertCircle size={24} />
                                <span>{error}</span>
                            </div>
                        ) : notasMostrar.length === 0 ? (
                            <div className="modalNotasVacio">
                                <FileText size={32} />
                                <span>{terminoBusqueda ? 'No se encontraron notas' : 'No tienes notas guardadas'}</span>
                                {!terminoBusqueda && <p>Guarda notas desde el Scratchpad usando el botón de guardar</p>}
                            </div>
                        ) : (
                            <ListaNotasGuardadas notas={notasMostrar} modo="lista" notaActivaId={notaActiva.id} onSeleccionar={seleccionarNota} onEliminar={manejarEliminar} />
                        )}
                    </div>
                    {notasMostrar.length > 0 && (
                        <div className="modalNotasFooter">
                            <span>{resultadosBusqueda ? `${resultadosBusqueda.length} resultados` : `${total} nota${total !== 1 ? 's' : ''} guardada${total !== 1 ? 's' : ''}`}</span>
                        </div>
                    )}
                </div>
                <div className="vistaNotasColumnaEditor">
                    <div className="vistaNotasEditorContenido">
                        <Scratchpad valorInicial={notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={tamanoFuente} altura="100%" delayGuardado={delayGuardado} mostrarResizeHandle={false} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

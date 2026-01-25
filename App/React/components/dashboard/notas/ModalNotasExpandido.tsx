import {useState, useEffect, useCallback, useMemo} from 'react';
import {Search, FileText, Loader, AlertCircle} from 'lucide-react';
import {Modal} from '../../shared';
import {Scratchpad} from '../Scratchpad';
import {ListaNotasGuardadas} from './ListaNotasGuardadas';
import type {Nota, NotaActiva} from '../../../hooks/useNotas';
import type {TamanoFuente} from '../../../hooks/useConfiguracionScratchpad';

interface EstadoNotas {
    cargando: boolean;
    error: string | null;
    notas: Nota[];
    total: number;
    notaActiva: NotaActiva;
}

interface ModalNotasExpandidoProps {
    abierto: boolean;
    onCerrar: () => void;
    estado: EstadoNotas;
    cargarNotas: () => Promise<void>;
    eliminarNota: (id: number) => Promise<boolean>;
    buscarNotas: (termino: string) => Promise<Nota[]>;
    seleccionarNota: (nota: Nota) => void;
    actualizarContenido: (contenido: string) => void;
    obtenerTituloDeContenido: (contenido: string) => string;
    tamanoFuente: TamanoFuente;
    delayGuardado: number;
}

export function ModalNotasExpandido({abierto, onCerrar, estado, cargarNotas, eliminarNota, buscarNotas, seleccionarNota, actualizarContenido, obtenerTituloDeContenido, tamanoFuente, delayGuardado}: ModalNotasExpandidoProps): JSX.Element | null {
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

    const notasMostrar = resultadosBusqueda ?? estado.notas;
    const tituloActivo = useMemo(() => obtenerTituloDeContenido(estado.notaActiva.contenido), [estado.notaActiva.contenido, obtenerTituloDeContenido]);

    if (!abierto) return null;

    return (
        <Modal
            estaAbierto={abierto}
            titulo="Notas Guardadas"
            onCerrar={onCerrar}
            claseExtra="modalContenedor--expandido modalNotasExpandidoContenedor"
        >
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
                        {estado.cargando && !estado.notas.length ? (
                            <div className="modalNotasVacio">
                                <Loader size={24} className="animacionGirar" />
                                <span>Cargando notas...</span>
                            </div>
                        ) : estado.error ? (
                            <div className="modalNotasError">
                                <AlertCircle size={24} />
                                <span>{estado.error}</span>
                            </div>
                        ) : notasMostrar.length === 0 ? (
                            <div className="modalNotasVacio">
                                <FileText size={32} />
                                <span>{terminoBusqueda ? 'No se encontraron notas' : 'No tienes notas guardadas'}</span>
                                {!terminoBusqueda && <p>Guarda notas desde el Scratchpad usando el botón de guardar</p>}
                            </div>
                        ) : (
                            <ListaNotasGuardadas notas={notasMostrar} modo="lista" notaActivaId={estado.notaActiva.id} onSeleccionar={seleccionarNota} onEliminar={manejarEliminar} />
                        )}
                    </div>
                    {notasMostrar.length > 0 && (
                        <div className="modalNotasFooter">
                            <span>{resultadosBusqueda ? `${resultadosBusqueda.length} resultados` : `${estado.total} nota${estado.total !== 1 ? 's' : ''} guardada${estado.total !== 1 ? 's' : ''}`}</span>
                        </div>
                    )}
                </div>
                <div className="vistaNotasColumnaEditor">
                    <div className="vistaNotasEditorContenido">
                        <Scratchpad valorInicial={estado.notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={tamanoFuente} altura="100%" delayGuardado={delayGuardado} mostrarResizeHandle={false} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

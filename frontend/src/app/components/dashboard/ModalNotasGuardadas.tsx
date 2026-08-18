/*
 * ModalNotasGuardadas
 * Modal para ver, buscar y seleccionar notas guardadas del Scratchpad
 * Responsabilidad única: listar notas y permitir su selección/eliminación
 */

import {useState, useEffect, useCallback} from 'react';
import {Search, FileText, Loader, AlertCircle} from 'lucide-react';
import {Modal} from '../shared';
import {useNotasStore} from '../../stores/notasStore';
import type {Nota} from '../../types/notas';
import {ListaNotasGuardadas} from './notas/ListaNotasGuardadas';
import {Input} from '../ui/Input';

interface ModalNotasGuardadasProps {
    abierto: boolean;
    onCerrar: () => void;
    onSeleccionarNota: (nota: Nota) => void;
}

export function ModalNotasGuardadas({abierto, onCerrar, onSeleccionarNota}: ModalNotasGuardadasProps): JSX.Element | null {
    const notas = useNotasStore(s => s.notas);
    const cargando = useNotasStore(s => s.cargando);
    const error = useNotasStore(s => s.error);
    const total = useNotasStore(s => s.total);
    const cargarNotas = useNotasStore(s => s.cargarNotas);
    const eliminarNota = useNotasStore(s => s.eliminarNota);
    const buscarNotas = useNotasStore(s => s.buscarNotas);
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState<Nota[] | null>(null);
    const [buscando, setBuscando] = useState(false);

    /* Cargar notas cuando se abre el modal */
    useEffect(() => {
        if (abierto) {
            cargarNotas();
            setTerminoBusqueda('');
            setResultadosBusqueda(null);
        }
    }, [abierto, cargarNotas]);

    /* Debounce para búsqueda */
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

    const manejarSeleccionar = useCallback(
        (nota: Nota) => {
            onSeleccionarNota(nota);
            onCerrar();
        },
        [onSeleccionarNota, onCerrar]
    );

    const manejarEliminar = useCallback(
        (notaId: number) => {
            eliminarNota(notaId);
        },
        [eliminarNota]
    );

    const notasMostrar = resultadosBusqueda ?? notas;

    if (!abierto) return null;

    return (
        <Modal estaAbierto={abierto} titulo="Notas Guardadas" onCerrar={onCerrar} claseExtra="modalNotasContenedor">
            <div id="modal-notas-guardadas" className="modalNotasGuardadas">
                {/* Barra de búsqueda */}
                <div className="modalNotasBusqueda">
                    <Search size={14} className="modalNotasBusquedaIcono" />
                    <Input tipo="text" claseAdicional="modalNotasBusquedaInput" placeholder="Buscar notas..." value={terminoBusqueda} onChange={e => setTerminoBusqueda((e.target as HTMLInputElement).value)} autoFocus />
                    {buscando && <Loader size={14} className="modalNotasBusquedaLoader animacionGirar" />}
                </div>

                {/* Grid de notas */}
                <div className="modalNotasGrid">
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
                        <ListaNotasGuardadas notas={notasMostrar} modo="grid" onSeleccionar={manejarSeleccionar} onEliminar={manejarEliminar} />
                    )}
                </div>

                {/* Footer con contador */}
                {notasMostrar.length > 0 && (
                    <div className="modalNotasFooter">
                        <span>{resultadosBusqueda ? `${resultadosBusqueda.length} resultados` : `${total} nota${total !== 1 ? 's' : ''} guardada${total !== 1 ? 's' : ''}`}</span>
                    </div>
                )}
            </div>
        </Modal>
    );
}

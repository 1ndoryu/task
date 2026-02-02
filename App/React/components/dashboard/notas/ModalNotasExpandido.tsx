/*
 * ModalNotasExpandido
 * Modal para ver y editar notas guardadas en modo expandido
 * Tarea 2: Mejoras en Notas (expandir, crear nueva, ordenamiento)
 * Tarea 2.1: Sistema de Carpetas para Notas
 * Tarea 2.2: Expandir/Colapsar Vistas en Notas
 */

import {useState, useEffect, useCallback, useMemo} from 'react';
import {Search, FileText, Loader, AlertCircle, Maximize2, Minimize2, Plus, ArrowDownAZ, ArrowUpDown, ChevronLeft, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight} from 'lucide-react';
import {Modal} from '../../shared';
import {Scratchpad} from '../Scratchpad';
import {ListaNotasGuardadas} from './ListaNotasGuardadas';
import {NavegadorCarpetas} from './NavegadorCarpetas';
import type {Nota} from '../../../types/notas';
import type {TamanoFuente} from '../../../hooks/useConfiguracionScratchpad';

/* Tipos de ordenamiento disponibles */
type TipoOrdenamiento = 'modificacion' | 'creacion';

/* Tipos de vista de paneles */
type VistaPaneles = 'ambos' | 'solo-lista' | 'solo-editor';

interface ModalNotasExpandidoProps {
    abierto: boolean;
    onCerrar: () => void;
    tamanoFuente: TamanoFuente;
    delayGuardado: number;
}

import {useNotasStore} from '../../../stores/notasStore';
import {useCarpetasNotas} from '../../../stores/carpetasNotasStore';
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
    const crearNuevaNota = useNotasStore(s => s.crearNuevaNota);
    const actualizarContenido = useNotasStore(s => s.actualizarContenidoNotaActiva);

    /* Estado de carpetas */
    const {carpetas, carpetaActiva, vistaActual, cargando: cargandoCarpetas, cargarCarpetas, crearCarpeta, renombrarCarpeta, eliminarCarpeta, seleccionarCarpeta, moverNota, setVistaActual, volverACarpetas, obtenerNombreCarpetaActiva} = useCarpetasNotas();

    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState<Nota[] | null>(null);
    const [buscando, setBuscando] = useState(false);
    const [maximizado, setMaximizado] = useState(false);
    const [ordenamiento, setOrdenamiento] = useState<TipoOrdenamiento>('modificacion');
    const [vistaPaneles, setVistaPaneles] = useState<VistaPaneles>('ambos');

    /* Ciclar entre vistas de paneles */
    const alternarVistaPaneles = useCallback(() => {
        setVistaPaneles(prev => {
            if (prev === 'ambos') return 'solo-lista';
            if (prev === 'solo-lista') return 'solo-editor';
            return 'ambos';
        });
    }, []);

    /* Mostrar/ocultar lista */
    const mostrarLista = vistaPaneles === 'ambos' || vistaPaneles === 'solo-lista';
    const mostrarEditor = vistaPaneles === 'ambos' || vistaPaneles === 'solo-editor';

    useEffect(() => {
        if (abierto) {
            cargarNotas();
            cargarCarpetas();
            setTerminoBusqueda('');
            setResultadosBusqueda(null);
        }
    }, [abierto, cargarNotas, cargarCarpetas]);

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

    /* Crear nueva nota y seleccionarla */
    const manejarCrearNuevaNota = useCallback(() => {
        crearNuevaNota();
    }, [crearNuevaNota]);

    /* Cambiar ordenamiento */
    const alternarOrdenamiento = useCallback(() => {
        setOrdenamiento(prev => (prev === 'modificacion' ? 'creacion' : 'modificacion'));
    }, []);

    /* Ordenar notas según el criterio seleccionado */
    /* Filtrar por carpeta activa cuando no hay búsqueda */
    const notasOrdenadas = useMemo(() => {
        let lista = resultadosBusqueda ?? notas;

        /* Filtrar por carpeta si no hay búsqueda activa */
        if (!resultadosBusqueda && carpetaActiva !== undefined) {
            lista = lista.filter(n => {
                if (carpetaActiva === null) {
                    return n.carpetaId === null || n.carpetaId === undefined;
                }
                return n.carpetaId === carpetaActiva;
            });
        }

        return [...lista].sort((a, b) => {
            if (ordenamiento === 'modificacion') {
                return new Date(b.fechaModificacion).getTime() - new Date(a.fechaModificacion).getTime();
            }
            return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
        });
    }, [notas, resultadosBusqueda, ordenamiento, carpetaActiva]);

    const tituloActivo = useMemo(() => extraerTitulo(notaActiva.contenido), [notaActiva.contenido]);
    const nombreCarpetaActiva = obtenerNombreCarpetaActiva();

    /* Handlers para carpetas */
    const manejarCrearCarpeta = useCallback(
        async (nombre: string) => {
            await crearCarpeta(nombre);
        },
        [crearCarpeta]
    );

    const manejarRenombrarCarpeta = useCallback(
        async (id: number, nombre: string) => {
            await renombrarCarpeta(id, nombre);
        },
        [renombrarCarpeta]
    );

    const manejarEliminarCarpeta = useCallback(
        async (id: number) => {
            await eliminarCarpeta(id);
            /* Recargar notas despues de eliminar */
            await cargarNotas(true);
        },
        [eliminarCarpeta, cargarNotas]
    );

    if (!abierto) return null;

    const claseModal = `modalContenedor--expandido modalNotasExpandidoContenedor ${maximizado ? 'modalNotasExpandidoContenedor--maximizado' : ''} ${vistaPaneles === 'solo-lista' ? 'modalNotasExpandidoContenedor--soloLista' : ''} ${vistaPaneles === 'solo-editor' ? 'modalNotasExpandidoContenedor--soloEditor' : ''}`;
    const textoOrdenamiento = ordenamiento === 'modificacion' ? 'Modificación' : 'Creación';

    /* Icono y texto del botón de vista */
    const iconoVista = vistaPaneles === 'ambos' ? <PanelLeftClose size={14} /> : vistaPaneles === 'solo-lista' ? <PanelRightClose size={14} /> : <PanelLeft size={14} />;
    const tituloVista = vistaPaneles === 'ambos' ? 'Ocultar editor' : vistaPaneles === 'solo-lista' ? 'Ocultar lista' : 'Mostrar ambos';

    return (
        <Modal estaAbierto={abierto} titulo="Notas Guardadas" onCerrar={onCerrar} claseExtra={claseModal}>
            <div id="modal-notas-expandida" className="vistaNotasExpandida">
                {/* Columna Lista - solo visible si mostrarLista */}
                {mostrarLista && (
                    <div className="vistaNotasColumnaLista">
                        {vistaActual === 'carpetas' ? (
                            /* Vista de carpetas */
                            <NavegadorCarpetas carpetas={carpetas} onSeleccionar={seleccionarCarpeta} onCrear={manejarCrearCarpeta} onRenombrar={manejarRenombrarCarpeta} onEliminar={manejarEliminarCarpeta} cargando={cargandoCarpetas} />
                        ) : (
                            /* Vista de notas */
                            <>
                                {/* Header con búsqueda y acciones */}
                                <div className="vistaNotasBusqueda">
                                    <div className="notasHeaderConCarpeta">
                                        <button className="notasBotonVolver" onClick={volverACarpetas} title="Ver carpetas">
                                            <ChevronLeft size={14} />
                                        </button>
                                        <span className="notasCarpetaActual">{nombreCarpetaActiva}</span>
                                    </div>
                                    <div className="modalNotasBusqueda">
                                        <Search size={14} className="modalNotasBusquedaIcono" />
                                        <input type="text" className="modalNotasBusquedaInput" placeholder="Buscar notas..." value={terminoBusqueda} onChange={e => setTerminoBusqueda(e.target.value)} />
                                        {buscando && <Loader size={14} className="modalNotasBusquedaLoader animacionGirar" />}
                                    </div>
                                    {/* Barra de acciones */}
                                    <div className="vistaNotasAcciones">
                                        <button className="vistaNotasAccionBoton" onClick={manejarCrearNuevaNota} title="Crear nueva nota">
                                            <Plus size={14} />
                                        </button>
                                        <button className="vistaNotasAccionBoton" onClick={alternarOrdenamiento} title={`Ordenar por fecha de ${ordenamiento === 'modificacion' ? 'creación' : 'modificación'}`}>
                                            <ArrowUpDown size={14} />
                                            <span className="vistaNotasAccionTexto">{textoOrdenamiento}</span>
                                        </button>
                                        <button className="vistaNotasAccionBoton" onClick={alternarVistaPaneles} title={tituloVista}>
                                            {iconoVista}
                                        </button>
                                        <button className="vistaNotasAccionBoton" onClick={() => setMaximizado(!maximizado)} title={maximizado ? 'Restaurar tamaño' : 'Maximizar'}>
                                            {maximizado ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                        </button>
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
                                    ) : notasOrdenadas.length === 0 ? (
                                        <div className="modalNotasVacio">
                                            <FileText size={32} />
                                            <span>{terminoBusqueda ? 'No se encontraron notas' : 'No hay notas en esta carpeta'}</span>
                                            {!terminoBusqueda && <p>Crea una nueva nota o mueve notas desde otra carpeta</p>}
                                        </div>
                                    ) : (
                                        <ListaNotasGuardadas notas={notasOrdenadas} modo="lista" notaActivaId={notaActiva.id} onSeleccionar={seleccionarNota} onEliminar={manejarEliminar} carpetas={carpetas} onMoverNota={moverNota} />
                                    )}
                                </div>
                                {notasOrdenadas.length > 0 && (
                                    <div className="modalNotasFooter">
                                        <span>{resultadosBusqueda ? `${resultadosBusqueda.length} resultados` : `${notasOrdenadas.length} nota${notasOrdenadas.length !== 1 ? 's' : ''}`}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Columna Editor - solo visible si mostrarEditor */}
                {mostrarEditor && (
                    <div className="vistaNotasColumnaEditor">
                        {/* Botón para mostrar lista cuando está oculta */}
                        {!mostrarLista && (
                            <div className="vistaNotasEditorHeader">
                                <button className="vistaNotasAccionBoton" onClick={alternarVistaPaneles} title="Mostrar lista">
                                    <PanelLeft size={14} />
                                </button>
                                <span className="vistaNotasEditorTitulo">{extraerTitulo(notaActiva.contenido)}</span>
                            </div>
                        )}
                        <div className="vistaNotasEditorContenido">
                            <Scratchpad valorInicial={notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={tamanoFuente} altura="100%" delayGuardado={delayGuardado} mostrarResizeHandle={false} />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

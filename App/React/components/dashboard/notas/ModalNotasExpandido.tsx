/*
 * ModalNotasExpandido
 * Modal para ver y editar notas guardadas en modo expandido
 * Tarea 2: Mejoras en Notas (expandir, crear nueva, ordenamiento)
 * Tarea 2.1: Sistema de Carpetas para Notas
 * Tarea 2.2: Expandir/Colapsar Vistas en Notas
 * Revision 7: Botones separados para lista/editor, movidos al header
 * Lógica extraída a useModalNotasExpandido hook
 */

import {Search, FileText, Loader, AlertCircle, Maximize2, Minimize2, Plus, ArrowUpDown, ChevronLeft, PanelLeftClose, PanelRightClose, Save} from 'lucide-react';
import {Modal} from '../../shared';
import {Scratchpad} from '../Scratchpad';
import {ListaNotasGuardadas} from './ListaNotasGuardadas';
import {NavegadorCarpetas} from './NavegadorCarpetas';
import type {TamanoFuente} from '../../../hooks/useConfiguracionScratchpad';
import {Input} from '../../ui/Input';
import {Boton} from '../../ui/Boton';
import {useModalNotasExpandido} from '../../../hooks/dashboard/useModalNotasExpandido';

interface ModalNotasExpandidoProps {
    abierto: boolean;
    onCerrar: () => void;
    tamanoFuente: TamanoFuente;
    delayGuardado: number;
}

export function ModalNotasExpandido({abierto, onCerrar, tamanoFuente, delayGuardado}: ModalNotasExpandidoProps): JSX.Element | null {
    const {
        notas, notaActiva, cargando, guardando, error,
        seleccionarNota, actualizarContenido,
        carpetas, carpetaActiva: _carpetaActiva, vistaActual, cargandoCarpetas,
        seleccionarCarpeta, volverACarpetas, nombreCarpetaActiva,
        manejarCrearCarpeta, manejarRenombrarCarpeta, manejarEliminarCarpeta, moverNota,
        terminoBusqueda, setTerminoBusqueda, resultadosBusqueda, buscando,
        maximizado, setMaximizado, mostrarLista, mostrarEditor,
        alternarPanelLista, alternarPanelEditor,
        ordenamiento, alternarOrdenamiento, textoOrdenamiento: _textoOrdenamiento,
        notasOrdenadas, tituloActivo: _tituloActivo,
        manejarEliminar, manejarCrearNuevaNota, manejarCerrarSeguro,
        claseModal
    } = useModalNotasExpandido({abierto, onCerrar});

    if (!abierto) return null;

    /* Acciones del header del modal */
    const accionesHeader = (
        <>
            {/* Indicador de guardado */}
            {guardando && (
                <span className="modalNotasGuardando" style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--dashboard-textoSecundario, #888)'}}>
                    <Save size={12} className="animacionGirar" />
                    Guardando...
                </span>
            )}
            {notaActiva.modificada && !guardando && (
                <span className="modalNotasModificada" style={{fontSize: '11px', color: 'var(--dashboard-estadoAdvertencia, #fbbf24)'}}>
                    Sin guardar
                </span>
            )}

            {/* Buscador centrado en el header */}
            <div className="modalNotasBusqueda modalNotasBusqueda--headerCentrado">
                <Search size={14} className="modalNotasBusquedaIcono" />
                <Input tipo="text" claseAdicional="modalNotasBusquedaInput" placeholder="Buscar notas..." value={terminoBusqueda} onChange={e => setTerminoBusqueda((e.target as HTMLInputElement).value)} />
                {buscando && <Loader size={14} className="modalNotasBusquedaLoader animacionGirar" />}
            </div>

            <Boton variante="icono" claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={manejarCrearNuevaNota} title="Crear nueva nota">
                <Plus size={14} />
            </Boton>
            <Boton variante="icono" claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={alternarOrdenamiento} title={`Ordenar por ${ordenamiento === 'modificacion' ? 'creación' : 'modificación'}`}>
                <ArrowUpDown size={14} />
            </Boton>

            <Boton variante="icono" claseAdicional={`selectorBadgeBoton selectorBadgeBoton--soloIcono ${!mostrarLista ? 'selectorBadgeBotonActivo' : ''}`} onClick={alternarPanelLista} title={mostrarLista ? 'Ocultar lista' : 'Mostrar lista'}>
                <PanelLeftClose size={14} />
            </Boton>
            <Boton variante="icono" claseAdicional={`selectorBadgeBoton selectorBadgeBoton--soloIcono ${!mostrarEditor ? 'selectorBadgeBotonActivo' : ''}`} onClick={alternarPanelEditor} title={mostrarEditor ? 'Ocultar editor' : 'Mostrar editor'}>
                <PanelRightClose size={14} />
            </Boton>
            <Boton variante="icono" claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setMaximizado(!maximizado)} title={maximizado ? 'Restaurar' : 'Maximizar'}>
                {maximizado ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </Boton>
        </>
    );

    return (
        <Modal estaAbierto={abierto} titulo="Notas Guardadas" onCerrar={manejarCerrarSeguro} claseExtra={claseModal} accionesEncabezado={accionesHeader}>
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
                                {/* Header con carpeta activa */}
                                <div className="notasHeaderConCarpeta">
                                    <Boton variante="icono" claseAdicional="notasBotonVolver" onClick={volverACarpetas} title="Ver carpetas">
                                        <ChevronLeft size={14} />
                                    </Boton>
                                    <span className="notasCarpetaActual">{nombreCarpetaActiva}</span>
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
                        <div className="vistaNotasEditorContenido">
                            <Scratchpad valorInicial={notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={tamanoFuente} altura="100%" delayGuardado={delayGuardado} mostrarResizeHandle={false} />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

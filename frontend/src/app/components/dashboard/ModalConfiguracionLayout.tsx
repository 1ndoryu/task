/*
 * ModalConfiguracionLayout
 * Modal para configurar el layout del dashboard
 * Selector de columnas, toggles de visibilidad y orden de paneles
 */

import {Modal} from '../shared/Modal';
import {Boton} from '../ui';
import {Columns2, Columns3, Square, RotateCcw, ArrowUpDown, LayoutGrid, PanelLeft} from 'lucide-react';
import {ListaOrdenPaneles} from './ListaOrdenPaneles';
import type {ModoColumnas, PanelId, OrdenPanel, TipoLayout} from '../../hooks/useConfiguracionLayout';
import {useTema} from '../../hooks/useTema';

interface ModalConfiguracionLayoutProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    tipoLayout: TipoLayout;
    modoColumnas: ModoColumnas;
    ordenPaneles: OrdenPanel[];
    onCambiarTipoLayout: (tipo: TipoLayout) => void;
    onCambiarModo: (modo: ModoColumnas) => void;
    onMoverPanelArriba: (panelId: PanelId) => void;
    onMoverPanelAbajo: (panelId: PanelId) => void;
    onMoverPanelAColumna: (panelId: PanelId, columna: 1 | 2 | 3) => void;
    onResetearOrden: () => void;
    onResetear: () => void;
}

/* [18-08-2026] La visibilidad de paneles ya no vive en este modal: el botón
 * "Paneles" del encabezado abre un modal dedicado con todos los paneles
 * (incl. plugins activos y minimizados). */

export function ModalConfiguracionLayout({estaAbierto, onCerrar, tipoLayout, modoColumnas, ordenPaneles, onCambiarTipoLayout, onCambiarModo, onMoverPanelArriba, onMoverPanelAbajo, onMoverPanelAColumna, onResetearOrden, onResetear}: ModalConfiguracionLayoutProps): JSX.Element {
    const {cambiarTema} = useTema();
    const esGrid = tipoLayout === 'grid';

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuración de Layout">
            <div className="configLayoutContenido">
                {/* [300A-2] Selector de modo de layout: Grid ↔ Sidebar */}
                <div className="configLayoutSeccion">
                    <h4 className="configLayoutSeccionTitulo">Modo de Visualización</h4>
                    <p className="configLayoutSeccionDescripcion">Grid muestra todos los paneles a la vez. Sidebar los muestra uno por uno.</p>

                    <div className="configLayoutColumnasOpciones">
                        <Boton
                            variante={esGrid ? 'primario' : 'ghost'}
                            onClick={() => onCambiarTipoLayout('grid')}
                            title="Modo grid"
                            claseAdicional={`configLayoutColumnaOpcion ${esGrid ? 'activo' : ''}`}
                            icono={<LayoutGrid size={20} />}
                        >
                            Grid
                        </Boton>

                        <Boton
                            variante={!esGrid ? 'primario' : 'ghost'}
                            onClick={() => {
                                onCambiarTipoLayout('sidebar');
                                cambiarTema('oscuro');
                            }}
                            title="Modo sidebar"
                            claseAdicional={`configLayoutColumnaOpcion ${!esGrid ? 'activo' : ''}`}
                            icono={<PanelLeft size={20} />}
                        >
                            Sidebar
                        </Boton>
                    </div>
                </div>

                {/* Selector de columnas (solo en modo grid) */}
                {esGrid && (
                    <div className="configLayoutSeccion">
                        <h4 className="configLayoutSeccionTitulo">Distribución de Columnas</h4>
                        <p className="configLayoutSeccionDescripcion">Selecciona cuántas columnas quieres en el dashboard</p>

                        <div className="configLayoutColumnasOpciones">
                            <Boton
                                variante={modoColumnas === 1 ? 'primario' : 'ghost'}
                                onClick={() => onCambiarModo(1)}
                                title="1 columna"
                                claseAdicional={`configLayoutColumnaOpcion ${modoColumnas === 1 ? 'activo' : ''}`}
                                icono={<Square size={20} />}
                            >
                                1 Columna
                            </Boton>

                            <Boton
                                variante={modoColumnas === 2 ? 'primario' : 'ghost'}
                                onClick={() => onCambiarModo(2)}
                                title="2 columnas"
                                claseAdicional={`configLayoutColumnaOpcion ${modoColumnas === 2 ? 'activo' : ''}`}
                                icono={<Columns2 size={20} />}
                            >
                                2 Columnas
                            </Boton>

                            <Boton
                                variante={modoColumnas === 3 ? 'primario' : 'ghost'}
                                onClick={() => onCambiarModo(3)}
                                title="3 columnas"
                                claseAdicional={`configLayoutColumnaOpcion ${modoColumnas === 3 ? 'activo' : ''}`}
                                icono={<Columns3 size={20} />}
                            >
                                3 Columnas
                            </Boton>
                        </div>
                    </div>
                )}

                {/* Orden de Paneles (solo en modo grid) */}
                {esGrid && (
                    <div className="configLayoutSeccion">
                        <div className="configLayoutSeccionHeader">
                            <div>
                                <h4 className="configLayoutSeccionTitulo">
                                    <ArrowUpDown size={14} />
                                    <span>Orden de Paneles</span>
                                </h4>
                                <p className="configLayoutSeccionDescripcion">Reordena los paneles usando los botones o cambia su columna</p>
                            </div>
                            <Boton
                                variante="icono"
                                onClick={onResetearOrden}
                                title="Restaurar orden por defecto"
                                icono={<RotateCcw size={12} />}
                                claseAdicional="configLayoutBotonResetPequeno"
                            />
                        </div>

                        <ListaOrdenPaneles ordenPaneles={ordenPaneles} modoColumnas={modoColumnas} onMoverArriba={onMoverPanelArriba} onMoverAbajo={onMoverPanelAbajo} onCambiarColumna={onMoverPanelAColumna} />
                    </div>
                )}

                {/* Botón de reset */}
                <div className="configLayoutAcciones">
                    <Boton
                        variante="secundario"
                        onClick={onResetear}
                        title="Restaurar configuración por defecto"
                        icono={<RotateCcw size={12} />}
                        claseAdicional="configLayoutBotonReset"
                    >
                        Restaurar todo por defecto
                    </Boton>
                </div>
            </div>
        </Modal>
    );
}

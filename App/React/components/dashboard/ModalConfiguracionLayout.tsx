/*
 * ModalConfiguracionLayout
 * Modal para configurar el layout del dashboard
 * Selector de columnas, toggles de visibilidad y orden de paneles
 */

import {Modal} from '../shared/Modal';
import {ToggleSwitch} from '../shared/ToggleSwitch';
import {Boton} from '../ui';
import {Columns2, Columns3, Square, Target, Folder, Terminal, FileText, RotateCcw, ArrowUpDown, Activity} from 'lucide-react';
import {ListaOrdenPaneles} from './ListaOrdenPaneles';
import type {ModoColumnas, VisibilidadPaneles, PanelId, OrdenPanel} from '../../hooks/useConfiguracionLayout';

interface ModalConfiguracionLayoutProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    modoColumnas: ModoColumnas;
    visibilidad: VisibilidadPaneles;
    ordenPaneles: OrdenPanel[];
    onCambiarModo: (modo: ModoColumnas) => void;
    onTogglePanel: (panel: PanelId) => void;
    onMoverPanelArriba: (panelId: PanelId) => void;
    onMoverPanelAbajo: (panelId: PanelId) => void;
    onMoverPanelAColumna: (panelId: PanelId, columna: 1 | 2 | 3) => void;
    onResetearOrden: () => void;
    onResetear: () => void;
}

/* Info de paneles para los toggles */
const PANELES: {id: PanelId; nombre: string; icono: JSX.Element; descripcion: string}[] = [
    {
        id: 'focoPrioritario',
        nombre: 'Foco Prioritario',
        icono: <Target size={14} />,
        descripcion: 'Panel de hábitos y racha'
    },
    {
        id: 'proyectos',
        nombre: 'Proyectos',
        icono: <Folder size={14} />,
        descripcion: 'Lista de proyectos'
    },
    {
        id: 'ejecucion',
        nombre: 'Ejecución',
        icono: <Terminal size={14} />,
        descripcion: 'Lista de tareas activas'
    },
    {
        id: 'scratchpad',
        nombre: 'Scratchpad',
        icono: <FileText size={14} />,
        descripcion: 'Notas rápidas'
    },
    {
        id: 'actividad',
        nombre: 'Actividad',
        icono: <Activity size={14} />,
        descripcion: 'Mapa de calor de actividad'
    }
];

export function ModalConfiguracionLayout({estaAbierto, onCerrar, modoColumnas, visibilidad, ordenPaneles, onCambiarModo, onTogglePanel, onMoverPanelArriba, onMoverPanelAbajo, onMoverPanelAColumna, onResetearOrden, onResetear}: ModalConfiguracionLayoutProps): JSX.Element {
    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuración de Layout">
            <div className="configLayoutContenido">
                {/* Selector de columnas */}
                <div className="configLayoutSeccion">
                    <h4 className="configLayoutSeccionTitulo">Distribución de Columnas</h4>
                    <p className="configLayoutSeccionDescripcion">Selecciona cuántas columnas quieres en el dashboard</p>

                    <div className="configLayoutColumnasOpciones">
                        <Boton
                            variante={modoColumnas === 1 ? 'primario' : 'ghost'}
                            onClick={() => onCambiarModo(1)}
                            titulo="1 columna"
                            claseAdicional={`configLayoutColumnaOpcion ${modoColumnas === 1 ? 'activo' : ''}`}
                            icono={<Square size={20} />}
                        >
                            1 Columna
                        </Boton>

                        <Boton
                            variante={modoColumnas === 2 ? 'primario' : 'ghost'}
                            onClick={() => onCambiarModo(2)}
                            titulo="2 columnas"
                            claseAdicional={`configLayoutColumnaOpcion ${modoColumnas === 2 ? 'activo' : ''}`}
                            icono={<Columns2 size={20} />}
                        >
                            2 Columnas
                        </Boton>

                        <Boton
                            variante={modoColumnas === 3 ? 'primario' : 'ghost'}
                            onClick={() => onCambiarModo(3)}
                            titulo="3 columnas"
                            claseAdicional={`configLayoutColumnaOpcion ${modoColumnas === 3 ? 'activo' : ''}`}
                            icono={<Columns3 size={20} />}
                        >
                            3 Columnas
                        </Boton>
                    </div>
                </div>

                {/* Orden de Paneles */}
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
                            titulo="Restaurar orden por defecto"
                            icono={<RotateCcw size={12} />}
                            claseAdicional="configLayoutBotonResetPequeno"
                        />
                    </div>

                    <ListaOrdenPaneles ordenPaneles={ordenPaneles} modoColumnas={modoColumnas} onMoverArriba={onMoverPanelArriba} onMoverAbajo={onMoverPanelAbajo} onCambiarColumna={onMoverPanelAColumna} />
                </div>

                {/* Visibilidad de paneles */}
                <div className="configLayoutSeccion">
                    <h4 className="configLayoutSeccionTitulo">Visibilidad de Paneles</h4>
                    <p className="configLayoutSeccionDescripcion">Oculta paneles que no necesites. Aparecerán en la barra lateral.</p>

                    <div className="configLayoutPaneles">
                        {PANELES.map(panel => (
                            <div key={panel.id} className="configLayoutPanelItem">
                                <div className="configLayoutPanelInfo">
                                    <span className="configLayoutPanelIcono">{panel.icono}</span>
                                    <div className="configLayoutPanelTexto">
                                        <span className="configLayoutPanelNombre">{panel.nombre}</span>
                                        <span className="configLayoutPanelDescripcion">{panel.descripcion}</span>
                                    </div>
                                </div>
                                <ToggleSwitch checked={visibilidad[panel.id]} onChange={() => onTogglePanel(panel.id)} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Botón de reset */}
                <div className="configLayoutAcciones">
                    <Boton
                        variante="secundario"
                        onClick={onResetear}
                        titulo="Restaurar configuración por defecto"
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

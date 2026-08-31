/* [233A-27] Configuración de layout: modo grid/sidebar/vistas, columnas y orden de paneles. */
import {Square, Columns2, Columns3, ArrowUpDown, RotateCcw, LayoutGrid, PanelLeft, PanelsTopLeft, LayoutDashboard} from 'lucide-react';
import {Boton} from '../../../ui';
import {ListaOrdenPaneles} from '../../../dashboard/ListaOrdenPaneles';
import {useConfiguracionLayout} from '../../../../hooks/useConfiguracionLayout';
import type {ModoColumnas} from '../../../../hooks/useConfiguracionLayout';

export function SeccionConfigLayout(): JSX.Element {
    const {tipoLayout, modoColumnas, ordenPaneles, cambiarTipoLayout, cambiarModoColumnas, moverPanelArriba, moverPanelAbajo, moverPanelAColumna, resetearOrdenPaneles, resetearLayout} = useConfiguracionLayout();
    const esGrid = tipoLayout === 'grid';

    return (
        <div className="configLayoutContenido">
            {/* [300A-2][318A-2] Selector de modo: Grid ↔ Sidebar ↔ Vistas */}
            <div className="configLayoutSeccion">
                <h4 className="configLayoutSeccionTitulo">Modo de Visualización</h4>
                <p className="configLayoutSeccionDescripcion">Grid muestra todos los paneles a la vez. Sidebar los muestra uno por uno. Vistas permite crear vistas configurables de hasta 4 paneles.</p>
                <div className="configLayoutColumnasOpciones">
                    <Boton
                        variante={tipoLayout === 'grid' ? 'primario' : 'ghost'}
                        onClick={() => cambiarTipoLayout('grid')}
                        title="Modo grid"
                        claseAdicional={`configLayoutColumnaOpcion ${tipoLayout === 'grid' ? 'activo' : ''}`}
                        icono={<LayoutGrid size={20} />}
                    >
                        Grid
                    </Boton>
                    <Boton
                        variante={tipoLayout === 'sidebar' ? 'primario' : 'ghost'}
                        onClick={() => {
                            cambiarTipoLayout('sidebar');
                        }}
                        title="Modo sidebar"
                        claseAdicional={`configLayoutColumnaOpcion ${tipoLayout === 'sidebar' ? 'activo' : ''}`}
                        icono={<PanelLeft size={20} />}
                    >
                        Sidebar
                    </Boton>
                    <Boton
                        variante={tipoLayout === 'vistas' ? 'primario' : 'ghost'}
                        onClick={() => {
                            cambiarTipoLayout('vistas');
                        }}
                        title="Modo vistas (grid libre configurable)"
                        claseAdicional={`configLayoutColumnaOpcion ${tipoLayout === 'vistas' ? 'activo' : ''}`}
                        icono={<LayoutDashboard size={20} />}
                    >
                        Vistas
                    </Boton>
                </div>
            </div>

            {/* Columnas + Orden: solo en modo grid */}
            {esGrid && (
                <>
                    <div className="configLayoutSeccion">
                        <h4 className="configLayoutSeccionTitulo">Distribución de Columnas</h4>
                        <p className="configLayoutSeccionDescripcion">Selecciona cuántas columnas quieres en el dashboard</p>
                        <div className="configLayoutColumnasOpciones">
                            {([1, 2, 3] as ModoColumnas[]).map(modo => (
                                <Boton key={modo} variante={modoColumnas === modo ? 'primario' : 'ghost'} onClick={() => cambiarModoColumnas(modo)} claseAdicional={`configLayoutColumnaOpcion ${modoColumnas === modo ? 'activo' : ''}`} icono={modo === 1 ? <Square size={20} /> : modo === 2 ? <Columns2 size={20} /> : <Columns3 size={20} />}>
                                    {modo} Columna{modo > 1 ? 's' : ''}
                                </Boton>
                            ))}
                        </div>
                    </div>
                    <div className="configLayoutSeccion">
                        <div className="configLayoutSeccionHeader">
                            <div>
                                <h4 className="configLayoutSeccionTitulo"><ArrowUpDown size={14} /> <span>Orden de Paneles</span></h4>
                                <p className="configLayoutSeccionDescripcion">Reordena los paneles usando los botones o cambia su columna</p>
                            </div>
                            <Boton variante="icono" onClick={resetearOrdenPaneles} title="Restaurar orden por defecto" icono={<RotateCcw size={12} />} claseAdicional="configLayoutBotonResetPequeno" />
                        </div>
                        <ListaOrdenPaneles ordenPaneles={ordenPaneles} modoColumnas={modoColumnas} onMoverArriba={moverPanelArriba} onMoverAbajo={moverPanelAbajo} onCambiarColumna={moverPanelAColumna} />
                    </div>
                </>
            )}

            {/* [18-08-2026] Visibilidad de paneles movida al boton Paneles del encabezado */}
            <div className="configLayoutSeccion">
                <p className="configLayoutSeccionDescripcion">
                    <PanelsTopLeft size={14} /> Activa, desactiva o restaura paneles desde el boton Paneles del encabezado.
                </p>
            </div>

            <div className="configLayoutAcciones">
                <Boton variante="secundario" onClick={resetearLayout} title="Restaurar todo" icono={<RotateCcw size={12} />} claseAdicional="configLayoutBotonReset">
                    Restaurar todo por defecto
                </Boton>
            </div>
        </div>
    );
}

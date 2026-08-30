/*
 * MenusCreacionRapida
 * Sub-componente que renderiza los menús contextuales del modal de creación rápida.
 * Separado para mantener ModalCreacionRapida dentro del límite de líneas.
 */

import {CheckSquare, Activity, Folder} from 'lucide-react';
import {MenuContextual} from '../../shared';
import {SelectorFechaCalendario} from '../../shared/SelectorFechaCalendario';
import type {Proyecto} from '../../../types/dashboard';
import type {EstadoMenu} from '../../../hooks/dashboard/useModalCreacionRapida';
import {opcionesMenuPrioridad, opcionesMenuUrgencia, opcionesMenuImportancia} from '../../../utils/nivelesConfig';

/* MenusCreacionRapidaProps se divide en estado + callbacks compuestos vía extends. */
interface MenusCreacionRapidaContexto {
    proyectos: Proyecto[];
    fechaActual?: string;
}

interface MenusCreacionRapidaEstados {
    menuTipo: EstadoMenu;
    menuProyecto: EstadoMenu;
    menuPrioridad: EstadoMenu;
    menuUrgencia: EstadoMenu;
    menuFecha: EstadoMenu;
    menuImportancia: EstadoMenu;
}

interface MenusCreacionRapidaSeleccion {
    seleccionarTipo: (id: string) => void;
    seleccionarProyecto: (id: string) => void;
    seleccionarPrioridad: (id: string) => void;
    seleccionarUrgencia: (id: string) => void;
    seleccionarFecha: (id: string) => void;
    seleccionarImportancia: (id: string) => void;
}

interface MenusCreacionRapidaCierre {
    cerrarMenuTipo: () => void;
    cerrarMenuProyecto: () => void;
    cerrarMenuPrioridad: () => void;
    cerrarMenuUrgencia: () => void;
    cerrarMenuFecha: () => void;
    cerrarMenuImportancia: () => void;
}

interface MenusCreacionRapidaProps extends MenusCreacionRapidaContexto, MenusCreacionRapidaEstados, MenusCreacionRapidaSeleccion, MenusCreacionRapidaCierre {}

export function MenusCreacionRapida(props: MenusCreacionRapidaProps): JSX.Element {
    const {
        proyectos, fechaActual,
        menuTipo, menuProyecto, menuPrioridad, menuUrgencia, menuFecha, menuImportancia,
        seleccionarTipo, seleccionarProyecto, seleccionarPrioridad, seleccionarUrgencia, seleccionarFecha, seleccionarImportancia,
        cerrarMenuTipo, cerrarMenuProyecto, cerrarMenuPrioridad, cerrarMenuUrgencia, cerrarMenuFecha, cerrarMenuImportancia,
    } = props;

    return (
        <>
            {menuTipo.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'tarea', etiqueta: 'Tarea', icono: <CheckSquare size={14} className="textoInfo" />},
                            {id: 'habito', etiqueta: 'Hábito', icono: <Activity size={14} className="textoExito" />},
                            {id: 'proyecto', etiqueta: 'Proyecto', icono: <Folder size={14} className="textoAdvertencia" />}
                        ]}
                        posicionX={menuTipo.x}
                        posicionY={menuTipo.y}
                        onSeleccionar={seleccionarTipo}
                        onCerrar={cerrarMenuTipo}
                    />
                </div>
            )}

            {menuProyecto.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'ninguno', etiqueta: 'Ninguno', icono: <Folder size={12} className="textoApagado" />},
                            ...proyectos.map(p => ({
                                id: p.id.toString(),
                                etiqueta: p.nombre,
                                icono: <Folder size={12} />
                            }))
                        ]}
                        posicionX={menuProyecto.x}
                        posicionY={menuProyecto.y}
                        onSeleccionar={seleccionarProyecto}
                        onCerrar={cerrarMenuProyecto}
                    />
                </div>
            )}

            {menuPrioridad.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={opcionesMenuPrioridad(12)}
                        posicionX={menuPrioridad.x}
                        posicionY={menuPrioridad.y}
                        onSeleccionar={seleccionarPrioridad}
                        onCerrar={cerrarMenuPrioridad}
                    />
                </div>
            )}

            {menuUrgencia.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={opcionesMenuUrgencia(12)}
                        posicionX={menuUrgencia.x}
                        posicionY={menuUrgencia.y}
                        onSeleccionar={seleccionarUrgencia}
                        onCerrar={cerrarMenuUrgencia}
                    />
                </div>
            )}

            {menuFecha.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <SelectorFechaCalendario
                        posicionX={menuFecha.x}
                        posicionY={menuFecha.y}
                        fechaActual={fechaActual}
                        mostrarLimpiar={!!fechaActual}
                        onSeleccionar={fechaISO => {
                            seleccionarFecha(fechaISO);
                        }}
                        onLimpiar={() => seleccionarFecha('ninguna')}
                        onCerrar={cerrarMenuFecha}
                    />
                </div>
            )}

            {menuImportancia.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={opcionesMenuImportancia(12)}
                        posicionX={menuImportancia.x}
                        posicionY={menuImportancia.y}
                        onSeleccionar={seleccionarImportancia}
                        onCerrar={cerrarMenuImportancia}
                    />
                </div>
            )}
        </>
    );
}

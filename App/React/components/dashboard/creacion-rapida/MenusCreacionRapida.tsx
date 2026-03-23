/*
 * MenusCreacionRapida
 * Sub-componente que renderiza los menús contextuales del modal de creación rápida.
 * Separado para mantener ModalCreacionRapida dentro del límite de líneas.
 */

import {CheckSquare, Activity, Folder, Calendar, Repeat} from 'lucide-react';
import {MenuContextual} from '../../shared';
import type {Proyecto} from '../../../types/dashboard';
import type {EstadoMenu} from '../../../hooks/dashboard/useModalCreacionRapida';
import {opcionesMenuPrioridad, opcionesMenuUrgencia, opcionesMenuImportancia} from '../../../utils/nivelesConfig';

interface MenusCreacionRapidaProps {
    proyectos: Proyecto[];

    menuTipo: EstadoMenu;
    menuProyecto: EstadoMenu;
    menuPrioridad: EstadoMenu;
    menuUrgencia: EstadoMenu;
    menuFrecuencia: EstadoMenu;
    menuFecha: EstadoMenu;
    menuImportancia: EstadoMenu;

    seleccionarTipo: (id: string) => void;
    seleccionarProyecto: (id: string) => void;
    seleccionarPrioridad: (id: string) => void;
    seleccionarUrgencia: (id: string) => void;
    seleccionarFrecuencia: (id: string) => void;
    seleccionarFecha: (id: string) => void;
    seleccionarImportancia: (id: string) => void;

    cerrarMenuTipo: () => void;
    cerrarMenuProyecto: () => void;
    cerrarMenuPrioridad: () => void;
    cerrarMenuUrgencia: () => void;
    cerrarMenuFrecuencia: () => void;
    cerrarMenuFecha: () => void;
    cerrarMenuImportancia: () => void;
}

export function MenusCreacionRapida(props: MenusCreacionRapidaProps): JSX.Element {
    const {
        proyectos,
        menuTipo, menuProyecto, menuPrioridad, menuUrgencia, menuFrecuencia, menuFecha, menuImportancia,
        seleccionarTipo, seleccionarProyecto, seleccionarPrioridad, seleccionarUrgencia, seleccionarFrecuencia, seleccionarFecha, seleccionarImportancia,
        cerrarMenuTipo, cerrarMenuProyecto, cerrarMenuPrioridad, cerrarMenuUrgencia, cerrarMenuFrecuencia, cerrarMenuFecha, cerrarMenuImportancia,
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

            {menuFrecuencia.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'diario', etiqueta: 'Diario', icono: <Repeat size={12} />},
                            {id: 'semanal', etiqueta: 'Semanal', icono: <Repeat size={12} />},
                            {id: 'mensual', etiqueta: 'Mensual', icono: <Repeat size={12} />}
                        ]}
                        posicionX={menuFrecuencia.x}
                        posicionY={menuFrecuencia.y}
                        onSeleccionar={seleccionarFrecuencia}
                        onCerrar={cerrarMenuFrecuencia}
                    />
                </div>
            )}

            {menuFecha.visible && (
                <div onClick={e => e.stopPropagation()}>
                    <MenuContextual
                        opciones={[
                            {id: 'hoy', etiqueta: 'Hoy', icono: <Calendar size={12} className="textoAdvertencia" />},
                            {id: 'manana', etiqueta: 'Mañana', icono: <Calendar size={12} />},
                            {id: 'semana', etiqueta: 'Esta Semana', icono: <Calendar size={12} />}
                        ]}
                        posicionX={menuFecha.x}
                        posicionY={menuFecha.y}
                        onSeleccionar={seleccionarFecha}
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

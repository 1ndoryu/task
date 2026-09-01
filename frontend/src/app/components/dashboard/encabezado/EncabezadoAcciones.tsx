import {useState} from 'react';
import {LayoutGrid, Bell, Settings, Plus, CheckSquare, Activity, Folder, PanelsTopLeft, SquarePlus} from 'lucide-react';
import {IndicadorPlan, MenuContextual} from '../../shared';
import type {OpcionMenu} from '../../shared';
import {Boton} from '../../ui/Boton';
import type {InfoSuscripcion} from '../../../types/dashboard';

/* EncabezadoAccionesProps se divide en contexto + callbacks vía extends. */
interface EncabezadoAccionesContexto {
    suscripcion?: InfoSuscripcion | null;
    esAdmin?: boolean;
    equiposPendientes?: number;
    notificacionesPendientes?: number;
    estaConectado: boolean;
    esTablet: boolean;
}

interface EncabezadoAccionesAcciones {
    onClickPlan?: () => void;
    onClickLayout?: () => void;
    /* [18-08-2026] Botón de gestión de paneles (modal activar/desactivar) */
    onClickPaneles?: () => void;
    onClickNotificaciones?: (evento: React.MouseEvent) => void;
    onClickExperimentos?: () => void;
    onClickAdmin?: () => void;
    onClickEquipos?: () => void;
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    /* [318A-4] Botón "agregar panel" del modo vistas, en el nav. Antes era un
     * botón flotante en la vista. `undefined` = no se muestra. */
    agregarPanelVista?: {
        total: number;
        maximo: number;
        opciones: OpcionMenu[];
        abierto: boolean;
        posicion: {x: number; y: number};
        onAbrir: (evento: React.MouseEvent) => void;
        onSeleccionar: (panelId: string) => void;
        onCerrar: () => void;
    };
}

interface EncabezadoAccionesProps extends EncabezadoAccionesContexto, EncabezadoAccionesAcciones {}

export function EncabezadoAcciones({suscripcion, esAdmin, equiposPendientes: _equiposPendientes = 0, notificacionesPendientes = 0, estaConectado, esTablet, onClickPlan, onClickLayout, onClickPaneles, onClickNotificaciones, onClickExperimentos: _onClickExperimentos, onClickAdmin, onClickEquipos: _onClickEquipos, onCrearRapido, agregarPanelVista}: EncabezadoAccionesProps) {
    const [menuCrear, setMenuCrear] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});

    const esPremiumActivo = suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa';
    const mostrarBadgePlanEnHeader = suscripcion && !esPremiumActivo;

    const opcionesMenuCrear = [
        {id: 'tarea', etiqueta: 'Tarea', icono: <CheckSquare size={12} />},
        {id: 'habito', etiqueta: 'Hábito', icono: <Activity size={12} />},
        {id: 'proyecto', etiqueta: 'Proyecto', icono: <Folder size={12} />}
    ];

    const manejarClickCrear = (evento: React.MouseEvent) => {
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuCrear({
            visible: true,
            x: rect.left,
            y: rect.bottom + 4
        });
    };

    const manejarSeleccionCrear = (opcionId: string) => {
        if (onCrearRapido) {
            onCrearRapido(opcionId as 'tarea' | 'habito' | 'proyecto');
        }
        setMenuCrear({...menuCrear, visible: false});
    };

    return (
        <>
            {/* Indicador de Plan - Solo para FREE y TRIAL */}
            {mostrarBadgePlanEnHeader && <IndicadorPlan suscripcion={suscripcion} onClick={onClickPlan} />}

            {/* Crear Nuevo (Tarea/Hábito/Proyecto) */}
            {onCrearRapido && (
                <>
                    <Boton type="button" claseAdicional="botonIconoEncabezado" onClick={manejarClickCrear} title={esTablet ? undefined : 'Crear nuevo...'}>
                        <Plus size={14} />
                    </Boton>
                    {menuCrear.visible && <MenuContextual opciones={opcionesMenuCrear} posicionX={menuCrear.x} posicionY={menuCrear.y} onSeleccionar={manejarSeleccionCrear} onCerrar={() => setMenuCrear({...menuCrear, visible: false})} />}
                </>
            )}

            {/* [318A-4] Agregar panel a la vista (modo vistas). Antes era un
             * botón flotante en la esquina de la vista; ahora vive en el nav.
             * Icono SquarePlus (cambio desde Plus para distinguirlo de "Crear"). */}
            {agregarPanelVista && (
                <>
                    <Boton
                        type="button"
                        claseAdicional="botonIconoEncabezado"
                        onClick={agregarPanelVista.onAbrir}
                        title={esTablet ? undefined : `Agregar panel (${agregarPanelVista.total}/${agregarPanelVista.maximo})`}
                    >
                        <SquarePlus size={14} />
                    </Boton>
                    {agregarPanelVista.abierto && (
                        <MenuContextual
                            opciones={agregarPanelVista.opciones}
                            posicionX={agregarPanelVista.posicion.x}
                            posicionY={agregarPanelVista.posicion.y}
                            onSeleccionar={agregarPanelVista.onSeleccionar}
                            onCerrar={agregarPanelVista.onCerrar}
                        />
                    )}
                </>
            )}

            {/* Configurar Layout */}
            {onClickLayout && (
                <Boton type="button" claseAdicional="botonIconoEncabezado" onClick={onClickLayout} title={esTablet ? undefined : 'Configurar Layout'}>
                    <LayoutGrid size={14} />
                </Boton>
            )}

            {/* Paneles: modal activar/desactivar (incl. minimizados) */}
            {onClickPaneles && (
                <Boton type="button" claseAdicional="botonIconoEncabezado" onClick={onClickPaneles} title={esTablet ? undefined : 'Paneles'}>
                    <PanelsTopLeft size={14} />
                </Boton>
            )}

            {/* Notificaciones */}
            {onClickNotificaciones && estaConectado && (
                <Boton type="button" claseAdicional={`botonIconoEncabezado botonIconoEncabezado--notificaciones ${notificacionesPendientes > 0 ? 'tieneNuevas' : ''}`} onClick={onClickNotificaciones} title={esTablet ? undefined : 'Notificaciones'}>
                    <Bell size={14} />
                    {notificacionesPendientes > 0 && <span className="encabezadoContadorNotificaciones">{notificacionesPendientes}</span>}
                </Boton>
            )}

            {/* Panel de Administración (solo admins) */}
            {esAdmin && onClickAdmin && (
                <Boton type="button" claseAdicional="botonIconoEncabezado" onClick={onClickAdmin} title={esTablet ? undefined : 'Panel de Administración'}>
                    <Settings size={14} />
                </Boton>
            )}

            {/* TO-DO: Mi Equipo (Social) - Habilitar cuando feature esté lista
            {onClickEquipos && estaConectado && (
                <Boton type="button" claseAdicional="botonIconoEncabezado botonIconoEncabezado--equipo" onClick={onClickEquipos} title={esTablet ? undefined : 'Mi Equipo'}>
                    <Users size={14} />
                    {equiposPendientes > 0 && <span className="encabezadoContador">{equiposPendientes}</span>}
                </Boton>
            )}
            */}
        </>
    );
}

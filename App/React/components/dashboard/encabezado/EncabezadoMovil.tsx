import {useMemo} from 'react';
import {Menu, MoreVertical, Search, CheckSquare, Activity, Folder, Bell, LayoutGrid, Users, Settings, FlaskConical, User, Database, Palette, Plug, LogOut} from 'lucide-react';
import {DrawerMovil, BottomSheet} from '../../shared';
import type {OpcionDrawer} from '../../shared/DrawerMovil';
import type {GrupoOpciones, OpcionMenu} from '../../shared/MenuOpcionesPanel';
import type {InfoSuscripcion, Tarea} from '../../../types/dashboard';

interface SincronizacionInfo {
    onLogin?: () => void;
    onLogout?: () => void;
    sincronizarAhora: () => Promise<void>;
    estaLogueado: boolean;
}

/* =========================================================================================
   COMPONENT 1: MENU MOVIL (Left - Hamburger + Drawer)
   ========================================================================================= */

interface EncabezadoMenuMovilProps {
    usuario: string;
    avatarUrl?: string;
    suscripcion?: InfoSuscripcion | null;
    esAdmin?: boolean;
    equiposPendientes?: number;
    notificacionesPendientes?: number;
    estaConectado: boolean;
    esTablet: boolean;
    sincronizacion?: SincronizacionInfo;

    drawerAbierto: boolean;
    onCerrarDrawer: () => void;
    onAbrirDrawer: () => void;

    // Actions needed for the Drawer Items
    onClickPlan?: () => void;
    onClickSeguridad?: () => void;
    onClickAdmin?: () => void;
    onClickLayout?: () => void;
    onClickVersion?: () => void;
    onClickUsuario?: () => void;
    onClickEquipos?: () => void;
    onClickNotificaciones?: (evento: React.MouseEvent) => void;
    onClickExperimentos?: () => void;
    onClickTemas?: () => void;
    onClickConfigUsuario?: () => void;
    onClickBackups?: () => void;
    onClickConfigMCP?: () => void;
    onExportarDatos?: () => void;
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
}

export function EncabezadoMenuMovil({usuario, avatarUrl, suscripcion, esAdmin, equiposPendientes = 0, notificacionesPendientes = 0, estaConectado, esTablet, sincronizacion, drawerAbierto, onCerrarDrawer, onAbrirDrawer, onClickPlan, onClickSeguridad, onClickAdmin, onClickLayout, onClickVersion, onClickUsuario, onClickEquipos, onClickNotificaciones, onClickExperimentos, onClickTemas, onClickConfigUsuario, onClickBackups, onClickConfigMCP, onExportarDatos, onCrearRapido}: EncabezadoMenuMovilProps) {
    /* Logic moved from DashboardEncabezado */
    const manejarOpcionDrawer = (opcionId: string) => {
        if (opcionId === 'notificaciones' && onClickNotificaciones) return onClickNotificaciones(undefined as any);
        if (opcionId === 'layout') return onClickLayout?.();
        if (opcionId === 'plan') return onClickPlan?.();
        if (opcionId === 'admin') return onClickAdmin?.();
        if (opcionId === 'experimentos') return onClickExperimentos?.();
        if (opcionId === 'equipos') return onClickEquipos?.();
        if (opcionId === 'login') return sincronizacion?.onLogin?.();
        if (opcionId === 'sync') return sincronizacion?.sincronizarAhora();
        if (['tarea', 'habito', 'proyecto'].includes(opcionId)) return onCrearRapido?.(opcionId as 'tarea' | 'habito' | 'proyecto');

        // User options
        switch (opcionId) {
            case 'perfil':
                onClickUsuario?.();
                break;
            case 'seguridad':
                onClickSeguridad?.();
                break;
            case 'backups':
                onClickBackups?.();
                break;
            case 'configuracion':
                onClickConfigUsuario?.();
                break;
            case 'version':
                onClickVersion?.();
                break;
            case 'plan':
                onClickPlan?.();
                break;
            case 'temas':
                onClickTemas?.();
                break;
            case 'mcp':
                onClickConfigMCP?.();
                break;
            case 'exportar':
                onExportarDatos?.();
                break;
            case 'logout':
                sincronizacion?.onLogout?.();
                break;
        }
    };

    const opcionesDrawer = useMemo((): OpcionDrawer[] => {
        const opciones: OpcionDrawer[] = [];
        if (onCrearRapido) opciones.push({id: 'tarea', etiqueta: 'Nueva Tarea', icono: <CheckSquare size={18} />}, {id: 'habito', etiqueta: 'Nuevo Hábito', icono: <Activity size={18} />}, {id: 'proyecto', etiqueta: 'Nuevo Proyecto', icono: <Folder size={18} />, separadorDespues: true});
        if (onClickNotificaciones && estaConectado) opciones.push({id: 'notificaciones', etiqueta: 'Notificaciones', icono: <Bell size={18} />, badge: notificacionesPendientes});
        if (onClickLayout) opciones.push({id: 'layout', etiqueta: 'Configurar Layout', icono: <LayoutGrid size={18} />});
        if (onClickEquipos && estaConectado) opciones.push({id: 'equipos', etiqueta: 'Mi Equipo', icono: <Users size={18} />, badge: equiposPendientes});
        if (esAdmin && onClickAdmin) opciones.push({id: 'admin', etiqueta: 'Administración', icono: <Settings size={18} />});
        if (onClickExperimentos) opciones.push({id: 'experimentos', etiqueta: 'Laboratorio', icono: <FlaskConical size={18} />, separadorDespues: true});
        return opciones;
    }, [onCrearRapido, onClickNotificaciones, estaConectado, notificacionesPendientes, onClickLayout, onClickEquipos, equiposPendientes, esAdmin, onClickAdmin, onClickExperimentos]);

    const opcionesSecundariasDrawer = useMemo(
        (): OpcionDrawer[] => [
            {id: 'perfil', etiqueta: 'Mi Perfil', icono: <User size={18} />},
            {id: 'backups', etiqueta: 'Copias de Seguridad', icono: <Database size={18} />},
            {id: 'temas', etiqueta: 'Temas', icono: <Palette size={18} />},
            {id: 'mcp', etiqueta: 'Conectar con IA', icono: <Plug size={18} />, separadorDespues: true},
            {id: 'logout', etiqueta: 'Cerrar Sesión', icono: <LogOut size={18} />, peligroso: true}
        ],
        []
    );

    return (
        <>
            <button type="button" className="botonIconoEncabezado botonMenuMovil" onClick={onAbrirDrawer} title={esTablet ? undefined : 'Menú'} aria-label="Abrir menú de navegación">
                <Menu size={18} />
                {(notificacionesPendientes > 0 || equiposPendientes > 0) && <span className="botonIconoEncabezado__puntoNotificacion" />}
            </button>

            <DrawerMovil estaAbierto={drawerAbierto} onCerrar={onCerrarDrawer} usuario={{nombre: usuario, avatar: avatarUrl}} suscripcion={suscripcion} opciones={opcionesDrawer} onSeleccionar={manejarOpcionDrawer} opcionesSecundarias={opcionesSecundariasDrawer} />
        </>
    );
}

/* =========================================================================================
   COMPONENT 2: OPCIONES MOVIL (Right - 3 Dots + BottomSheet)
   ========================================================================================= */

interface EncabezadoOpcionesMovilProps {
    opcionesMovil?: {
        titulo: string;
        grupos?: GrupoOpciones[];
        opciones?: OpcionMenu[];
        tieneFiltrosActivos?: boolean;
    };
    menuOpcionesMovilAbierto: boolean;
    onAbrirMenuOpcionesMovil: () => void;
    onCerrarMenuOpcionesMovil: () => void;

    // Search props for the bottom sheet item
    estaConectado: boolean;
    onSeleccionarTarea?: (tarea: Tarea) => void;
    onAbrirBuscadorMovil: () => void;
    esTablet: boolean;
}

export function EncabezadoOpcionesMovil({opcionesMovil, menuOpcionesMovilAbierto, onAbrirMenuOpcionesMovil, onCerrarMenuOpcionesMovil, estaConectado, onSeleccionarTarea, onAbrirBuscadorMovil, esTablet}: EncabezadoOpcionesMovilProps) {
    if (!opcionesMovil) return null;

    return (
        <>
            <button type="button" className={`botonIconoEncabezado botonOpcionesMovil ${opcionesMovil.tieneFiltrosActivos ? 'botonOpcionesMovil--activo' : ''}`} onClick={onAbrirMenuOpcionesMovil} title={esTablet ? undefined : 'Opciones del panel'}>
                <MoreVertical size={18} />
                {opcionesMovil.tieneFiltrosActivos && <span className="badgeFiltrosActivos" />}
            </button>

            <BottomSheet estaAbierto={menuOpcionesMovilAbierto} onCerrar={onCerrarMenuOpcionesMovil}>
                <div className="menuOpcionesPanelContenido">
                    {/* Opcion de busqueda primero */}
                    {estaConectado && onSeleccionarTarea && (
                        <div className="menuOpcionesPanelGrupo">
                            <button
                                className="menuOpcionesPanelItem"
                                onClick={() => {
                                    onCerrarMenuOpcionesMovil();
                                    onAbrirBuscadorMovil();
                                }}>
                                <span className="menuOpcionesPanelItemIcono">
                                    <Search size={14} />
                                </span>
                                <span className="menuOpcionesPanelItemTexto">
                                    <span className="menuOpcionesPanelItemEtiqueta">Buscar</span>
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Opciones sueltas */}
                    {opcionesMovil.opciones && opcionesMovil.opciones.length > 0 && (
                        <div className="menuOpcionesPanelGrupo">
                            {estaConectado && onSeleccionarTarea && <div className="menuOpcionesPanelSeparador" />}
                            {opcionesMovil.opciones.map(opcion => (
                                <button
                                    key={opcion.id}
                                    className={`menuOpcionesPanelItem ${opcion.activo ? 'menuOpcionesPanelItem--activo' : ''}`}
                                    onClick={() => {
                                        opcion.onClick();
                                        onCerrarMenuOpcionesMovil();
                                    }}>
                                    {opcion.icono && <span className="menuOpcionesPanelItemIcono">{opcion.icono}</span>}
                                    <span className="menuOpcionesPanelItemTexto">
                                        <span className="menuOpcionesPanelItemEtiqueta">{opcion.etiqueta}</span>
                                        {opcion.descripcion && <span className="menuOpcionesPanelItemDescripcion">{opcion.descripcion}</span>}
                                    </span>
                                    {opcion.activo && <span className="menuOpcionesPanelItemCheck">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Grupos de opciones */}
                    {opcionesMovil.grupos?.map((grupo, idx) => (
                        <div key={grupo.titulo} className="menuOpcionesPanelGrupo">
                            {(idx > 0 || (opcionesMovil.opciones && opcionesMovil.opciones.length > 0)) && <div className="menuOpcionesPanelSeparador" />}
                            {grupo.opciones.map(opcion => (
                                <button
                                    key={opcion.id}
                                    className={`menuOpcionesPanelItem ${opcion.activo ? 'menuOpcionesPanelItem--activo' : ''}`}
                                    onClick={() => {
                                        opcion.onClick();
                                        onCerrarMenuOpcionesMovil();
                                    }}>
                                    {opcion.icono && <span className="menuOpcionesPanelItemIcono">{opcion.icono}</span>}
                                    <span className="menuOpcionesPanelItemTexto">
                                        <span className="menuOpcionesPanelItemEtiqueta">{opcion.etiqueta}</span>
                                        {opcion.descripcion && <span className="menuOpcionesPanelItemDescripcion">{opcion.descripcion}</span>}
                                    </span>
                                    {opcion.activo && <span className="menuOpcionesPanelItemCheck">✓</span>}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </BottomSheet>
        </>
    );
}

import {useMemo} from 'react';
import {Menu, MoreVertical, Search} from 'lucide-react';
import {obtenerOpcionesMenuUsuario, obtenerOpcionCerrarSesion} from '../../../utils/opcionesMenuUsuario';
import {DrawerMovil, BottomSheet} from '../../shared';
import type {OpcionDrawer} from '../../shared/DrawerMovil';
import type {GrupoOpciones, OpcionMenu} from '../../shared/MenuOpcionesPanel';
import type {InfoSuscripcion, Tarea, SincronizacionInfo} from '../../../types/dashboard';
import type {PaginaMovil} from '../../../hooks/usePaginaMovil';

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
    onClickPlugins?: () => void;
    onExportarDatos?: () => void;
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    onCambiarPagina?: (pagina: PaginaMovil) => void;
}

export function EncabezadoMenuMovil({usuario, avatarUrl, suscripcion, esAdmin, equiposPendientes = 0, notificacionesPendientes = 0, estaConectado, esTablet, sincronizacion, drawerAbierto, onCerrarDrawer, onAbrirDrawer, onClickPlan, onClickSeguridad, onClickAdmin, onClickLayout, onClickVersion, onClickUsuario, onClickEquipos, onClickNotificaciones, onClickExperimentos, onClickTemas, onClickConfigUsuario, onClickBackups, onClickConfigMCP, onClickPlugins, onExportarDatos, onCrearRapido, onCambiarPagina}: EncabezadoMenuMovilProps) {
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
            case 'plugins':
                onClickPlugins?.();
                break;
            case 'exportar':
                onExportarDatos?.();
                break;
            case 'actividad':
                onCambiarPagina?.('actividad');
                onCerrarDrawer();
                break;
            case 'logout':
                sincronizacion?.onLogout?.();
                break;
        }
    };

    /*
     * Opciones principales del drawer usando configuración centralizada
     * Las opciones de layout, notificaciones, admin y laboratorio no van en móvil
     */
    const opcionesDrawer = useMemo((): OpcionDrawer[] => {
        const opcionesCentralizadas = obtenerOpcionesMenuUsuario({
            esMovil: true,
            esPremium: suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa',
            version: '',
            tamanoIcono: 18
        });

        return opcionesCentralizadas.map(opcion => ({
            id: opcion.id,
            etiqueta: opcion.etiqueta,
            icono: opcion.icono,
            separadorDespues: opcion.separadorDespues,
            peligroso: opcion.peligroso
        }));
    }, [suscripcion]);

    /*
     * Opciones secundarias: solo cerrar sesión al final
     * Admin y laboratorio NO van en móvil según ROADMAP
     */
    const opcionesSecundariasDrawer = useMemo((): OpcionDrawer[] => {
        const opcionLogout = obtenerOpcionCerrarSesion(18);
        return [
            {
                id: opcionLogout.id,
                etiqueta: opcionLogout.etiqueta,
                icono: opcionLogout.icono,
                peligroso: opcionLogout.peligroso
            }
        ];
    }, []);

    return (
        <>
            <button type="button" className="botonIconoEncabezado botonMenuMovil" onClick={onAbrirDrawer} title={esTablet ? undefined : 'Menú'} aria-label="Abrir menú de navegación">
                <Menu size={18} />
                {(notificacionesPendientes > 0 || equiposPendientes > 0) && <span className="botonIconoEncabezado__puntoNotificacion" />}
            </button>

            <DrawerMovil estaAbierto={drawerAbierto} onCerrar={onCerrarDrawer} usuario={{nombre: usuario, avatar: avatarUrl}} suscripcion={suscripcion} opciones={opcionesDrawer} onSeleccionar={manejarOpcionDrawer} opcionesSecundarias={opcionesSecundariasDrawer} onClickPerfil={onClickUsuario} onClickPlan={onClickPlan} />
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
                                <span className="menuOpcionesPanelItemTexto">
                                    <span className="menuOpcionesPanelItemEtiqueta">Buscar</span>
                                </span>
                                <span className="menuOpcionesPanelItemIcono">
                                    <Search size={14} />
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
                                    <span className="menuOpcionesPanelItemTexto">
                                        <span className="menuOpcionesPanelItemEtiqueta">{opcion.etiqueta}</span>
                                        {opcion.descripcion && <span className="menuOpcionesPanelItemDescripcion">{opcion.descripcion}</span>}
                                    </span>
                                    {opcion.icono && <span className="menuOpcionesPanelItemIcono">{opcion.icono}</span>}
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
                                    <span className="menuOpcionesPanelItemTexto">
                                        <span className="menuOpcionesPanelItemEtiqueta">{opcion.etiqueta}</span>
                                        {opcion.descripcion && <span className="menuOpcionesPanelItemDescripcion">{opcion.descripcion}</span>}
                                    </span>
                                    {opcion.icono && <span className="menuOpcionesPanelItemIcono">{opcion.icono}</span>}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </BottomSheet>
        </>
    );
}

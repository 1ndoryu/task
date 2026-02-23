import {Menu, MoreVertical, Search} from 'lucide-react';
import {useEncabezadoMovil} from '../../../hooks/dashboard/useEncabezadoMovil';
import {DrawerMovil, BottomSheet} from '../../shared';
import {Boton} from '../../ui/Boton';
import type {GrupoOpciones, OpcionMenuPanel} from '../../shared/MenuOpcionesPanel';
import type {InfoSuscripcion, Tarea, SincronizacionInfo} from '../../../types/dashboard';
import type {PaginaMovil} from '../../../hooks/usePaginaMovil';

/* COMPONENT 1: MENU MOVIL (Left - Hamburger + Drawer) */

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
    onClickNotificaciones?: (evento?: React.MouseEvent) => void;
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
    const {manejarOpcionDrawer, opcionesDrawer, opcionesSecundariasDrawer} = useEncabezadoMovil({suscripcion, sincronizacion, onCerrarDrawer, onClickPlan, onClickSeguridad, onClickAdmin, onClickLayout, onClickVersion, onClickUsuario, onClickEquipos, onClickNotificaciones, onClickExperimentos, onClickTemas, onClickConfigUsuario, onClickBackups, onClickConfigMCP, onClickPlugins, onExportarDatos, onCrearRapido, onCambiarPagina});

    return (
        <>
            <Boton type="button" claseAdicional="botonIconoEncabezado botonMenuMovil" onClick={onAbrirDrawer} title={esTablet ? undefined : 'Menú'} aria-label="Abrir menú de navegación">
                <Menu size={18} />
                {(notificacionesPendientes > 0 || equiposPendientes > 0) && <span className="botonIconoEncabezado__puntoNotificacion" />}
            </Boton>

            <DrawerMovil estaAbierto={drawerAbierto} onCerrar={onCerrarDrawer} usuario={{nombre: usuario, avatar: avatarUrl}} suscripcion={suscripcion} opciones={opcionesDrawer} onSeleccionar={manejarOpcionDrawer} opcionesSecundarias={opcionesSecundariasDrawer} onClickPerfil={onClickUsuario} onClickPlan={onClickPlan} />
        </>
    );
}

/* COMPONENT 2: OPCIONES MOVIL (Right - 3 Dots + BottomSheet) */

interface EncabezadoOpcionesMovilProps {
    opcionesMovil?: {
        titulo: string;
        grupos?: GrupoOpciones[];
        opciones?: OpcionMenuPanel[];
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
            <Boton type="button" claseAdicional={`botonIconoEncabezado botonOpcionesMovil ${opcionesMovil.tieneFiltrosActivos ? 'botonOpcionesMovil--activo' : ''}`} onClick={onAbrirMenuOpcionesMovil} title={esTablet ? undefined : 'Opciones del panel'}>
                <MoreVertical size={18} />
            </Boton>

            <BottomSheet estaAbierto={menuOpcionesMovilAbierto} onCerrar={onCerrarMenuOpcionesMovil}>
                <div className="menuOpcionesPanelContenido">
                    {/* Opcion de busqueda primero */}
                    {estaConectado && onSeleccionarTarea && (
                        <div className="menuOpcionesPanelGrupo">
                            <Boton
                                claseAdicional="menuOpcionesPanelItem"
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
                            </Boton>
                        </div>
                    )}

                    {/* Opciones sueltas */}
                    {opcionesMovil.opciones && opcionesMovil.opciones.length > 0 && (
                        <div className="menuOpcionesPanelGrupo">
                            {estaConectado && onSeleccionarTarea && <div className="menuOpcionesPanelSeparador" />}
                            {opcionesMovil.opciones.map(opcion => (
                                <Boton
                                    key={opcion.id}
                                    claseAdicional={`menuOpcionesPanelItem ${opcion.activo ? 'menuOpcionesPanelItem--activo' : ''}`}
                                    onClick={() => {
                                        opcion.onClick();
                                        onCerrarMenuOpcionesMovil();
                                    }}>
                                    <span className="menuOpcionesPanelItemTexto">
                                        <span className="menuOpcionesPanelItemEtiqueta">{opcion.etiqueta}</span>
                                        {opcion.descripcion && <span className="menuOpcionesPanelItemDescripcion">{opcion.descripcion}</span>}
                                    </span>
                                    {opcion.icono && <span className="menuOpcionesPanelItemIcono">{opcion.icono}</span>}
                                </Boton>
                            ))}
                        </div>
                    )}

                    {/* Grupos de opciones */}
                    {opcionesMovil.grupos?.map((grupo, idx) => (
                        <div key={grupo.titulo} className="menuOpcionesPanelGrupo">
                            {(idx > 0 || (opcionesMovil.opciones && opcionesMovil.opciones.length > 0)) && <div className="menuOpcionesPanelSeparador" />}
                            {grupo.opciones.map(opcion => (
                                <Boton
                                    key={opcion.id}
                                    claseAdicional={`menuOpcionesPanelItem ${opcion.activo ? 'menuOpcionesPanelItem--activo' : ''}`}
                                    onClick={() => {
                                        opcion.onClick();
                                        onCerrarMenuOpcionesMovil();
                                    }}>
                                    <span className="menuOpcionesPanelItemTexto">
                                        <span className="menuOpcionesPanelItemEtiqueta">{opcion.etiqueta}</span>
                                        {opcion.descripcion && <span className="menuOpcionesPanelItemDescripcion">{opcion.descripcion}</span>}
                                    </span>
                                    {opcion.icono && <span className="menuOpcionesPanelItemIcono">{opcion.icono}</span>}
                                </Boton>
                            ))}
                        </div>
                    ))}
                </div>
            </BottomSheet>
        </>
    );
}

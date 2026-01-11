/*
 * DashboardEncabezado
 * Componente del header del dashboard
 * Responsabilidad única: mostrar logo, título y navegación
 */

import {useState, useRef, useMemo} from 'react';
import {Settings, LayoutGrid, Wifi, WifiOff, RefreshCw, User, LogOut, AlertTriangle, Shield, ClipboardList, Crown, Users, Bell, FlaskConical, Download, Upload, ChevronDown, LayoutDashboard, Calendar, FileText, Plus, CheckSquare, Activity, Folder, Palette, Plug, Menu, Search, X, MoreVertical} from 'lucide-react';
import {IndicadorPlan, MenuContextual, DrawerMovil, BottomSheet} from '../shared';
import type {GrupoOpciones, OpcionMenu} from '../shared/MenuOpcionesPanel';
import type {OpcionDrawer} from '../shared/DrawerMovil';
import {BuscadorGlobal} from './BuscadorGlobal';
import {VERSION_ACTUAL} from '../../data/changelog';
import {APP_TEXTS} from '../../constants/appTexts';
import type {InfoSuscripcion, Tarea, Habito, Proyecto} from '../../types/dashboard';

interface SincronizacionInfo {
    sincronizado: boolean;
    pendiente: boolean;
    error: string | null;
    estaLogueado: boolean;
    sincronizarAhora: () => Promise<void>;
    onLogin?: () => void;
    onLogout?: () => void;
}

interface DashboardEncabezadoProps {
    titulo?: string;
    version?: string;
    usuario?: string;
    avatarUrl?: string;
    sincronizacion?: SincronizacionInfo;
    suscripcion?: InfoSuscripcion | null;
    esAdmin?: boolean;
    equiposPendientes?: number;
    notificacionesPendientes?: number;
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
    onClickConfigMCP?: () => void;
    onExportarDatos?: () => void;
    onImportarDatos?: (archivo: File) => void;
    /* Props para buscador global */
    tareas?: Tarea[];
    habitos?: Habito[];
    proyectos?: Proyecto[];
    onSeleccionarTarea?: (tarea: Tarea) => void;
    onSeleccionarHabito?: (habito: Habito) => void;
    onSeleccionarProyecto?: (proyecto: Proyecto) => void;
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    /* Props para menú opciones móvil (Fase 10.8.3) */
    opcionesMovil?: {
        titulo: string;
        grupos?: GrupoOpciones[];
        opciones?: OpcionMenu[];
        tieneFiltrosActivos?: boolean;
    };
}

interface MenuState {
    visible: boolean;
    x: number;
    y: number;
}

export function DashboardEncabezado({titulo = APP_TEXTS.dashboard.titulo, version = VERSION_ACTUAL, usuario = 'user@admin', avatarUrl, sincronizacion, suscripcion, esAdmin = false, equiposPendientes = 0, notificacionesPendientes = 0, onClickPlan, onClickSeguridad, onClickAdmin, onClickLayout, onClickVersion, onClickUsuario, onClickEquipos, onClickNotificaciones, onClickExperimentos, onClickTemas, onClickConfigMCP, onExportarDatos, onImportarDatos, tareas = [], habitos = [], proyectos = [], onSeleccionarTarea, onSeleccionarHabito, onSeleccionarProyecto, onCrearRapido, opcionesMovil}: DashboardEncabezadoProps): JSX.Element {
    const estaConectado = sincronizacion?.estaLogueado ?? false;
    const [menuUsuario, setMenuUsuario] = useState<MenuState>({visible: false, x: 0, y: 0});
    const [menuPagina, setMenuPagina] = useState<MenuState>({visible: false, x: 0, y: 0});
    const [menuCrear, setMenuCrear] = useState<MenuState>({visible: false, x: 0, y: 0});
    const [drawerAbierto, setDrawerAbierto] = useState(false);
    const [mostrarBuscadorMovil, setMostrarBuscadorMovil] = useState(false);
    const [menuOpcionesMovilAbierto, setMenuOpcionesMovilAbierto] = useState(false);
    const inputArchivoRef = useRef<HTMLInputElement>(null);

    /* Determinar si mostrar badge de plan en header (solo FREE y TRIAL) */
    const esPremiumActivo = suscripcion?.plan === 'premium' && suscripcion?.estado === 'activa';
    const mostrarBadgePlanEnHeader = suscripcion && !esPremiumActivo;

    /* Opciones del menu contextual del usuario */
    const opcionesMenuUsuario = [{id: 'perfil', etiqueta: 'Mi Perfil', icono: <User size={12} />}, {id: 'seguridad', etiqueta: 'Seguridad', icono: <Shield size={12} />}, {id: 'temas', etiqueta: 'Temas', icono: <Palette size={12} />}, {id: 'mcp', etiqueta: 'Conectar con IA', icono: <Plug size={12} />}, ...(esPremiumActivo ? [{id: 'plan', etiqueta: 'Plan Premium', icono: <Crown size={12} />}] : []), {id: 'version', etiqueta: `Versión ${version}`, icono: <ClipboardList size={12} />, separadorDespues: true}, {id: 'exportar', etiqueta: 'Exportar datos', icono: <Download size={12} />}, {id: 'importar', etiqueta: 'Importar datos', icono: <Upload size={12} />, separadorDespues: true}, {id: 'logout', etiqueta: 'Cerrar Sesión', icono: <LogOut size={12} />, peligroso: true}];

    /* Opciones del menu de navegación de página */
    const opcionesMenuPagina = [
        {id: 'dashboard', etiqueta: 'Dashboard', icono: <LayoutDashboard size={12} />}, // Sin 'activo: true' en type, se puede manejar visualmente si se quiere
        {id: 'calendario', etiqueta: 'Calendario', icono: <Calendar size={12} />, deshabilitado: true},
        {id: 'archivos', etiqueta: 'Archivos', icono: <FileText size={12} />, deshabilitado: true}
    ];

    /* Opciones del menu de creación rápida */
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

    const manejarClickUsuario = (evento: React.MouseEvent) => {
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuUsuario({
            visible: true,
            x: rect.right - 160,
            y: rect.bottom + 4
        });
    };

    const manejarClickPagina = (evento: React.MouseEvent) => {
        evento.preventDefault();
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuPagina({
            visible: true,
            x: rect.left,
            y: rect.bottom + 4
        });
    };

    const manejarClickMenuMovil = () => {
        setDrawerAbierto(true);
    };

    const toggleBuscadorMovil = () => {
        setMostrarBuscadorMovil(!mostrarBuscadorMovil);
    };

    const manejarOpcionMenu = (opcionId: string) => {
        switch (opcionId) {
            case 'perfil':
                onClickUsuario?.();
                break;
            case 'seguridad':
                onClickSeguridad?.();
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
            case 'importar':
                inputArchivoRef.current?.click();
                break;
            case 'logout':
                sincronizacion?.onLogout?.();
                break;
        }
        setMenuUsuario({...menuUsuario, visible: false});
    };

    const manejarOpcionPagina = (opcionId: string) => {
        /* Aquí iría la navegación real */
        console.log(`Navegar a: ${opcionId}`);
        setMenuPagina({...menuPagina, visible: false});
    };

    const manejarCambioArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = evento.target.files?.[0];
        if (archivo && onImportarDatos) {
            onImportarDatos(archivo);
            if (inputArchivoRef.current) {
                inputArchivoRef.current.value = '';
            }
        }
    };

    const manejarOpcionDrawer = (opcionId: string) => {
        /* Acciones directas */
        if (opcionId === 'notificaciones' && onClickNotificaciones) return onClickNotificaciones(undefined as any);
        if (opcionId === 'layout') return onClickLayout?.();
        if (opcionId === 'plan') return onClickPlan?.();
        if (opcionId === 'admin') return onClickAdmin?.();
        if (opcionId === 'experimentos') return onClickExperimentos?.();
        if (opcionId === 'equipos') return onClickEquipos?.();
        if (opcionId === 'login') return sincronizacion?.onLogin?.();
        if (opcionId === 'sync') return sincronizacion?.sincronizarAhora();

        /* Creación rápida */
        if (['tarea', 'habito', 'proyecto'].includes(opcionId)) {
            return onCrearRapido?.(opcionId as 'tarea' | 'habito' | 'proyecto');
        }

        /* Opciones de usuario (reutilizamos lógica) */
        manejarOpcionMenu(opcionId);
    };

    /* Construir opciones del drawer móvil */
    const opcionesDrawer = useMemo((): OpcionDrawer[] => {
        const opciones: OpcionDrawer[] = [];

        /* Creación rápida */
        if (onCrearRapido) {
            opciones.push({id: 'tarea', etiqueta: 'Nueva Tarea', icono: <CheckSquare size={18} />}, {id: 'habito', etiqueta: 'Nuevo Hábito', icono: <Activity size={18} />}, {id: 'proyecto', etiqueta: 'Nuevo Proyecto', icono: <Folder size={18} />, separadorDespues: true});
        }

        /* Notificaciones */
        if (onClickNotificaciones && estaConectado) {
            opciones.push({id: 'notificaciones', etiqueta: 'Notificaciones', icono: <Bell size={18} />, badge: notificacionesPendientes});
        }

        /* Layout */
        if (onClickLayout) {
            opciones.push({id: 'layout', etiqueta: 'Configurar Layout', icono: <LayoutGrid size={18} />});
        }

        /* Equipos */
        if (onClickEquipos && estaConectado) {
            opciones.push({id: 'equipos', etiqueta: 'Mi Equipo', icono: <Users size={18} />, badge: equiposPendientes});
        }

        /* Admin */
        if (esAdmin && onClickAdmin) {
            opciones.push({id: 'admin', etiqueta: 'Administración', icono: <Settings size={18} />});
        }

        /* Experimentos */
        if (onClickExperimentos) {
            opciones.push({id: 'experimentos', etiqueta: 'Laboratorio', icono: <FlaskConical size={18} />, separadorDespues: true});
        }

        return opciones;
    }, [onCrearRapido, onClickNotificaciones, estaConectado, notificacionesPendientes, onClickLayout, onClickEquipos, equiposPendientes, esAdmin, onClickAdmin, onClickExperimentos]);

    /* Opciones secundarias del drawer (pie) */
    const opcionesSecundariasDrawer = useMemo(
        (): OpcionDrawer[] => [
            {id: 'perfil', etiqueta: 'Mi Perfil', icono: <User size={18} />},
            {id: 'temas', etiqueta: 'Temas', icono: <Palette size={18} />},
            {id: 'mcp', etiqueta: 'Conectar con IA', icono: <Plug size={18} />, separadorDespues: true},
            {id: 'logout', etiqueta: 'Cerrar Sesión', icono: <LogOut size={18} />, peligroso: true}
        ],
        []
    );

    /* Determinar icono y estado del indicador de conexion/sync */
    const obtenerEstadoConexion = () => {
        if (!estaConectado) {
            return {
                icono: <WifiOff size={14} />,
                clase: 'estadoConexionIcono--desconectado',
                titulo: 'Modo local - Click para iniciar sesión',
                onClick: sincronizacion?.onLogin,
                texto: 'Iniciar sesión'
            };
        }

        if (sincronizacion?.error) {
            return {
                icono: <AlertTriangle size={14} />,
                clase: 'estadoConexionIcono--error',
                titulo: `Error: ${sincronizacion.error}. Click para reintentar.`,
                onClick: sincronizacion.sincronizarAhora
            };
        }

        if (sincronizacion?.pendiente || !sincronizacion?.sincronizado) {
            return {
                icono: <RefreshCw size={14} className="iconoGirando" />,
                clase: 'estadoConexionIcono--sincronizando',
                titulo: 'Sincronizando...',
                onClick: undefined
            };
        }

        return {
            icono: <Wifi size={14} />,
            clase: 'estadoConexionIcono--conectado',
            titulo: 'Conectado y sincronizado',
            onClick: undefined
        };
    };

    const estadoConexion = obtenerEstadoConexion();

    return (
        <header id="dashboard-encabezado" className="dashboardEncabezado">
            {/* BOTON HAMBURGUESA (izquierda en movil) */}
            <button type="button" className="botonIconoEncabezado botonMenuMovil" onClick={manejarClickMenuMovil} title="Menú" aria-label="Abrir menú de navegación">
                <Menu size={18} />
                {(notificacionesPendientes > 0 || equiposPendientes > 0) && <span className="botonIconoEncabezado__puntoNotificacion" />}
            </button>

            {/* LOGO/TITULO (centro en movil, izquierda en desktop) */}
            <div className="encabezadoIzquierda">
                <div className="encabezadoLogo">
                    <button className="encabezadoTituloBoton" onClick={manejarClickPagina}>
                        <span className="encabezadoTituloTexto">{titulo}</span>
                        <ChevronDown size={14} className={`encabezadoTituloIcono ${menuPagina.visible ? 'rotado' : ''}`} />
                    </button>
                    {menuPagina.visible && <MenuContextual opciones={opcionesMenuPagina} posicionX={menuPagina.x} posicionY={menuPagina.y} onSeleccionar={manejarOpcionPagina} onCerrar={() => setMenuPagina({...menuPagina, visible: false})} />}
                </div>
            </div>

            {/* Buscador Global Centrado */}
            {estaConectado && onSeleccionarTarea && onSeleccionarHabito && onSeleccionarProyecto && (
                <div className="encabezadoBuscador">
                    <BuscadorGlobal tareas={tareas} habitos={habitos} proyectos={proyectos} onSeleccionarTarea={onSeleccionarTarea} onSeleccionarHabito={onSeleccionarHabito} onSeleccionarProyecto={onSeleccionarProyecto} />
                </div>
            )}

            <nav className="encabezadoNav">
                {/* Indicador de Plan - Solo para FREE y TRIAL */}
                {mostrarBadgePlanEnHeader && <IndicadorPlan suscripcion={suscripcion} onClick={onClickPlan} />}

                {/* Crear Nuevo (Tarea/Hábito/Proyecto) */}
                {onCrearRapido && (
                    <>
                        <button type="button" className="botonIconoEncabezado" onClick={manejarClickCrear} title="Crear nuevo...">
                            <Plus size={14} />
                        </button>
                        {menuCrear.visible && <MenuContextual opciones={opcionesMenuCrear} posicionX={menuCrear.x} posicionY={menuCrear.y} onSeleccionar={manejarSeleccionCrear} onCerrar={() => setMenuCrear({...menuCrear, visible: false})} />}
                    </>
                )}

                {/* Configurar Layout */}
                {onClickLayout && (
                    <button type="button" className="botonIconoEncabezado" onClick={onClickLayout} title="Configurar Layout">
                        <LayoutGrid size={14} />
                    </button>
                )}

                {/* Notificaciones */}
                {onClickNotificaciones && estaConectado && (
                    <button type="button" className={`botonIconoEncabezado botonIconoEncabezado--notificaciones ${notificacionesPendientes > 0 ? 'tieneNuevas' : ''}`} onClick={onClickNotificaciones} title="Notificaciones">
                        <Bell size={14} />
                        {notificacionesPendientes > 0 && <span className="botonIconoEncabezado__contadorNotificaciones">{notificacionesPendientes}</span>}
                    </button>
                )}

                {/* Laboratorio de Pruebas (solo admins) */}
                {onClickExperimentos && (
                    <button type="button" className="botonIconoEncabezado" onClick={onClickExperimentos} title="Laboratorio de Pruebas">
                        <FlaskConical size={14} />
                    </button>
                )}

                {/* Panel de Administración (solo admins) */}
                {esAdmin && onClickAdmin && (
                    <button type="button" className="botonIconoEncabezado" onClick={onClickAdmin} title="Panel de Administración">
                        <Settings size={14} />
                    </button>
                )}

                {/* Mi Equipo (Social) */}
                {onClickEquipos && estaConectado && (
                    <button type="button" className="botonIconoEncabezado botonIconoEncabezado--equipo" onClick={onClickEquipos} title="Mi Equipo">
                        <Users size={14} />
                        {equiposPendientes > 0 && <span className="botonIconoEncabezado__contador">{equiposPendientes}</span>}
                    </button>
                )}

                {/* Estado de conexion/sincronizacion unificado */}
                {estadoConexion.onClick ? (
                    <button type="button" className={`estadoConexionIcono ${estadoConexion.clase}`} title={estadoConexion.titulo} onClick={estadoConexion.onClick}>
                        {estadoConexion.icono}
                        {'texto' in estadoConexion && estadoConexion.texto && <span className="estadoConexionIcono__texto">{estadoConexion.texto}</span>}
                    </button>
                ) : (
                    <span className={`estadoConexionIcono ${estadoConexion.clase}`} title={estadoConexion.titulo}>
                        {estadoConexion.icono}
                    </span>
                )}

                {/* Usuario con menu contextual */}
                {estaConectado && (
                    <button type="button" className="badgeEncabezado badgeEncabezado--usuario" onClick={manejarClickUsuario} title="Opciones de usuario">
                        {avatarUrl ? <img src={avatarUrl} alt="" className="avatarEncabezado" /> : <span className="avatarEncabezadoInicial">{usuario.charAt(0).toUpperCase()}</span>}
                        <span className="nombreUsuarioEncabezado">{usuario}</span>
                    </button>
                )}

                {/* Menu contextual del usuario */}
                {menuUsuario.visible && <MenuContextual opciones={opcionesMenuUsuario} posicionX={menuUsuario.x} posicionY={menuUsuario.y} onSeleccionar={manejarOpcionMenu} onCerrar={() => setMenuUsuario({...menuUsuario, visible: false})} />}

                {/* Input oculto para importar archivo */}
                <input ref={inputArchivoRef} type="file" accept=".json" onChange={manejarCambioArchivo} style={{display: 'none'}} />

                {/* BOTON BUSCAR MOVIL */}
                {estaConectado && onSeleccionarTarea && (
                    <button type="button" className="botonIconoEncabezado botonBuscadorMovil" onClick={toggleBuscadorMovil} title="Buscar">
                        <Search size={18} />
                    </button>
                )}

                {/* BOTON OPCIONES MOVIL (3 puntos) - Fase 10.8.3 */}
                {opcionesMovil && (
                    <button type="button" className={`botonIconoEncabezado botonOpcionesMovil ${opcionesMovil.tieneFiltrosActivos ? 'botonOpcionesMovil--activo' : ''}`} onClick={() => setMenuOpcionesMovilAbierto(true)} title="Opciones del panel">
                        <MoreVertical size={18} />
                        {opcionesMovil.tieneFiltrosActivos && <span className="botonIconoEncabezado__puntoNotificacion" />}
                    </button>
                )}

                {/* BOTTOM SHEET OPCIONES MOVIL */}
                {opcionesMovil && (
                    <BottomSheet estaAbierto={menuOpcionesMovilAbierto} onCerrar={() => setMenuOpcionesMovilAbierto(false)} titulo={opcionesMovil.titulo}>
                        <div className="menuOpcionesPanelContenido">
                            {/* Opciones sueltas primero */}
                            {opcionesMovil.opciones && opcionesMovil.opciones.length > 0 && (
                                <div className="menuOpcionesPanelGrupo">
                                    {opcionesMovil.opciones.map(opcion => (
                                        <button
                                            key={opcion.id}
                                            className={`menuOpcionesPanelItem ${opcion.activo ? 'menuOpcionesPanelItem--activo' : ''}`}
                                            onClick={() => {
                                                opcion.onClick();
                                                setMenuOpcionesMovilAbierto(false);
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
                                    <div className="menuOpcionesPanelGrupoTitulo">{grupo.titulo}</div>
                                    {grupo.opciones.map(opcion => (
                                        <button
                                            key={opcion.id}
                                            className={`menuOpcionesPanelItem ${opcion.activo ? 'menuOpcionesPanelItem--activo' : ''}`}
                                            onClick={() => {
                                                opcion.onClick();
                                                setMenuOpcionesMovilAbierto(false);
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
                )}

                {/* DRAWER MOVIL (navegacion lateral) */}
                <DrawerMovil
                    estaAbierto={drawerAbierto}
                    onCerrar={() => setDrawerAbierto(false)}
                    usuario={{
                        nombre: usuario,
                        avatar: avatarUrl
                    }}
                    suscripcion={suscripcion}
                    opciones={opcionesDrawer}
                    onSeleccionar={manejarOpcionDrawer}
                    opcionesSecundarias={opcionesSecundariasDrawer}
                />
            </nav>

            {/* MODAL BUSCADOR MOVIL */}
            {mostrarBuscadorMovil && (
                <div className="buscadorModalOverlay" onClick={() => setMostrarBuscadorMovil(false)}>
                    <div className="buscadorModalContenido" onClick={e => e.stopPropagation()}>
                        <div className="buscadorModalHeader">
                            <h3 className="buscadorModalTitulo">Buscar</h3>
                            <button className="buscadorModalCerrar" onClick={() => setMostrarBuscadorMovil(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <BuscadorGlobal
                            tareas={tareas}
                            habitos={habitos}
                            proyectos={proyectos}
                            onSeleccionarTarea={t => {
                                onSeleccionarTarea?.(t);
                                setMostrarBuscadorMovil(false);
                            }}
                            onSeleccionarHabito={h => {
                                onSeleccionarHabito?.(h);
                                setMostrarBuscadorMovil(false);
                            }}
                            onSeleccionarProyecto={p => {
                                onSeleccionarProyecto?.(p);
                                setMostrarBuscadorMovil(false);
                            }}
                        />
                    </div>
                </div>
            )}
        </header>
    );
}

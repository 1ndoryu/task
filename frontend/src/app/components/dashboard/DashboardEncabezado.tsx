/*
 * DashboardEncabezado
 * Componente del header del dashboard
 * Refactorizado para usar sub-componentes (SOLID) y prevenir re-renders de BuscadorGlobal
 */

import {Search} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {APP_TEXTS} from '../../constants/appTexts';
import {VERSION_ACTUAL} from '../../data/changelog';
import {useEsDispositivoMovil} from '../../hooks/useEsMovil';
import {useEstadoCabecera} from '../../hooks/useEstadoCabecera';
import type {InfoSuscripcion, Tarea, Habito, Proyecto, SincronizacionInfo} from '../../types/dashboard';
import type {GrupoOpciones, OpcionMenuPanel} from '../shared/MenuOpcionesPanel';
import type {OpcionMenu} from '../shared';

// Sub-componentes
import {EncabezadoTitulo} from './encabezado/EncabezadoTitulo';
import {EncabezadoEstado} from './encabezado/EncabezadoEstado';
import {EncabezadoAcciones} from './encabezado/EncabezadoAcciones';
import {EncabezadoPerfil} from './encabezado/EncabezadoPerfil';
import {EncabezadoBuscador} from './encabezado/EncabezadoBuscador';
import {EncabezadoMenuMovil, EncabezadoOpcionesMovil} from './encabezado/EncabezadoMovil';

interface DashboardEncabezadoBase {
    titulo?: string;
    version?: string;
    usuario?: string;
    avatarUrl?: string;
    sincronizacion?: SincronizacionInfo;
    suscripcion?: InfoSuscripcion | null;
    esAdmin?: boolean;
    equiposPendientes?: number;
    notificacionesPendientes?: number;
}

interface DashboardEncabezadoAcciones {
    onClickPlan?: () => void;
    onClickSeguridad?: () => void;
    onClickAdmin?: () => void;
    onClickLayout?: () => void;
    /* [18-08-2026] Modal de paneles */
    onClickPaneles?: () => void;
    onClickVersion?: () => void;
    onClickUsuario?: () => void;
    onClickEquipos?: () => void;
    onClickNotificaciones?: (evento?: React.MouseEvent) => void;
}

interface DashboardEncabezadoAccionesExtra {
    onClickExperimentos?: () => void;
    onClickTemas?: () => void;
    onClickConfigUsuario?: () => void;
    onClickBackups?: () => void;
    onClickConfigMCP?: () => void;
    onClickPlugins?: () => void;
    onClickFeedback?: () => void;
    onExportarDatos?: () => void;
    onImportarDatos?: (archivo: File) => void;
}

interface DashboardEncabezadoBuscador {
    tareas?: Tarea[];
    habitos?: Habito[];
    proyectos?: Proyecto[];
    onSeleccionarTarea?: (tarea: Tarea) => void;
    onSeleccionarHabito?: (habito: Habito) => void;
    onSeleccionarProyecto?: (proyecto: Proyecto) => void;
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
}

interface DashboardEncabezadoMovil {
    opcionesMovil?: {
        titulo: string;
        grupos?: GrupoOpciones[];
        opciones?: OpcionMenuPanel[];
        tieneFiltrosActivos?: boolean;
    };
    paginaMovilActiva?: string;
    onCambiarPagina?: (pagina: string) => void;
}

interface DashboardEncabezadoSeleccion {
    modoSeleccionActivo?: boolean;
    onToggleSeleccion?: () => void;
}

interface DashboardEncabezadoVistas {
    /* [318A-2] Selector de vistas del Modo Vistas. Se renderiza en la zona
     * izquierda del encabezado (donde estaba el título), que se oculta. */
    selectorVistas?: React.ReactNode;
    /* [318A-4] Botón "agregar panel" en el nav (modo vistas). Antes era un
     * botón flotante en la vista; ahora vive en el encabezado con su menú
     * contextual. Si es `undefined`, el botón no se muestra. */
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

interface DashboardEncabezadoProps extends DashboardEncabezadoBase, DashboardEncabezadoAcciones, DashboardEncabezadoAccionesExtra, DashboardEncabezadoBuscador, DashboardEncabezadoMovil, DashboardEncabezadoSeleccion, DashboardEncabezadoVistas {}

export function DashboardEncabezado({
    titulo = APP_TEXTS.dashboard.titulo,
    version = VERSION_ACTUAL,
    usuario = 'user@admin',
    avatarUrl,
    sincronizacion,
    suscripcion,
    esAdmin = false,
    equiposPendientes = 0,
    notificacionesPendientes = 0,
    // Actions
    onClickPlan,
    onClickSeguridad,
    onClickAdmin,
    onClickLayout,
    onClickPaneles,
    onClickVersion,
    onClickUsuario,
    onClickEquipos,
    onClickNotificaciones,
    onClickExperimentos,
    onClickTemas,
    onClickConfigUsuario,
    onClickBackups,
    onClickConfigMCP,
    onClickPlugins,
    onClickFeedback,
    onExportarDatos,
    onImportarDatos,
    // Buscador
    tareas = [],
    habitos = [],
    proyectos = [],
    onSeleccionarTarea,
    onSeleccionarHabito,
    onSeleccionarProyecto,
    onCrearRapido,
    // Movil
    opcionesMovil,
    paginaMovilActiva,
    onCambiarPagina,
    // Selección
    modoSeleccionActivo: _modoSeleccionActivo,
    onToggleSeleccion: _onToggleSeleccion,
    // Vistas (318A-2)
    selectorVistas,
    // Agregar panel en el nav (318A-4)
    agregarPanelVista
}: DashboardEncabezadoProps): JSX.Element {
    const esTablet = useEsDispositivoMovil();
    const estaConectado = sincronizacion?.estaLogueado ?? false;
    const puedeBuscarGlobal = Boolean(estaConectado && onSeleccionarTarea && onSeleccionarHabito && onSeleccionarProyecto);
    const {
        encabezadoRef,
        navRef,
        drawerAbierto,
        onAbrirDrawer,
        onCerrarDrawer,
        mostrarBuscadorMovil,
        setMostrarBuscadorMovil,
        menuOpcionesMovilAbierto,
        onAbrirMenuOpcionesMovil,
        onCerrarMenuOpcionesMovil,
        buscadorColapsado
    } = useEstadoCabecera(puedeBuscarGlobal);

    return (
        <header id="dashboard-encabezado" className="dashboardEncabezado" ref={encabezadoRef}>
            <EncabezadoMenuMovil
                drawerAbierto={drawerAbierto}
                onAbrirDrawer={onAbrirDrawer}
                onCerrarDrawer={onCerrarDrawer}
                esTablet={esTablet}
                usuario={usuario}
                avatarUrl={avatarUrl}
                suscripcion={suscripcion}
                esAdmin={esAdmin}
                estaConectado={estaConectado}
                equiposPendientes={equiposPendientes}
                notificacionesPendientes={notificacionesPendientes}
                sincronizacion={sincronizacion}
                // Actions pass-through
                onClickPlan={onClickPlan}
                onClickSeguridad={onClickSeguridad}
                onClickAdmin={onClickAdmin}
                onClickLayout={onClickLayout}
                onClickVersion={onClickVersion}
                onClickUsuario={onClickUsuario}
                onClickEquipos={onClickEquipos}
                onClickNotificaciones={onClickNotificaciones}
                onClickExperimentos={onClickExperimentos}
                onClickTemas={onClickTemas}
                onClickConfigUsuario={onClickConfigUsuario}
                onClickBackups={onClickBackups}
                onClickConfigMCP={onClickConfigMCP}
                onClickPlugins={onClickPlugins}
                onExportarDatos={onExportarDatos}
                onCambiarPagina={onCambiarPagina}
                onCrearRapido={onCrearRapido}
            />

            <EncabezadoTitulo titulo={titulo} paginaMovilActiva={paginaMovilActiva} esTablet={esTablet}>
                {selectorVistas}
            </EncabezadoTitulo>

            <EncabezadoBuscador tareas={tareas} habitos={habitos} proyectos={proyectos} onSeleccionarTarea={onSeleccionarTarea} onSeleccionarHabito={onSeleccionarHabito} onSeleccionarProyecto={onSeleccionarProyecto} mostrarModal={mostrarBuscadorMovil} onCerrarModal={() => setMostrarBuscadorMovil(false)} estaConectado={estaConectado} colapsado={buscadorColapsado} />

            <nav className="encabezadoNav" ref={navRef}>
                {/* [19-08-2026] Cuando el buscador de escritorio no cabe, se
                 * colapsa a un boton de lupa aqui (mismo estilo de la nav) que
                 * abre el modal de busqueda. */}
                {buscadorColapsado && puedeBuscarGlobal && (
                    <Boton type="button" claseAdicional="botonIconoEncabezado botonBuscadorEncabezado" onClick={() => setMostrarBuscadorMovil(true)} title={esTablet ? undefined : 'Buscar'}>
                        <Search size={14} />
                    </Boton>
                )}

                <EncabezadoAcciones suscripcion={suscripcion} esAdmin={esAdmin} equiposPendientes={equiposPendientes} notificacionesPendientes={notificacionesPendientes} estaConectado={estaConectado} esTablet={esTablet} onClickPlan={onClickPlan} onClickLayout={onClickLayout} onClickPaneles={onClickPaneles} onClickNotificaciones={onClickNotificaciones} onClickExperimentos={onClickExperimentos} onClickAdmin={onClickAdmin} onClickEquipos={onClickEquipos} onCrearRapido={onCrearRapido} agregarPanelVista={agregarPanelVista} />

                <EncabezadoEstado sincronizacion={sincronizacion} />

                <EncabezadoPerfil usuario={usuario} version={version} avatarUrl={avatarUrl} suscripcion={suscripcion} estaConectado={estaConectado} esTablet={esTablet} sincronizacion={sincronizacion} onClickConfigUsuario={onClickConfigUsuario} onClickVersion={onClickVersion} onClickPlan={onClickPlan} onClickFeedback={onClickFeedback} onExportarDatos={onExportarDatos} onImportarDatos={onImportarDatos} />

                <EncabezadoOpcionesMovil opcionesMovil={opcionesMovil} menuOpcionesMovilAbierto={menuOpcionesMovilAbierto} onAbrirMenuOpcionesMovil={onAbrirMenuOpcionesMovil} onCerrarMenuOpcionesMovil={onCerrarMenuOpcionesMovil} estaConectado={estaConectado} onSeleccionarTarea={onSeleccionarTarea} onAbrirBuscadorMovil={() => setMostrarBuscadorMovil(true)} esTablet={esTablet} />
            </nav>
        </header>
    );
}
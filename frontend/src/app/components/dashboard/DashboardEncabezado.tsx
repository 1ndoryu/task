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

// Sub-componentes
import {EncabezadoTitulo} from './encabezado/EncabezadoTitulo';
import {EncabezadoEstado} from './encabezado/EncabezadoEstado';
import {EncabezadoAcciones} from './encabezado/EncabezadoAcciones';
import {EncabezadoPerfil} from './encabezado/EncabezadoPerfil';
import {EncabezadoBuscador} from './encabezado/EncabezadoBuscador';
import {EncabezadoMenuMovil, EncabezadoOpcionesMovil} from './encabezado/EncabezadoMovil';

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
    // Callbacks
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
    onClickExperimentos?: () => void;
    onClickTemas?: () => void;
    onClickConfigUsuario?: () => void;
    onClickBackups?: () => void;
    onClickConfigMCP?: () => void;
    onClickPlugins?: () => void;
    onClickFeedback?: () => void;
    onExportarDatos?: () => void;
    onImportarDatos?: (archivo: File) => void;
    // Buscador
    tareas?: Tarea[];
    habitos?: Habito[];
    proyectos?: Proyecto[];
    onSeleccionarTarea?: (tarea: Tarea) => void;
    onSeleccionarHabito?: (habito: Habito) => void;
    onSeleccionarProyecto?: (proyecto: Proyecto) => void;
    onCrearRapido?: (tipo: 'tarea' | 'habito' | 'proyecto') => void;
    // Movil
    opcionesMovil?: {
        titulo: string;
        grupos?: GrupoOpciones[];
        opciones?: OpcionMenuPanel[];
        tieneFiltrosActivos?: boolean;
    };
    paginaMovilActiva?: string;
    onCambiarPagina?: (pagina: string) => void;

    /* Selección Múltiple Móvil */
    modoSeleccionActivo?: boolean;
    onToggleSeleccion?: () => void;
}

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
    onToggleSeleccion: _onToggleSeleccion
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

            <EncabezadoTitulo titulo={titulo} paginaMovilActiva={paginaMovilActiva} esTablet={esTablet} />

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

                <EncabezadoAcciones suscripcion={suscripcion} esAdmin={esAdmin} equiposPendientes={equiposPendientes} notificacionesPendientes={notificacionesPendientes} estaConectado={estaConectado} esTablet={esTablet} onClickPlan={onClickPlan} onClickLayout={onClickLayout} onClickPaneles={onClickPaneles} onClickNotificaciones={onClickNotificaciones} onClickExperimentos={onClickExperimentos} onClickAdmin={onClickAdmin} onClickEquipos={onClickEquipos} onCrearRapido={onCrearRapido} />

                <EncabezadoEstado sincronizacion={sincronizacion} />

                <EncabezadoPerfil usuario={usuario} version={version} avatarUrl={avatarUrl} suscripcion={suscripcion} estaConectado={estaConectado} esTablet={esTablet} sincronizacion={sincronizacion} onClickConfigUsuario={onClickConfigUsuario} onClickVersion={onClickVersion} onClickPlan={onClickPlan} onClickFeedback={onClickFeedback} onExportarDatos={onExportarDatos} onImportarDatos={onImportarDatos} />

                <EncabezadoOpcionesMovil opcionesMovil={opcionesMovil} menuOpcionesMovilAbierto={menuOpcionesMovilAbierto} onAbrirMenuOpcionesMovil={onAbrirMenuOpcionesMovil} onCerrarMenuOpcionesMovil={onCerrarMenuOpcionesMovil} estaConectado={estaConectado} onSeleccionarTarea={onSeleccionarTarea} onAbrirBuscadorMovil={() => setMostrarBuscadorMovil(true)} esTablet={esTablet} />
            </nav>
        </header>
    );
}

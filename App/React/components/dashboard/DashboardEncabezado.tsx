/*
 * DashboardEncabezado
 * Componente del header del dashboard
 * Refactorizado para usar sub-componentes (SOLID) y prevenir re-renders de BuscadorGlobal
 */

import {useState} from 'react';
import {APP_TEXTS} from '../../constants/appTexts';
import {VERSION_ACTUAL} from '../../data/changelog';
import {useEsDispositivoMovil} from '../../hooks/useEsMovil';
import type {InfoSuscripcion, Tarea, Habito, Proyecto, SincronizacionInfo} from '../../types/dashboard';
import type {GrupoOpciones, OpcionMenu} from '../shared/MenuOpcionesPanel';

// Sub-componentes
import {EncabezadoTitulo} from './encabezado/EncabezadoTitulo';
import {EncabezadoEstado} from './encabezado/EncabezadoEstado';
import {EncabezadoAcciones} from './encabezado/EncabezadoAcciones';
import {EncabezadoPerfil} from './encabezado/EncabezadoPerfil';
import {EncabezadoBuscador} from './encabezado/EncabezadoBuscador';
import {EncabezadoMenuMovil, EncabezadoOpcionesMovil} from './encabezado/EncabezadoMovil';
import {EncabezadoBuscadorMovilTrigger} from './encabezado/EncabezadoBuscadorMovilTrigger';

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
    onClickVersion?: () => void;
    onClickUsuario?: () => void;
    onClickEquipos?: () => void;
    onClickNotificaciones?: (evento: React.MouseEvent) => void;
    onClickExperimentos?: () => void;
    onClickTemas?: () => void;
    onClickConfigUsuario?: () => void;
    onClickBackups?: () => void;
    onClickConfigMCP?: () => void;
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
        opciones?: OpcionMenu[];
        tieneFiltrosActivos?: boolean;
    };
    paginaMovilActiva?: string;
    onCambiarPagina?: (pagina: string) => void;
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
    onClickVersion,
    onClickUsuario,
    onClickEquipos,
    onClickNotificaciones,
    onClickExperimentos,
    onClickTemas,
    onClickConfigUsuario,
    onClickBackups,
    onClickConfigMCP,
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
    onCambiarPagina
}: DashboardEncabezadoProps): JSX.Element {
    const esTablet = useEsDispositivoMovil();
    const estaConectado = sincronizacion?.estaLogueado ?? false;

    // Estado Local de UI (Orquestación)
    const [drawerAbierto, setDrawerAbierto] = useState(false);
    const [mostrarBuscadorMovil, setMostrarBuscadorMovil] = useState(false);
    const [menuOpcionesMovilAbierto, setMenuOpcionesMovilAbierto] = useState(false);

    return (
        <header id="dashboard-encabezado" className="dashboardEncabezado">
            <EncabezadoMenuMovil
                drawerAbierto={drawerAbierto}
                onAbrirDrawer={() => setDrawerAbierto(true)}
                onCerrarDrawer={() => setDrawerAbierto(false)}
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
                onExportarDatos={onExportarDatos}
                onCambiarPagina={onCambiarPagina}
                onCrearRapido={onCrearRapido}
            />

            <EncabezadoTitulo titulo={titulo} paginaMovilActiva={paginaMovilActiva} esTablet={esTablet} />

            <EncabezadoBuscador tareas={tareas} habitos={habitos} proyectos={proyectos} onSeleccionarTarea={onSeleccionarTarea} onSeleccionarHabito={onSeleccionarHabito} onSeleccionarProyecto={onSeleccionarProyecto} mostrarModal={mostrarBuscadorMovil} onCerrarModal={() => setMostrarBuscadorMovil(false)} estaConectado={estaConectado} />

            <nav className="encabezadoNav">
                <EncabezadoBuscadorMovilTrigger esTablet={esTablet} onClick={() => setMostrarBuscadorMovil(!mostrarBuscadorMovil)} />

                <EncabezadoAcciones suscripcion={suscripcion} esAdmin={esAdmin} equiposPendientes={equiposPendientes} notificacionesPendientes={notificacionesPendientes} estaConectado={estaConectado} esTablet={esTablet} onClickPlan={onClickPlan} onClickLayout={onClickLayout} onClickNotificaciones={onClickNotificaciones} onClickExperimentos={onClickExperimentos} onClickAdmin={onClickAdmin} onClickEquipos={onClickEquipos} onCrearRapido={onCrearRapido} />

                <EncabezadoEstado sincronizacion={sincronizacion} />

                <EncabezadoPerfil usuario={usuario} version={version} avatarUrl={avatarUrl} suscripcion={suscripcion} estaConectado={estaConectado} esTablet={esTablet} sincronizacion={sincronizacion} onClickUsuario={onClickUsuario} onClickSeguridad={onClickSeguridad} onClickBackups={onClickBackups} onClickConfigUsuario={onClickConfigUsuario} onClickVersion={onClickVersion} onClickPlan={onClickPlan} onClickTemas={onClickTemas} onClickConfigMCP={onClickConfigMCP} onClickFeedback={onClickFeedback} onExportarDatos={onExportarDatos} onImportarDatos={onImportarDatos} />

                <EncabezadoOpcionesMovil opcionesMovil={opcionesMovil} menuOpcionesMovilAbierto={menuOpcionesMovilAbierto} onAbrirMenuOpcionesMovil={() => setMenuOpcionesMovilAbierto(true)} onCerrarMenuOpcionesMovil={() => setMenuOpcionesMovilAbierto(false)} estaConectado={estaConectado} onSeleccionarTarea={onSeleccionarTarea} onAbrirBuscadorMovil={() => setMostrarBuscadorMovil(true)} esTablet={esTablet} />
            </nav>
        </header>
    );
}

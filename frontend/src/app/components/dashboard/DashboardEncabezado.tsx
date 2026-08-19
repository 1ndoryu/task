/*
 * DashboardEncabezado
 * Componente del header del dashboard
 * Refactorizado para usar sub-componentes (SOLID) y prevenir re-renders de BuscadorGlobal
 */

import {useLayoutEffect, useRef, useState} from 'react';
import {Search} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {APP_TEXTS} from '../../constants/appTexts';
import {VERSION_ACTUAL} from '../../data/changelog';
import {useEsDispositivoMovil} from '../../hooks/useEsMovil';
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

    // Estado Local de UI (Orquestación)
    const [drawerAbierto, setDrawerAbierto] = useState(false);
    const [mostrarBuscadorMovil, setMostrarBuscadorMovil] = useState(false);
    const [menuOpcionesMovilAbierto, setMenuOpcionesMovilAbierto] = useState(false);

    /* [19-08-2026] Buscador responsive: si el input centrado de escritorio
     * choca con los botones de encabezadoNav (viewport estrecho), se colapsa
     * a un boton de lupa dentro de la nav que abre el mismo modal de busqueda.
     * Se mide con ResizeObserver para reaccionar a cambios de ancho. */
    const encabezadoRef = useRef<HTMLElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const [buscadorColapsado, setBuscadorColapsado] = useState(false);

    const puedeBuscarGlobal = Boolean(estaConectado && onSeleccionarTarea && onSeleccionarHabito && onSeleccionarProyecto);

    /* El input de escritorio (.encabezadoBuscador) es position:absolute centrado
     * con ancho fijo 320px, así que su borde derecho = centro del header + 160.
     * Calcular contra el header evita el deadlock de medir el propio input
     * (que desaparece al colapsar y nunca se restauraría). */
    const ANCHO_BUSCADOR = 320;

    useLayoutEffect(() => {
        const encabezado = encabezadoRef.current;
        if (!encabezado) return;

        const medir = () => {
            const nav = navRef.current;
            if (!nav) return;
            const nRect = nav.getBoundingClientRect();
            const hRect = encabezado.getBoundingClientRect();
            const centroHeader = hRect.left + hRect.width / 2;
            const bordeDerechoBuscador = centroHeader + ANCHO_BUSCADOR / 2;
            /* El boton de lupa colapsado vive DENTRO de la nav: medirlo como
             * parte de la nav crearia un deadlock (la lupa empuja la nav a la
             * izquierda y el choque nunca se restaura). Se excluye su ancho. */
            const botonLupa = nav.querySelector<HTMLElement>('.botonBuscadorEncabezado');
            const anchoLupa = botonLupa ? botonLupa.getBoundingClientRect().width + 8 : 0;
            const navLeftSinLupa = nRect.left + anchoLupa;
            /* choca cuando el borde derecho del buscador pasa el borde izquierdo
             * de la nav sin la lupa (con 8px de margen de seguridad) */
            setBuscadorColapsado(bordeDerechoBuscador > navLeftSinLupa - 8);
        };
        medir();

        const observador = new ResizeObserver(medir);
        observador.observe(encabezado);
        window.addEventListener('resize', medir);
        return () => {
            observador.disconnect();
            window.removeEventListener('resize', medir);
        };
    }, [puedeBuscarGlobal]);

    return (
        <header id="dashboard-encabezado" className="dashboardEncabezado" ref={encabezadoRef}>
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

                <EncabezadoOpcionesMovil opcionesMovil={opcionesMovil} menuOpcionesMovilAbierto={menuOpcionesMovilAbierto} onAbrirMenuOpcionesMovil={() => setMenuOpcionesMovilAbierto(true)} onCerrarMenuOpcionesMovil={() => setMenuOpcionesMovilAbierto(false)} estaConectado={estaConectado} onSeleccionarTarea={onSeleccionarTarea} onAbrirBuscadorMovil={() => setMostrarBuscadorMovil(true)} esTablet={esTablet} />
            </nav>
        </header>
    );
}

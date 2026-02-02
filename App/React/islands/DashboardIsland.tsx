/*
 * DashboardIsland
 * Componente principal del Dashboard
 * Refactorizado: Lógica dividida en subcomponentes y hook de composición
 * Fase 10.8.3: Integración de opciones móvil en el header
 */

import {useEffect, useMemo, useState, useCallback} from 'react';

/* Importar store de configuración temprano para inicializar horaFinDia antes que otros módulos */
import '../stores/configuracionUsuarioStore';

import {DashboardEncabezado, DashboardFooter, DashboardGrid, DashboardModales} from '../components/dashboard';
import {useDashboardCompleto} from '../hooks/useDashboardCompleto';
import {VERSION_ACTUAL} from '../data/changelog';
import {Landing} from '../components/landing/Landing';
import {NavegacionInferior} from '../components/shared';
import {useEsMovil} from '../hooks/useEsMovil';
import {usePaginaMovil} from '../hooks/usePaginaMovil';
import {useOpcionesPanelMovil} from '../hooks/useOpcionesPanelMovil';
import {useNotasStore} from '../stores/notasStore';
import {ModalNotasExpandido} from '../components/dashboard/notas/ModalNotasExpandido';

import '../styles/dashboard/componentes/experimentos.css';
import '../styles/dashboard/componentes/buscador.css';

interface DashboardIslandProps {
    titulo?: string;
    version?: string;
    usuario?: string;
}

function IndicadorCarga({texto = 'Cargando datos...'}: {texto?: string}): JSX.Element {
    return (
        <div id="dashboard-cargando" className="dashboardCargando">
            <div className="cargandoIndicador">
                <div className="cargandoSpinner" />
                <span className="cargandoTexto">{texto}</span>
            </div>
            <div className="cargandoBarraProgreso">
                <div className="cargandoBarraRelleno" />
            </div>
        </div>
    );
}

export function DashboardIsland({titulo = 'DASHBOARD_01', version = VERSION_ACTUAL, usuario = 'user@admin'}: DashboardIslandProps): JSX.Element {
    const ctx = useDashboardCompleto();
    const {dashboard, auth, suscripcion, esAdmin, modales, equipos, notificaciones, acciones, filtroTareas, ordenTareas, ordenHabitos, opciones, configProyectos} = ctx;
    const {esMovil} = useEsMovil();
    const paginaMovil = usePaginaMovil();

    /* Estado y acciones para notas en móvil */
    const crearNuevaNota = useNotasStore(s => s.crearNuevaNota);
    const [modalNotasAbierto, setModalNotasAbierto] = useState(false);

    const manejarNuevaNota = useCallback(() => {
        crearNuevaNota();
    }, [crearNuevaNota]);

    const manejarAbrirNotasGuardadas = useCallback(() => {
        setModalNotasAbierto(true);
    }, []);

    /* Construir opciones del menú móvil basadas en el panel activo */
    const opcionesMovil = useOpcionesPanelMovil({
        paginaActiva: paginaMovil.paginaActiva,
        /* Tareas */
        opcionesFiltroTareas: opciones.opcionesFiltro,
        valorFiltroTareas: filtroTareas.filtroActual.tipo === 'proyecto' ? `proyecto-${filtroTareas.filtroActual.proyectoId}` : filtroTareas.filtroActual.tipo,
        onCambiarFiltroTareas: acciones.manejarCambioFiltro,
        opcionesOrdenTareas: opciones.opcionesOrdenTareas,
        modoOrdenTareas: ordenTareas.modoActual,
        onCambiarOrdenTareas: ordenTareas.cambiarModo,
        onAbrirConfigTareas: modales.abrirModalConfigTareas,
        /* Hábitos */
        opcionesOrdenHabitos: opciones.opcionesOrdenHabitos,
        modoOrdenHabitos: ordenHabitos.modoActual,
        onCambiarOrdenHabitos: ordenHabitos.cambiarModo,
        onAbrirConfigHabitos: modales.abrirModalConfigHabitos,
        /* Proyectos */
        opcionesOrdenProyectos: opciones.opcionesOrdenProyectos,
        modoOrdenProyectos: configProyectos.configuracion.ordenDefecto,
        onCambiarOrdenProyectos: configProyectos.cambiarOrdenDefecto,
        onAbrirConfigProyectos: modales.abrirModalConfigProyectos,
        /* Actividad */
        onAbrirConfigActividad: modales.abrirModalConfigActividad,
        /* Notas */
        onNuevaNota: manejarNuevaNota,
        onAbrirNotasGuardadas: manejarAbrirNotasGuardadas,
        onAbrirConfigNotas: modales.abrirModalConfigScratchpad
    });

    /* Memoizar objeto de sincronización para evitar re-renders innecesarios */
    const sincronizacionConAuth = useMemo(
        () => ({
            ...dashboard.sincronizacion,
            onLogin: modales.abrirModalLogin,
            onLogout: auth.logout,
            estaLogueado: !!auth.user
        }),
        [dashboard.sincronizacion, modales.abrirModalLogin, auth.logout, auth.user]
    );

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) auth.handleCallback(code);
    }, [auth.handleCallback]);

    if (auth.loading && !modales.modalLoginAbierto) {
        return <IndicadorCarga texto="Autenticando..." />;
    }

    /* Usuario no logueado: mostrar landing page */
    if (!auth.user) {
        return (
            <>
                <Landing onLogin={modales.abrirModalLogin} />
                <DashboardModales ctx={ctx} />
            </>
        );
    }

    /* Clase del contenedor con padding extra para navegación móvil */
    const clasesContenedor = `dashboardContenedor ${esMovil && auth.user ? 'dashboardContenedor--conNavegacionInferior' : ''}`;

    return (
        <div id="dashboard-contenedor" className={clasesContenedor}>
            <DashboardEncabezado
                titulo={titulo}
                version={version}
                usuario={auth.user ? auth.user.name : usuario}
                avatarUrl={auth.user?.avatarUrl}
                sincronizacion={sincronizacionConAuth}
                suscripcion={suscripcion}
                esAdmin={esAdmin}
                equiposPendientes={equipos.pendientes}
                notificacionesPendientes={notificaciones.noLeidas}
                onClickPlan={modales.abrirModalUpgrade}
                onClickSeguridad={modales.abrirPanelSeguridad}
                onClickAdmin={modales.abrirPanelAdmin}
                onClickLayout={modales.abrirModalConfigLayout}
                onClickVersion={modales.abrirModalVersiones}
                onClickUsuario={modales.abrirModalPerfil}
                onClickEquipos={modales.abrirModalEquipos}
                onClickNotificaciones={acciones.manejarClickNotificaciones}
                onClickExperimentos={esAdmin ? modales.abrirModalExperimentos : undefined}
                onClickTemas={modales.abrirModalTemas}
                onClickConfigUsuario={modales.abrirModalConfigUsuario}
                onClickBackups={modales.abrirModalBackups}
                onClickConfigMCP={modales.abrirModalConfigMCP}
                onClickFeedback={modales.abrirModalFeedback}
                onExportarDatos={dashboard.exportarTodosDatos}
                onImportarDatos={dashboard.importarTodosDatos}
                tareas={dashboard.tareas}
                habitos={dashboard.habitos}
                proyectos={dashboard.proyectos}
                onSeleccionarTarea={modales.abrirModalEditarTarea}
                onSeleccionarHabito={dashboard.abrirModalEditarHabito}
                onSeleccionarProyecto={modales.abrirModalEditarProyecto}
                onCrearRapido={modales.abrirCreacionRapida}
                opcionesMovil={esMovil ? opcionesMovil : undefined}
                paginaMovilActiva={esMovil ? paginaMovil.paginaActiva : undefined}
                onCambiarPagina={esMovil ? paginaMovil.cambiarPagina : undefined}
            />

            {dashboard.cargandoDatos ? <IndicadorCarga /> : <DashboardGrid ctx={ctx} esMovil={esMovil} paginaMovilActiva={paginaMovil.paginaActiva} />}

            <DashboardFooter />
            <DashboardModales ctx={ctx} />

            {/* Modal de notas guardadas para móvil (desde menú de 3 puntos) */}
            <ModalNotasExpandido abierto={modalNotasAbierto} onCerrar={() => setModalNotasAbierto(false)} tamanoFuente="normal" delayGuardado={2000} />

            {/* Navegación inferior móvil */}
            {auth.user && <NavegacionInferior paginaActiva={paginaMovil.paginaActiva} onCambiarPagina={paginaMovil.cambiarPagina} onCrearRapido={modales.abrirCreacionRapida} visible={esMovil} />}
        </div>
    );
}

export default DashboardIsland;

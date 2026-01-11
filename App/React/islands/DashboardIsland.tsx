/*
 * DashboardIsland
 * Componente principal del Dashboard
 * Refactorizado: Lógica dividida en subcomponentes y hook de composición
 */

import {useEffect, useState} from 'react';
import {DashboardEncabezado, DashboardFooter, DashboardGrid, DashboardModales} from '../components/dashboard';
import {useDashboardCompleto} from '../hooks/useDashboardCompleto';
import {VERSION_ACTUAL} from '../data/changelog';
import {Landing} from '../components/landing/Landing';
import {NavegacionInferior} from '../components/shared';
import type {SeccionNavegacion} from '../components/shared/NavegacionInferior';
import {useEsMovil} from '../hooks/useEsMovil';

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
    const {dashboard, auth, suscripcion, esAdmin, modales, equipos, notificaciones, acciones} = ctx;
    const {esMovil} = useEsMovil();
    const [seccionActiva, setSeccionActiva] = useState<SeccionNavegacion>('home');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) auth.handleCallback(code);
    }, [auth.handleCallback]);

    /* Manejador de cambio de sección para navegación inferior */
    const manejarCambioSeccion = (seccion: SeccionNavegacion) => {
        setSeccionActiva(seccion);

        switch (seccion) {
            case 'notificaciones':
                modales.abrirPopoverNotificaciones?.(null);
                break;
            case 'perfil':
                modales.abrirModalPerfil();
                break;
            /* home y tareas mantienen el dashboard visible, solo cambia el estado visual */
            default:
                break;
        }
    };

    if (auth.loading && !modales.modalLoginAbierto) {
        return <IndicadorCarga texto="Autenticando..." />;
    }

    /* Usuario no logueado: mostrar landing page */
    if (!auth.user && !modales.modalLoginAbierto) {
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
                sincronizacion={{
                    ...dashboard.sincronizacion,
                    onLogin: modales.abrirModalLogin,
                    onLogout: auth.logout,
                    estaLogueado: !!auth.user
                }}
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
                onClickConfigMCP={modales.abrirModalConfigMCP}
                onExportarDatos={dashboard.exportarTodosDatos}
                onImportarDatos={dashboard.importarTodosDatos}
                tareas={dashboard.tareas}
                habitos={dashboard.habitos}
                proyectos={dashboard.proyectos}
                onSeleccionarTarea={modales.abrirModalEditarTarea}
                onSeleccionarHabito={dashboard.abrirModalEditarHabito}
                onSeleccionarProyecto={modales.abrirModalEditarProyecto}
                onCrearRapido={modales.abrirCreacionRapida}
            />

            {dashboard.cargandoDatos ? <IndicadorCarga /> : <DashboardGrid ctx={ctx} />}

            <DashboardFooter />
            <DashboardModales ctx={ctx} />

            {/* Navegación inferior móvil */}
            {auth.user && <NavegacionInferior seccionActiva={seccionActiva} onCambiarSeccion={manejarCambioSeccion} onCrearRapido={modales.abrirCreacionRapida} notificacionesPendientes={notificaciones.noLeidas} visible={esMovil} />}
        </div>
    );
}

export default DashboardIsland;

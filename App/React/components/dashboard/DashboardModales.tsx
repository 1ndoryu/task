/*
 * DashboardModales
 * Componente que agrupa todos los modales del Dashboard
 * Extraído para reducir la complejidad de DashboardIsland
 */

import {Bell, Trash2} from 'lucide-react';
import {ModalHabito} from './ModalHabito';
import {ModalProyecto} from './proyectos/ModalProyecto';
import {ModalLogin} from './ModalLogin';
import {PanelSeguridad} from './PanelSeguridad';
import {ModalConfiguracionLayout} from './ModalConfiguracionLayout';
import {PanelConfiguracionTarea} from './PanelConfiguracionTarea';
import {ModalConfiguracionProyectos} from './proyectos/ModalConfiguracionProyectos';
import {ModalPerfil} from './ModalPerfil';
import {ModalConfiguracionTareas} from './ModalConfiguracionTareas';
import {ModalConfiguracionHabitos} from './ModalConfiguracionHabitos';
import {ModalConfiguracionScratchpad} from './ModalConfiguracionScratchpad';
import {ModalConfiguracionActividad} from './ModalConfiguracionActividad';

import {ToastDeshacer, ModalUpgrade, ModalLimiteAlcanzado, TooltipSystem, BarraPanelesOcultos, IndicadorArrastre, ModalVersiones, ModalTemas} from '../shared';
import {PanelAdministracion} from '../admin';
import {ModalEquipos} from '../equipos';
import {ModalNotificaciones} from '../notificaciones';
import {ModalCompartir} from '../compartidos';
import {ModalExperimentos} from '../experimentos/ModalExperimentos';
import {ModalCreacionRapida} from './ModalCreacionRapida';
import {ModalConfiguracionMCP, ModalConfiguracionUsuario} from '../configuracion';
import {ModalHistorialBackups} from './ModalHistorialBackups';

import type {DashboardCompletoRetorno} from '../../hooks/useDashboardCompleto';
import type {AccionExperimento} from '../experimentos/ModalExperimentos';

interface DashboardModalesProps {
    ctx: DashboardCompletoRetorno;
}

export function DashboardModales({ctx}: DashboardModalesProps): JSX.Element {
    const {dashboard, auth, suscripcion, esAdmin, limites, modales, equipos, notificaciones, compartir, configTareas, configHabitos, configProyectos, configScratchpad, configActividad, layout, arrastre, acciones, temas} = ctx;

    const accionesExperimentos: AccionExperimento[] = [
        {
            id: 'notificacion-prueba',
            nombre: 'Crear Notificacion de Prueba',
            descripcion: 'Crea una notificacion de tipo solicitud_equipo para probar el sistema.',
            icono: <Bell size={20} />,
            ejecutar: acciones.crearNotificacionPrueba
        },
        {
            id: 'limpiar-actividad',
            nombre: 'Limpiar Actividad Completa',
            descripcion: 'Elimina todo el historial de actividad del mapa de calor.',
            icono: <Trash2 size={20} />,
            ejecutar: acciones.limpiarActividadCompleta
        }
    ];

    const manejarGuardarRapido = async (datos: any) => {
        const {tipo, texto, ...opciones} = datos;

        /* Helper para calcular fechas */
        const calcularFecha = (fechaKey?: string) => {
            if (!fechaKey) return undefined;
            const hoy = new Date();
            if (fechaKey === 'hoy') return hoy.toISOString().split('T')[0];
            if (fechaKey === 'manana') {
                const manana = new Date(hoy);
                manana.setDate(manana.getDate() + 1);
                return manana.toISOString().split('T')[0];
            }
            if (fechaKey === 'semana') {
                const semana = new Date(hoy);
                semana.setDate(semana.getDate() + 7);
                return semana.toISOString().split('T')[0];
            }
            return undefined;
        };

        /*
         * Integración de verificación de límites (Fase 15.7)
         * Verifica antes de crear para usuarios FREE
         */
        if (tipo === 'tarea') {
            const tareasActivas = dashboard.tareas.filter(t => !t.completado).length;
            if (!limites.verificarYMostrar('tareasActivas', tareasActivas)) return;

            const configTarea: any = {
                fechaMaxima: calcularFecha(opciones.fecha),
                adjuntos: opciones.adjuntos || []
            };
            acciones.manejarCrearNuevaTareaGlobal(configTarea, opciones.prioridad || null, texto, undefined, opciones.urgencia || null, [], opciones.proyectoId);
        } else if (tipo === 'habito') {
            if (!limites.verificarYMostrar('habitos', dashboard.habitos.length)) return;

            await dashboard.crearHabito({
                nombre: texto,
                importancia: opciones.importancia || 'Media',
                tags: [],
                frecuencia: {tipo: opciones.frecuencia || 'diario'}
            });
        } else if (tipo === 'proyecto') {
            if (!limites.verificarYMostrar('proyectos', dashboard.proyectos.length)) return;

            acciones.manejarGuardarNuevoProyecto({
                nombre: texto,
                prioridad: opciones.prioridad || 'media',
                urgencia: opciones.urgencia || undefined,
                fechaLimite: calcularFecha(opciones.fecha)
            });
        }
    };

    /*
     * Wrappers con verificación de límites (Fase 15.7)
     * Integran la verificación de límites antes de crear entidades
     */
    const manejarCrearHabitoConLimite = async (datos: any) => {
        if (!limites.verificarYMostrar('habitos', dashboard.habitos.length)) return;
        await dashboard.crearHabito(datos);
    };

    const manejarCrearProyectoConLimite = (datos: any) => {
        if (!limites.verificarYMostrar('proyectos', dashboard.proyectos.length)) return;
        acciones.manejarGuardarNuevoProyecto(datos);
    };

    const manejarCrearTareaConLimite = (datos: any) => {
        const tareasActivas = dashboard.tareas.filter(t => !t.completado).length;
        if (!limites.verificarYMostrar('tareasActivas', tareasActivas)) return;
        dashboard.crearTarea(datos);
    };

    return (
        <>
            {/* Modales de Autenticación y Usuario */}
            <ModalLogin 
                estaAbierto={modales.modalLoginAbierto} 
                onCerrar={modales.cerrarModalLogin} 
                onLoginGoogle={auth.loginWithGoogle} 
                onLoginCredentials={auth.loginWithCredentials} 
                onRegister={auth.register} 
                loading={auth.loading} 
                error={auth.error} 
                /* Overlay opaco cuando no hay usuario autenticado para ocultar la app */
                overlayOpaco={!auth.user}
            />
            <ModalUpgrade visible={modales.modalUpgradeAbierto} onCerrar={modales.cerrarModalUpgrade} suscripcion={suscripcion} />
            <ModalLimiteAlcanzado
                visible={limites.modalLimite.visible}
                onCerrar={limites.cerrarModalLimite}
                onActualizarPlan={modales.abrirModalUpgrade}
                tipoEntidad={limites.modalLimite.tipoEntidad}
                limite={limites.modalLimite.limite}
                actual={limites.modalLimite.actual}
            />
            <PanelSeguridad visible={modales.panelSeguridadAbierto} onCerrar={modales.cerrarPanelSeguridad} />
            <ModalPerfil estaAbierto={modales.modalPerfilAbierto} onCerrar={modales.cerrarModalPerfil} />

            {/* Modales Sociales */}
            {modales.modalNotificacionesAbierto && <ModalNotificaciones notificaciones={notificaciones.notificaciones} noLeidas={notificaciones.noLeidas} total={notificaciones.total} cargando={notificaciones.cargando} cargandoPrimeraVez={notificaciones.cargandoPrimeraVez} posicionX={modales.posicionModalNotificaciones.x} posicionY={modales.posicionModalNotificaciones.y} onMarcarLeida={notificaciones.marcarLeida} onMarcarTodasLeidas={notificaciones.marcarTodasLeidas} onEliminar={notificaciones.eliminar} onClickNotificacion={acciones.manejarClickNotificacionIndividual} onCerrar={modales.cerrarModalNotificaciones} />}
            <ModalEquipos estaAbierto={modales.modalEquiposAbierto} onCerrar={modales.cerrarModalEquipos} />

            {/* Modales de Hábitos */}
            <ModalHabito estaAbierto={dashboard.modalCrearHabitoAbierto} onCerrar={dashboard.cerrarModalCrearHabito} onGuardar={manejarCrearHabitoConLimite} />
            <ModalHabito
                estaAbierto={dashboard.habitoEditando !== null}
                onCerrar={dashboard.cerrarModalEditarHabito}
                onGuardar={datos => dashboard.editarHabito(dashboard.habitoEditando!.id, datos)}
                onPausarHabito={dashboard.pausarHabito}
                habito={dashboard.habitoEditando ?? undefined}
                /* Props para tareas del hábito - Fase 14.8 */
                tareas={dashboard.tareas}
                onToggleTarea={dashboard.toggleTarea}
                onCrearTarea={manejarCrearTareaConLimite}
                onEliminarTarea={dashboard.eliminarTarea}
                onConfigurarTarea={modales.abrirModalEditarTarea}
                onActualizarOrdenTareasHabito={dashboard.actualizarOrdenTareasHabito}
                onEditarTarea={dashboard.editarTarea}
            />

            {/* Modales de Proyectos */}
            <ModalProyecto estaAbierto={modales.modalCrearProyectoAbierto} onCerrar={modales.cerrarModalCrearProyecto} onGuardar={manejarCrearProyectoConLimite} tareas={dashboard.tareas} />
            <ModalProyecto estaAbierto={modales.proyectoEditando !== null} onCerrar={modales.cerrarModalEditarProyecto} onGuardar={acciones.manejarGuardarEdicionProyecto} proyecto={modales.proyectoEditando ?? undefined} participantes={modales.proyectoEditando ? (compartir.cacheParticipantesProyecto.get(modales.proyectoEditando.id) ?? []) : []} companeros={equipos.companeros} onAgregarParticipante={(companeroId, rol) => modales.proyectoEditando && compartir.manejarCompartirElemento(companeroId, rol)} onRemoverParticipante={compartir.manejarDejarDeCompartir} onCambiarRolParticipante={compartir.manejarCambiarRolCompartido} tareas={dashboard.tareas} onToggleTarea={dashboard.toggleTarea} />

            {/* Modales de Configuración */}
            <ModalConfiguracionTareas estaAbierto={modales.modalConfigTareasAbierto} onCerrar={modales.cerrarModalConfigTareas} configuracion={configTareas.configuracion} onToggleCompletadas={configTareas.toggleOcultarCompletadas} onToggleBadgeProyecto={configTareas.toggleOcultarBadgeProyecto} onToggleEliminarCompletadas={configTareas.toggleEliminarCompletadasDespuesDeUnDia} onToggleMostrarHabitos={configTareas.toggleMostrarHabitosEnEjecucion} onToggleModoCompacto={configTareas.toggleModoCompacto} />
            <ModalConfiguracionHabitos estaAbierto={modales.modalConfigHabitosAbierto} onCerrar={modales.cerrarModalConfigHabitos} configuracion={configHabitos.configuracion} esMovil={configHabitos.esMovil} onToggleCompletadosHoy={configHabitos.toggleOcultarCompletadosHoy} onToggleModoCompacto={configHabitos.toggleModoCompacto} onToggleMostrarPausados={configHabitos.toggleMostrarPausados} onToggleColumna={configHabitos.toggleColumnaVisible} onCambiarTolerancia={configHabitos.cambiarToleranciaPreset} />
            <ModalConfiguracionProyectos estaAbierto={modales.modalConfigProyectosAbierto} onCerrar={modales.cerrarModalConfigProyectos} configuracion={configProyectos.configuracion} onToggleCompletados={configProyectos.toggleOcultarCompletados} onToggleTareasCompletadas={configProyectos.toggleOcultarTareasCompletadas} onToggleProgreso={configProyectos.toggleMostrarProgreso} onToggleModoCompacto={configProyectos.toggleModoCompacto} />
            <ModalConfiguracionScratchpad estaAbierto={modales.modalConfigScratchpadAbierto} onCerrar={modales.cerrarModalConfigScratchpad} configuracion={configScratchpad.configuracion} onCambiarFuente={configScratchpad.cambiarTamanoFuente} onCambiarAltura={configScratchpad.cambiarAltura} onCambiarIntervalo={configScratchpad.cambiarAutoGuardado} />
            <ModalConfiguracionActividad estaAbierto={modales.modalConfigActividadAbierto} onCerrar={modales.cerrarModalConfigActividad} configuracion={configActividad.configuracion} onCambiarPeriodo={configActividad.cambiarPeriodo} onCambiarFiltroTipo={configActividad.cambiarFiltroTipo} onCambiarTamanoCelda={configActividad.cambiarTamanoCelda} onToggleLeyenda={configActividad.toggleLeyenda} />
            <ModalConfiguracionLayout estaAbierto={modales.modalConfigLayoutAbierto} onCerrar={modales.cerrarModalConfigLayout} modoColumnas={layout.modoColumnas} visibilidad={layout.visibilidad} ordenPaneles={layout.ordenPaneles} onCambiarModo={layout.cambiarModoColumnas} onTogglePanel={layout.toggleVisibilidadPanel} onMoverPanelArriba={layout.moverPanelArriba} onMoverPanelAbajo={layout.moverPanelAbajo} onMoverPanelAColumna={layout.moverPanelAColumna} onResetearOrden={layout.resetearOrdenPaneles} onResetear={layout.resetearLayout} />

            {/* Modales Misceláneos */}
            <ModalVersiones estaAbierto={modales.modalVersionesAbierto} onCerrar={modales.cerrarModalVersiones} />
            {esAdmin && <PanelAdministracion estaAbierto={modales.panelAdminAbierto} onCerrar={modales.cerrarPanelAdmin} />}
            <ModalExperimentos abierto={modales.modalExperimentosAbierto} onCerrar={modales.cerrarModalExperimentos} acciones={accionesExperimentos} />

            {/* Modales de Compartir */}
            <ModalCompartir visible={compartir.proyectoCompartiendo !== null} onCerrar={compartir.cerrarModalCompartirProyecto} tipo="proyecto" elementoId={compartir.proyectoCompartiendo?.id ?? 0} elementoNombre={compartir.proyectoCompartiendo?.nombre ?? ''} companeros={equipos.companeros} participantes={compartir.participantesProyecto} cifradoActivo={false} onCompartir={compartir.manejarCompartirElemento} onCambiarRol={compartir.manejarCambiarRolCompartido} onDejarDeCompartir={compartir.manejarDejarDeCompartir} cargandoParticipantes={compartir.cargando} />
            <ModalCompartir visible={compartir.tareaCompartiendo !== null} onCerrar={compartir.cerrarModalCompartirTarea} tipo="tarea" elementoId={compartir.tareaCompartiendo?.id ?? 0} elementoNombre={compartir.tareaCompartiendo?.texto ?? ''} companeros={equipos.companeros} participantes={compartir.participantesTarea} cifradoActivo={false} onCompartir={compartir.manejarCompartirTareaElemento} onCambiarRol={compartir.manejarCambiarRolTareaCompartida} onDejarDeCompartir={compartir.manejarDejarDeCompartir} cargandoParticipantes={compartir.cargando} />

            {/* Modal Nueva Tarea */}
            {modales.modalNuevaTareaAbierto && <PanelConfiguracionTarea estaAbierto={modales.modalNuevaTareaAbierto} onCerrar={modales.cerrarModalNuevaTarea} onGuardar={acciones.manejarCrearNuevaTareaGlobal} />}

            {/* Modal Editar Tarea */}
            {modales.tareaEditando && (
                <PanelConfiguracionTarea
                    key={modales.tareaEditando.id}
                    estaAbierto={true}
                    onCerrar={modales.cerrarModalEditarTarea}
                    onGuardar={(config, priority, text, assignment, urgency, tags) => acciones.manejarGuardarEdicionTareaGlobal(modales.tareaEditando!.id, config, priority, text, assignment, urgency, tags)}
                    /* FIX: Buscar tarea fresca y aplicar herencia de prioridad del hábito si aplica */
                    tarea={(() => {
                        const tareaReal = dashboard.tareas.find(t => t.id === modales.tareaEditando?.id) || modales.tareaEditando;
                        if (!tareaReal) return undefined;

                        /* Heredar prioridad si es tarea de habito y no tiene prioridad propia */
                        if (!tareaReal.prioridad && tareaReal.habitoId) {
                            const habito = dashboard.habitos.find(h => h.id === tareaReal.habitoId);
                            if (habito) {
                                return {
                                    ...tareaReal,
                                    prioridad: habito.importancia.toLowerCase() as 'alta' | 'media' | 'baja'
                                };
                            }
                        }
                        return tareaReal;
                    })()}
                    participantes={[]}
                    companeros={[]}
                    proyectos={dashboard.proyectos}
                    onCambiarProyecto={nuevoId => modales.tareaEditando && dashboard.editarTarea(modales.tareaEditando.id, {proyectoId: nuevoId})}
                    onToggleCompletado={completado => {
                        if (modales.tareaEditando && completado !== modales.tareaEditando.completado) dashboard.toggleTarea(modales.tareaEditando.id);
                    }}
                    /* Subtareas - Fase 14.9 */
                    subtareas={dashboard.tareas.filter(t => t.parentId === modales.tareaEditando?.id).sort((a, b) => (a.orden || 0) - (b.orden || 0))}
                    onCrearSubtarea={dashboard.crearTarea}
                    onToggleSubtarea={dashboard.toggleTarea}
                    onEliminarSubtarea={dashboard.eliminarTarea}
                    onConfigurarSubtarea={modales.abrirModalEditarTarea}
                    onEditarSubtarea={dashboard.editarTarea}
                />
            )}

            {/* Componentes Auxiliares */}
            {dashboard.accionDeshacer && <ToastDeshacer mensaje={dashboard.accionDeshacer.mensaje} tiempoRestante={dashboard.accionDeshacer.tiempoRestante} tiempoTotal={5000} onDeshacer={dashboard.ejecutarDeshacer} onDescartar={dashboard.descartarDeshacer} />}
            {auth.user && <BarraPanelesOcultos panelesOcultos={layout.panelesOcultos} onMostrarPanel={layout.mostrarPanel} />}
            <TooltipSystem />
            <IndicadorArrastre panelArrastrando={arrastre.panelArrastrando} posicionMouse={arrastre.posicionMouse} />

            {/* Modal Creación Rápida */}
            {modales.modalCreacionRapida && <ModalCreacionRapida tipo={modales.modalCreacionRapida} proyectos={dashboard.proyectos} valoresIniciales={modales.valoresCreacionRapida} onCerrar={modales.cerrarCreacionRapida} onGuardar={manejarGuardarRapido} onCambiarTipo={modales.abrirCreacionRapida} />}

            {/* Modal de Temas */}
            <ModalTemas estaAbierto={modales.modalTemasAbierto} onCerrar={modales.cerrarModalTemas} temaActual={temas.tema} onCambiarTema={temas.cambiarTema} />

            {/* Modal de Configuración MCP */}
            <ModalConfiguracionMCP estaAbierto={modales.modalConfigMCPAbierto} onCerrar={modales.cerrarModalConfigMCP} onAbrirUpgrade={modales.abrirModalUpgrade} />

            {/* Modal Configuración Usuario */}
            <ModalConfiguracionUsuario estaAbierto={modales.modalConfigUsuarioAbierto} onCerrar={modales.cerrarModalConfigUsuario} />

            {/* Modal Backups */}
            <ModalHistorialBackups estaAbierto={modales.modalBackupsAbierto} onCerrar={modales.cerrarModalBackups} onAbrirUpgrade={modales.abrirModalUpgrade} />
        </>
    );
}

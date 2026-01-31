/*
 * useModalesDashboard
 * Hook para gestionar el estado de todos los modales del dashboard
 * Responsabilidad única: centralizar apertura/cierre de modales
 */

import {useState, useCallback} from 'react';
import type {Proyecto, Habito, Tarea} from '../types/dashboard';

interface PosicionModal {
    x: number;
    y: number;
}

interface ValoresCreacionRapida {
    proyectoId?: number;
    prioridad?: string;
    urgencia?: string;
}

interface UseModalesDashboardReturn {
    /* Auth */
    modalLoginAbierto: boolean;
    abrirModalLogin: () => void;
    cerrarModalLogin: () => void;
    /* Upgrade */
    modalUpgradeAbierto: boolean;
    abrirModalUpgrade: () => void;
    cerrarModalUpgrade: () => void;
    /* Seguridad */
    panelSeguridadAbierto: boolean;
    abrirPanelSeguridad: () => void;
    cerrarPanelSeguridad: () => void;
    /* Admin */
    panelAdminAbierto: boolean;
    abrirPanelAdmin: () => void;
    cerrarPanelAdmin: () => void;
    /* Perfil */
    modalPerfilAbierto: boolean;
    abrirModalPerfil: () => void;
    cerrarModalPerfil: () => void;
    /* Equipos */
    modalEquiposAbierto: boolean;
    abrirModalEquipos: () => void;
    cerrarModalEquipos: () => void;
    /* Notificaciones */
    modalNotificacionesAbierto: boolean;
    posicionModalNotificaciones: PosicionModal;
    abrirModalNotificaciones: (evento: React.MouseEvent) => void;
    cerrarModalNotificaciones: () => void;
    /* Experimentos */
    modalExperimentosAbierto: boolean;
    abrirModalExperimentos: () => void;
    cerrarModalExperimentos: () => void;
    /* Proyectos */
    modalCrearProyectoAbierto: boolean;
    abrirModalCrearProyecto: () => void;
    cerrarModalCrearProyecto: () => void;
    proyectoEditando: Proyecto | null;
    abrirModalEditarProyecto: (proyecto: Proyecto) => void;
    cerrarModalEditarProyecto: () => void;
    /* Configuraciones */
    modalConfigTareasAbierto: boolean;
    abrirModalConfigTareas: () => void;
    cerrarModalConfigTareas: () => void;
    modalConfigHabitosAbierto: boolean;
    abrirModalConfigHabitos: () => void;
    cerrarModalConfigHabitos: () => void;
    modalConfigProyectosAbierto: boolean;
    abrirModalConfigProyectos: () => void;
    cerrarModalConfigProyectos: () => void;
    modalConfigScratchpadAbierto: boolean;
    abrirModalConfigScratchpad: () => void;
    cerrarModalConfigScratchpad: () => void;
    modalConfigActividadAbierto: boolean;
    abrirModalConfigActividad: () => void;
    cerrarModalConfigActividad: () => void;
    modalConfigLayoutAbierto: boolean;
    abrirModalConfigLayout: () => void;
    cerrarModalConfigLayout: () => void;
    /* Versiones */
    modalVersionesAbierto: boolean;
    abrirModalVersiones: () => void;
    cerrarModalVersiones: () => void;
    /* Nueva Tarea */
    modalNuevaTareaAbierto: boolean;
    abrirModalNuevaTarea: () => void;
    cerrarModalNuevaTarea: () => void;
    /* Editar Tarea */
    tareaEditando: Tarea | null;
    abrirModalEditarTarea: (tarea: Tarea) => void;
    cerrarModalEditarTarea: () => void;
    /* Editar Tarea Móvil (BottomSheet) */
    tareaEditandoMovil: Tarea | null;
    abrirEdicionTareaMovil: (tarea: Tarea) => void;
    cerrarEdicionTareaMovil: () => void;
    /* Creación Rápida */
    modalCreacionRapida: 'tarea' | 'habito' | 'proyecto' | null;
    valoresCreacionRapida: ValoresCreacionRapida;
    abrirCreacionRapida: (tipo: 'tarea' | 'habito' | 'proyecto', valores?: ValoresCreacionRapida) => void;
    cerrarCreacionRapida: () => void;
    /* Temas */
    modalTemasAbierto: boolean;
    abrirModalTemas: () => void;
    cerrarModalTemas: () => void;
    /* Configuración MCP */
    modalConfigMCPAbierto: boolean;
    abrirModalConfigMCP: () => void;
    cerrarModalConfigMCP: () => void;
    /* Configuración Usuario */
    modalConfigUsuarioAbierto: boolean;
    abrirModalConfigUsuario: () => void;
    cerrarModalConfigUsuario: () => void;
    /* Backups */
    modalBackupsAbierto: boolean;
    abrirModalBackups: () => void;
    cerrarModalBackups: () => void;
    /* Feedback */
    modalFeedbackAbierto: boolean;
    abrirModalFeedback: () => void;
    cerrarModalFeedback: () => void;
}

export function useModalesDashboard(): UseModalesDashboardReturn {
    /* Auth */
    const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
    /* Upgrade */
    const [modalUpgradeAbierto, setModalUpgradeAbierto] = useState(false);
    /* Seguridad */
    const [panelSeguridadAbierto, setPanelSeguridadAbierto] = useState(false);
    /* Admin */
    const [panelAdminAbierto, setPanelAdminAbierto] = useState(false);
    /* Perfil */
    const [modalPerfilAbierto, setModalPerfilAbierto] = useState(false);
    /* Equipos */
    const [modalEquiposAbierto, setModalEquiposAbierto] = useState(false);
    /* Notificaciones */
    const [modalNotificacionesAbierto, setModalNotificacionesAbierto] = useState(false);
    const [posicionModalNotificaciones, setPosicionModalNotificaciones] = useState<PosicionModal>({x: 0, y: 0});
    /* Experimentos */
    const [modalExperimentosAbierto, setModalExperimentosAbierto] = useState(false);
    /* Proyectos */
    const [modalCrearProyectoAbierto, setModalCrearProyectoAbierto] = useState(false);
    const [proyectoEditando, setProyectoEditando] = useState<Proyecto | null>(null);
    /* Configuraciones */
    const [modalConfigTareasAbierto, setModalConfigTareasAbierto] = useState(false);
    const [modalConfigHabitosAbierto, setModalConfigHabitosAbierto] = useState(false);
    const [modalConfigProyectosAbierto, setModalConfigProyectosAbierto] = useState(false);
    const [modalConfigScratchpadAbierto, setModalConfigScratchpadAbierto] = useState(false);
    const [modalConfigActividadAbierto, setModalConfigActividadAbierto] = useState(false);
    const [modalConfigLayoutAbierto, setModalConfigLayoutAbierto] = useState(false);
    /* Versiones */
    const [modalVersionesAbierto, setModalVersionesAbierto] = useState(false);
    /* Nueva Tarea */
    const [modalNuevaTareaAbierto, setModalNuevaTareaAbierto] = useState(false);
    /* Editar Tarea */
    const [tareaEditando, setTareaEditando] = useState<Tarea | null>(null);
    /* Editar Tarea Móvil (BottomSheet) */
    const [tareaEditandoMovil, setTareaEditandoMovil] = useState<Tarea | null>(null);
    /* Creación Rápida */
    const [modalCreacionRapida, setModalCreacionRapida] = useState<'tarea' | 'habito' | 'proyecto' | null>(null);
    const [valoresCreacionRapida, setValoresCreacionRapida] = useState<ValoresCreacionRapida>({});
    /* Temas */
    const [modalTemasAbierto, setModalTemasAbierto] = useState(false);
    /* Configuración MCP */
    const [modalConfigMCPAbierto, setModalConfigMCPAbierto] = useState(false);
    /* Configuración Usuario */
    const [modalConfigUsuarioAbierto, setModalConfigUsuarioAbierto] = useState(false);
    /* Backups */
    const [modalBackupsAbierto, setModalBackupsAbierto] = useState(false);
    /* Feedback */
    const [modalFeedbackAbierto, setModalFeedbackAbierto] = useState(false);

    /* Handlers Auth */
    const abrirModalLogin = useCallback(() => setModalLoginAbierto(true), []);
    const cerrarModalLogin = useCallback(() => setModalLoginAbierto(false), []);

    /* Handlers Upgrade */
    const abrirModalUpgrade = useCallback(() => setModalUpgradeAbierto(true), []);
    const cerrarModalUpgrade = useCallback(() => setModalUpgradeAbierto(false), []);

    /* Handlers Seguridad */
    const abrirPanelSeguridad = useCallback(() => setPanelSeguridadAbierto(true), []);
    const cerrarPanelSeguridad = useCallback(() => setPanelSeguridadAbierto(false), []);

    /* Handlers Admin */
    const abrirPanelAdmin = useCallback(() => setPanelAdminAbierto(true), []);
    const cerrarPanelAdmin = useCallback(() => setPanelAdminAbierto(false), []);

    /* Handlers Perfil */
    const abrirModalPerfil = useCallback(() => setModalPerfilAbierto(true), []);
    const cerrarModalPerfil = useCallback(() => setModalPerfilAbierto(false), []);

    /* Handlers Equipos */
    const abrirModalEquipos = useCallback(() => setModalEquiposAbierto(true), []);
    const cerrarModalEquipos = useCallback(() => setModalEquiposAbierto(false), []);

    /* Handlers Notificaciones */
    const abrirModalNotificaciones = useCallback((evento: React.MouseEvent) => {
        const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
        setPosicionModalNotificaciones({
            x: rect.right - 360,
            y: rect.bottom + 10
        });
        setModalNotificacionesAbierto(prev => !prev);
    }, []);
    const cerrarModalNotificaciones = useCallback(() => setModalNotificacionesAbierto(false), []);

    /* Handlers Experimentos */
    const abrirModalExperimentos = useCallback(() => setModalExperimentosAbierto(true), []);
    const cerrarModalExperimentos = useCallback(() => setModalExperimentosAbierto(false), []);

    /* Handlers Proyectos */
    const abrirModalCrearProyecto = useCallback(() => setModalCrearProyectoAbierto(true), []);
    const cerrarModalCrearProyecto = useCallback(() => setModalCrearProyectoAbierto(false), []);
    const abrirModalEditarProyecto = useCallback((proyecto: Proyecto) => setProyectoEditando(proyecto), []);
    const cerrarModalEditarProyecto = useCallback(() => setProyectoEditando(null), []);

    /* Handlers Configuraciones */
    const abrirModalConfigTareas = useCallback(() => setModalConfigTareasAbierto(true), []);
    const cerrarModalConfigTareas = useCallback(() => setModalConfigTareasAbierto(false), []);
    const abrirModalConfigHabitos = useCallback(() => setModalConfigHabitosAbierto(true), []);
    const cerrarModalConfigHabitos = useCallback(() => setModalConfigHabitosAbierto(false), []);
    const abrirModalConfigProyectos = useCallback(() => setModalConfigProyectosAbierto(true), []);
    const cerrarModalConfigProyectos = useCallback(() => setModalConfigProyectosAbierto(false), []);
    const abrirModalConfigScratchpad = useCallback(() => setModalConfigScratchpadAbierto(true), []);
    const cerrarModalConfigScratchpad = useCallback(() => setModalConfigScratchpadAbierto(false), []);
    const abrirModalConfigActividad = useCallback(() => setModalConfigActividadAbierto(true), []);
    const cerrarModalConfigActividad = useCallback(() => setModalConfigActividadAbierto(false), []);
    const abrirModalConfigLayout = useCallback(() => setModalConfigLayoutAbierto(true), []);
    const cerrarModalConfigLayout = useCallback(() => setModalConfigLayoutAbierto(false), []);

    /* Handlers Versiones */
    const abrirModalVersiones = useCallback(() => setModalVersionesAbierto(true), []);
    const cerrarModalVersiones = useCallback(() => setModalVersionesAbierto(false), []);

    /* Handlers Nueva Tarea */
    const abrirModalNuevaTarea = useCallback(() => setModalNuevaTareaAbierto(true), []);
    const cerrarModalNuevaTarea = useCallback(() => setModalNuevaTareaAbierto(false), []);

    /* Handlers Editar Tarea */
    const abrirModalEditarTarea = useCallback((tarea: Tarea) => setTareaEditando(tarea), []);
    const cerrarModalEditarTarea = useCallback(() => setTareaEditando(null), []);

    /* Handlers Editar Tarea Móvil (BottomSheet) */
    const abrirEdicionTareaMovil = useCallback((tarea: Tarea) => setTareaEditandoMovil(tarea), []);
    const cerrarEdicionTareaMovil = useCallback(() => setTareaEditandoMovil(null), []);

    /* Handlers Creación Rápida */
    const abrirCreacionRapida = useCallback((tipo: 'tarea' | 'habito' | 'proyecto', valores?: ValoresCreacionRapida) => {
        setValoresCreacionRapida(valores || {});
        setModalCreacionRapida(tipo);
    }, []);
    const cerrarCreacionRapida = useCallback(() => {
        setModalCreacionRapida(null);
        setValoresCreacionRapida({});
    }, []);

    /* Handlers Temas */
    const abrirModalTemas = useCallback(() => setModalTemasAbierto(true), []);
    const cerrarModalTemas = useCallback(() => setModalTemasAbierto(false), []);

    /* Handlers Configuración MCP */
    const abrirModalConfigMCP = useCallback(() => setModalConfigMCPAbierto(true), []);
    const cerrarModalConfigMCP = useCallback(() => setModalConfigMCPAbierto(false), []);

    /* Handlers Configuración Usuario */
    const abrirModalConfigUsuario = useCallback(() => setModalConfigUsuarioAbierto(true), []);
    const cerrarModalConfigUsuario = useCallback(() => setModalConfigUsuarioAbierto(false), []);

    /* Handlers Backups */
    const abrirModalBackups = useCallback(() => setModalBackupsAbierto(true), []);
    const cerrarModalBackups = useCallback(() => setModalBackupsAbierto(false), []);

    /* Handlers Feedback */
    const abrirModalFeedback = useCallback(() => setModalFeedbackAbierto(true), []);
    const cerrarModalFeedback = useCallback(() => setModalFeedbackAbierto(false), []);

    return {
        modalLoginAbierto,
        abrirModalLogin,
        cerrarModalLogin,
        modalUpgradeAbierto,
        abrirModalUpgrade,
        cerrarModalUpgrade,
        panelSeguridadAbierto,
        abrirPanelSeguridad,
        cerrarPanelSeguridad,
        panelAdminAbierto,
        abrirPanelAdmin,
        cerrarPanelAdmin,
        modalPerfilAbierto,
        abrirModalPerfil,
        cerrarModalPerfil,
        modalEquiposAbierto,
        abrirModalEquipos,
        cerrarModalEquipos,
        modalNotificacionesAbierto,
        posicionModalNotificaciones,
        abrirModalNotificaciones,
        cerrarModalNotificaciones,
        modalExperimentosAbierto,
        abrirModalExperimentos,
        cerrarModalExperimentos,
        modalCrearProyectoAbierto,
        abrirModalCrearProyecto,
        cerrarModalCrearProyecto,
        proyectoEditando,
        abrirModalEditarProyecto,
        cerrarModalEditarProyecto,
        modalConfigTareasAbierto,
        abrirModalConfigTareas,
        cerrarModalConfigTareas,
        modalConfigHabitosAbierto,
        abrirModalConfigHabitos,
        cerrarModalConfigHabitos,
        modalConfigProyectosAbierto,
        abrirModalConfigProyectos,
        cerrarModalConfigProyectos,
        modalConfigScratchpadAbierto,
        abrirModalConfigScratchpad,
        cerrarModalConfigScratchpad,
        modalConfigActividadAbierto,
        abrirModalConfigActividad,
        cerrarModalConfigActividad,
        modalConfigLayoutAbierto,
        abrirModalConfigLayout,
        cerrarModalConfigLayout,
        modalVersionesAbierto,
        abrirModalVersiones,
        cerrarModalVersiones,
        modalNuevaTareaAbierto,
        abrirModalNuevaTarea,
        cerrarModalNuevaTarea,
        tareaEditando,
        abrirModalEditarTarea,
        cerrarModalEditarTarea,
        tareaEditandoMovil,
        abrirEdicionTareaMovil,
        cerrarEdicionTareaMovil,
        modalCreacionRapida,
        valoresCreacionRapida,
        abrirCreacionRapida,
        cerrarCreacionRapida,
        modalTemasAbierto,
        abrirModalTemas,
        cerrarModalTemas,
        modalConfigMCPAbierto,
        abrirModalConfigMCP,
        cerrarModalConfigMCP,
        modalConfigUsuarioAbierto,
        abrirModalConfigUsuario,
        cerrarModalConfigUsuario,
        modalBackupsAbierto,
        abrirModalBackups,
        cerrarModalBackups,
        modalFeedbackAbierto,
        abrirModalFeedback,
        cerrarModalFeedback
    };
}

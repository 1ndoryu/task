/*
 * modalesDashboardTipos.ts
 *
 * Tipos de estado de modales del dashboard, separados del hook para que el
 * hook quede dentro del límite de líneas. El hook re-exporta
 * UseModalesDashboardReturn para no romper importadores.
 */

import type {Proyecto, Habito, Tarea} from '../types/dashboard';

/* [233A-27] Secciones disponibles en el modal de configuración global */
/* [243A-1] Agrega 'panelIA' para la config del chat IA (API key, modelo, preferencias) */
/* [263A-5] Agrega 'gruposFb' para config del panel de grupos FB (token, API URL) */
/* [105A-1] Agrega 'deficitCalorico' para centralizar el formulario de calorías. */
export type SeccionConfigGlobal = 'paneles' | 'tareas' | 'habitos' | 'proyectos' | 'notas' | 'actividad' | 'deficitCalorico' | 'panelIA' | 'gruposFb' | 'layout' | 'perfil' | 'preferencias' | 'temas' | 'seguridad' | 'ia' | 'backups' | 'plugins';

export interface PosicionModal {
    x: number;
    y: number;
}

export interface ValoresCreacionRapida {
    proyectoId?: number;
    prioridad?: string;
    urgencia?: string;
    grupoEjecucion?: string | null;
}

export interface UmdModalesAcceso {
    modalLoginAbierto: boolean;
    abrirModalLogin: () => void;
    cerrarModalLogin: () => void;
    modalUpgradeAbierto: boolean;
    abrirModalUpgrade: () => void;
    cerrarModalUpgrade: () => void;
    modalPerfilAbierto: boolean;
    abrirModalPerfil: () => void;
    cerrarModalPerfil: () => void;
}
export interface UmdPanelesSeguridad {
    panelSeguridadAbierto: boolean;
    abrirPanelSeguridad: () => void;
    cerrarPanelSeguridad: () => void;
    panelAdminAbierto: boolean;
    abrirPanelAdmin: () => void;
    cerrarPanelAdmin: () => void;
    modalEquiposAbierto: boolean;
    abrirModalEquipos: () => void;
    cerrarModalEquipos: () => void;
}
export interface UmdNotificacionesExperimentos {
    modalNotificacionesAbierto: boolean;
    posicionModalNotificaciones: PosicionModal;
    abrirModalNotificaciones: (evento: React.MouseEvent) => void;
    cerrarModalNotificaciones: () => void;
    modalExperimentosAbierto: boolean;
    abrirModalExperimentos: () => void;
    cerrarModalExperimentos: () => void;
}
export interface UmdProyecto {
    modalCrearProyectoAbierto: boolean;
    abrirModalCrearProyecto: () => void;
    cerrarModalCrearProyecto: () => void;
    proyectoEditando: Proyecto | null;
    abrirModalEditarProyecto: (proyecto: Proyecto) => void;
    cerrarModalEditarProyecto: () => void;
}
export interface UmdConfigTareasHabitos {
    modalConfigTareasAbierto: boolean;
    abrirModalConfigTareas: () => void;
    cerrarModalConfigTareas: () => void;
    modalConfigHabitosAbierto: boolean;
    abrirModalConfigHabitos: () => void;
    cerrarModalConfigHabitos: () => void;
}
export interface UmdConfigProyectosScratchpad {
    modalConfigProyectosAbierto: boolean;
    abrirModalConfigProyectos: () => void;
    cerrarModalConfigProyectos: () => void;
    modalConfigScratchpadAbierto: boolean;
    abrirModalConfigScratchpad: () => void;
    cerrarModalConfigScratchpad: () => void;
}
export interface UmdConfigActividadLayout {
    modalConfigActividadAbierto: boolean;
    abrirModalConfigActividad: () => void;
    cerrarModalConfigActividad: () => void;
    modalConfigLayoutAbierto: boolean;
    abrirModalConfigLayout: () => void;
    cerrarModalConfigLayout: () => void;
}
export interface UmdPanelesVersionesNuevaTarea {
    /* [18-08-2026] Modal de gestión de paneles (activar/desactivar/minimizados) */
    modalPanelesAbierto: boolean;
    abrirModalPaneles: () => void;
    cerrarModalPaneles: () => void;
    modalVersionesAbierto: boolean;
    abrirModalVersiones: () => void;
    cerrarModalVersiones: () => void;
    modalNuevaTareaAbierto: boolean;
    abrirModalNuevaTarea: () => void;
    cerrarModalNuevaTarea: () => void;
}
export interface UmdEdicionTarea {
    tareaEditando: Tarea | null;
    abrirModalEditarTarea: (tarea: Tarea) => void;
    cerrarModalEditarTarea: () => void;
    tareaEditandoMovil: Tarea | null;
    abrirEdicionTareaMovil: (tarea: Tarea) => void;
    cerrarEdicionTareaMovil: () => void;
    habitoEditandoMovil: Habito | null;
    abrirEdicionHabitoMovil: (habito: Habito) => void;
    cerrarEdicionHabitoMovil: () => void;
}
export interface UmdCreacionRapidaTemas {
    modalCreacionRapida: 'tarea' | 'habito' | 'proyecto' | null;
    valoresCreacionRapida: ValoresCreacionRapida;
    abrirCreacionRapida: (tipo: 'tarea' | 'habito' | 'proyecto', valores?: ValoresCreacionRapida) => void;
    cerrarCreacionRapida: () => void;
    modalTemasAbierto: boolean;
    abrirModalTemas: () => void;
    cerrarModalTemas: () => void;
    modalConfigMCPAbierto: boolean;
    abrirModalConfigMCP: () => void;
    cerrarModalConfigMCP: () => void;
}
export interface UmdUsuarioBackups {
    modalConfigUsuarioAbierto: boolean;
    abrirModalConfigUsuario: () => void;
    cerrarModalConfigUsuario: () => void;
    modalBackupsAbierto: boolean;
    abrirModalBackups: () => void;
    cerrarModalBackups: () => void;
    modalFeedbackAbierto: boolean;
    abrirModalFeedback: () => void;
    cerrarModalFeedback: () => void;
}
export interface UmdPlugins {
    modalPluginsAbierto: boolean;
    pluginConfigInicial: string | null;
    /* [27-08-2026] La config se abrió directa (engranaje del panel): al cerrarla
     * se cierra TODO el modal, en vez de volver a la lista de plugins. */
    pluginConfigDirecta: boolean;
    abrirModalPlugins: () => void;
    abrirModalPluginsConConfig: (pluginId: string) => void;
    cerrarModalPlugins: () => void;
}
export interface UmdConfigGlobal {
    modalConfigDeficitCaloricoAbierto: boolean;
    abrirModalConfigDeficitCalorico: () => void;
    cerrarModalConfigDeficitCalorico: () => void;
    /* [233A-27] Modal de configuración global */
    modalConfigGlobalAbierto: boolean;
    seccionConfigGlobal: SeccionConfigGlobal | null;
    abrirModalConfigGlobal: (seccion?: SeccionConfigGlobal | null) => void;
    cerrarModalConfigGlobal: () => void;
}
export interface UseModalesDashboardReturn extends UmdModalesAcceso, UmdPanelesSeguridad, UmdNotificacionesExperimentos, UmdProyecto, UmdConfigTareasHabitos, UmdConfigProyectosScratchpad, UmdConfigActividadLayout, UmdPanelesVersionesNuevaTarea, UmdEdicionTarea, UmdCreacionRapidaTemas, UmdUsuarioBackups, UmdPlugins, UmdConfigGlobal {}
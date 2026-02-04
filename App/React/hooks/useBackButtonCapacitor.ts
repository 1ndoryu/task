/*
 * useBackButtonCapacitor
 * Hook para interceptar el botón back en aplicaciones Capacitor (APK)
 * Cierra modales, BottomSheets, menús y navegación antes de permitir la salida
 * TAREA 1: Fix botón back en APK - Versión mejorada
 */

import {useEffect, useCallback, useRef} from 'react';
import {App} from '@capacitor/app';
import {Capacitor} from '@capacitor/core';

interface ElementosCerrables {
    /* Modales abiertos */
    modalLoginAbierto?: boolean;
    modalUpgradeAbierto?: boolean;
    modalPerfilAbierto?: boolean;
    modalEquiposAbierto?: boolean;
    modalNotificacionesAbierto?: boolean;
    modalExperimentosAbierto?: boolean;
    modalCrearProyectoAbierto?: boolean;
    proyectoEditando?: unknown;
    modalConfigTareasAbierto?: boolean;
    modalConfigHabitosAbierto?: boolean;
    modalConfigProyectosAbierto?: boolean;
    modalConfigScratchpadAbierto?: boolean;
    modalConfigActividadAbierto?: boolean;
    modalConfigLayoutAbierto?: boolean;
    modalVersionesAbierto?: boolean;
    modalNuevaTareaAbierto?: boolean;
    tareaEditando?: unknown;
    tareaEditandoMovil?: unknown;
    habitoEditandoMovil?: unknown;
    modalCreacionRapida?: unknown;
    modalTemasAbierto?: boolean;
    modalConfigMCPAbierto?: boolean;
    modalConfigUsuarioAbierto?: boolean;
    modalBackupsAbierto?: boolean;
    modalFeedbackAbierto?: boolean;
    panelSeguridadAbierto?: boolean;
    panelAdminAbierto?: boolean;
    /* Modal de notas */
    modalNotasAbierto?: boolean;
}

interface AccionesCierre {
    cerrarModalLogin?: () => void;
    cerrarModalUpgrade?: () => void;
    cerrarModalPerfil?: () => void;
    cerrarModalEquipos?: () => void;
    cerrarModalNotificaciones?: () => void;
    cerrarModalExperimentos?: () => void;
    cerrarModalCrearProyecto?: () => void;
    cerrarModalEditarProyecto?: () => void;
    cerrarModalConfigTareas?: () => void;
    cerrarModalConfigHabitos?: () => void;
    cerrarModalConfigProyectos?: () => void;
    cerrarModalConfigScratchpad?: () => void;
    cerrarModalConfigActividad?: () => void;
    cerrarModalConfigLayout?: () => void;
    cerrarModalVersiones?: () => void;
    cerrarModalNuevaTarea?: () => void;
    cerrarModalEditarTarea?: () => void;
    cerrarEdicionTareaMovil?: () => void;
    cerrarEdicionHabitoMovil?: () => void;
    cerrarCreacionRapida?: () => void;
    cerrarModalTemas?: () => void;
    cerrarModalConfigMCP?: () => void;
    cerrarModalConfigUsuario?: () => void;
    cerrarModalBackups?: () => void;
    cerrarModalFeedback?: () => void;
    cerrarPanelSeguridad?: () => void;
    cerrarPanelAdmin?: () => void;
    cerrarModalNotas?: () => void;
}

interface UseBackButtonCapacitorParams {
    elementos: ElementosCerrables;
    acciones: AccionesCierre;
    drawerAbierto?: boolean;
    cerrarDrawer?: () => void;
}

/*
 * Detecta si hay un BottomSheet abierto via clase CSS del body
 */
function hayBottomSheetAbierto(): boolean {
    return document.body.classList.contains('bottomSheetAbierto');
}

/*
 * Detecta si hay un drawer/menú lateral abierto via clase CSS del body
 */
function hayDrawerAbierto(): boolean {
    return document.body.classList.contains('drawerAbierto');
}

/*
 * Cierra BottomSheets abiertos simulando click en overlay visible
 */
function cerrarBottomSheets(): boolean {
    /* Buscar overlay visible específicamente */
    const overlay = document.querySelector('.bottomSheetOverlay--visible');
    if (overlay) {
        (overlay as HTMLElement).click();
        return true;
    }
    /* Fallback: buscar cualquier overlay de BottomSheet y simular Escape */
    if (hayBottomSheetAbierto()) {
        const evento = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true});
        document.dispatchEvent(evento);
        return true;
    }
    return false;
}

/*
 * Cierra el drawer lateral simulando click en overlay visible
 */
function cerrarDrawerGlobal(): boolean {
    const overlay = document.querySelector('.drawerMovilOverlay--visible');
    if (overlay) {
        (overlay as HTMLElement).click();
        return true;
    }
    /* Fallback con Escape */
    if (hayDrawerAbierto()) {
        const evento = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true});
        document.dispatchEvent(evento);
        return true;
    }
    return false;
}

/*
 * Cierra menús contextuales abiertos
 */
function cerrarMenusContextuales(): boolean {
    const menu = document.querySelector('.menuContextual, .menuContextualAdaptivo, .menuContextualAdaptivo--visible');
    if (menu) {
        const evento = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true});
        document.dispatchEvent(evento);
        return true;
    }
    return false;
}

/*
 * Detecta si hay un modal genérico abierto (overlay de modal visible)
 * Busca modales que no están siendo manejados explícitamente
 */
function hayModalGenericoAbierto(): boolean {
    const modal = document.querySelector('.modalOverlay--visible, .modal--visible, [role="dialog"][aria-modal="true"]');
    return modal !== null;
}

/*
 * Cierra modal genérico via Escape
 */
function cerrarModalGenerico(): boolean {
    if (hayModalGenericoAbierto()) {
        const evento = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true});
        document.dispatchEvent(evento);
        return true;
    }
    return false;
}

export function useBackButtonCapacitor({elementos, acciones, drawerAbierto, cerrarDrawer}: UseBackButtonCapacitorParams): void {
    /* Ref para evitar múltiples ejecuciones */
    const procesandoRef = useRef(false);

    const manejarBackButton = useCallback(() => {
        /* Evitar procesamiento duplicado */
        if (procesandoRef.current) return;
        procesandoRef.current = true;

        /* Delay corto para permitir que el estado se estabilice */
        setTimeout(() => {
            procesandoRef.current = false;
        }, 300);

        /* Prioridad 1: Menús contextuales */
        if (cerrarMenusContextuales()) {
            return;
        }

        /* Prioridad 2: BottomSheets (edición móvil) */
        if (hayBottomSheetAbierto()) {
            /* Primero intentar cerrar via acciones del hook */
            if (elementos.tareaEditandoMovil && acciones.cerrarEdicionTareaMovil) {
                acciones.cerrarEdicionTareaMovil();
                return;
            }
            if (elementos.habitoEditandoMovil && acciones.cerrarEdicionHabitoMovil) {
                acciones.cerrarEdicionHabitoMovil();
                return;
            }
            /* Fallback: cerrar via DOM */
            if (cerrarBottomSheets()) {
                return;
            }
        }

        /* Prioridad 3: Drawer/Menú lateral */
        if (hayDrawerAbierto() || drawerAbierto) {
            if (cerrarDrawer) {
                cerrarDrawer();
                return;
            }
            if (cerrarDrawerGlobal()) {
                return;
            }
        }

        /* Prioridad 4: Modales (orden de profundidad) */

        /* Modales de edición */
        if (elementos.tareaEditando && acciones.cerrarModalEditarTarea) {
            acciones.cerrarModalEditarTarea();
            return;
        }
        if (elementos.proyectoEditando && acciones.cerrarModalEditarProyecto) {
            acciones.cerrarModalEditarProyecto();
            return;
        }

        /* Modales de creación */
        if (elementos.modalCreacionRapida && acciones.cerrarCreacionRapida) {
            acciones.cerrarCreacionRapida();
            return;
        }
        if (elementos.modalNuevaTareaAbierto && acciones.cerrarModalNuevaTarea) {
            acciones.cerrarModalNuevaTarea();
            return;
        }
        if (elementos.modalCrearProyectoAbierto && acciones.cerrarModalCrearProyecto) {
            acciones.cerrarModalCrearProyecto();
            return;
        }

        /* Modales de configuración */
        if (elementos.modalConfigTareasAbierto && acciones.cerrarModalConfigTareas) {
            acciones.cerrarModalConfigTareas();
            return;
        }
        if (elementos.modalConfigHabitosAbierto && acciones.cerrarModalConfigHabitos) {
            acciones.cerrarModalConfigHabitos();
            return;
        }
        if (elementos.modalConfigProyectosAbierto && acciones.cerrarModalConfigProyectos) {
            acciones.cerrarModalConfigProyectos();
            return;
        }
        if (elementos.modalConfigScratchpadAbierto && acciones.cerrarModalConfigScratchpad) {
            acciones.cerrarModalConfigScratchpad();
            return;
        }
        if (elementos.modalConfigActividadAbierto && acciones.cerrarModalConfigActividad) {
            acciones.cerrarModalConfigActividad();
            return;
        }
        if (elementos.modalConfigLayoutAbierto && acciones.cerrarModalConfigLayout) {
            acciones.cerrarModalConfigLayout();
            return;
        }
        if (elementos.modalConfigMCPAbierto && acciones.cerrarModalConfigMCP) {
            acciones.cerrarModalConfigMCP();
            return;
        }
        if (elementos.modalConfigUsuarioAbierto && acciones.cerrarModalConfigUsuario) {
            acciones.cerrarModalConfigUsuario();
            return;
        }

        /* Modales auxiliares */
        if (elementos.modalNotificacionesAbierto && acciones.cerrarModalNotificaciones) {
            acciones.cerrarModalNotificaciones();
            return;
        }
        if (elementos.modalTemasAbierto && acciones.cerrarModalTemas) {
            acciones.cerrarModalTemas();
            return;
        }
        if (elementos.modalVersionesAbierto && acciones.cerrarModalVersiones) {
            acciones.cerrarModalVersiones();
            return;
        }
        if (elementos.modalBackupsAbierto && acciones.cerrarModalBackups) {
            acciones.cerrarModalBackups();
            return;
        }
        if (elementos.modalFeedbackAbierto && acciones.cerrarModalFeedback) {
            acciones.cerrarModalFeedback();
            return;
        }

        /* Modales principales */
        if (elementos.modalPerfilAbierto && acciones.cerrarModalPerfil) {
            acciones.cerrarModalPerfil();
            return;
        }
        if (elementos.modalEquiposAbierto && acciones.cerrarModalEquipos) {
            acciones.cerrarModalEquipos();
            return;
        }
        if (elementos.modalExperimentosAbierto && acciones.cerrarModalExperimentos) {
            acciones.cerrarModalExperimentos();
            return;
        }
        if (elementos.modalUpgradeAbierto && acciones.cerrarModalUpgrade) {
            acciones.cerrarModalUpgrade();
            return;
        }
        if (elementos.modalLoginAbierto && acciones.cerrarModalLogin) {
            acciones.cerrarModalLogin();
            return;
        }

        /* Paneles */
        if (elementos.panelSeguridadAbierto && acciones.cerrarPanelSeguridad) {
            acciones.cerrarPanelSeguridad();
            return;
        }
        if (elementos.panelAdminAbierto && acciones.cerrarPanelAdmin) {
            acciones.cerrarPanelAdmin();
            return;
        }

        /* Modal de notas */
        if (elementos.modalNotasAbierto && acciones.cerrarModalNotas) {
            acciones.cerrarModalNotas();
            return;
        }

        /* 
         * Fallback: Intentar cerrar cualquier modal genérico via Escape
         * Esto cubre modales que no están explícitamente listados
         */
        if (cerrarModalGenerico()) {
            return;
        }

        /* Si no hay nada que cerrar, permitir comportamiento nativo (minimizar app) */
        App.minimizeApp();
    }, [elementos, acciones, drawerAbierto, cerrarDrawer]);

    useEffect(() => {
        /* Solo registrar el listener si estamos en una plataforma nativa */
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        /* Registrar listener con prioridad alta para interceptar antes del comportamiento nativo */
        const listener = App.addListener('backButton', ({canGoBack}) => {
            /* Siempre manejamos el back button nosotros mismos */
            manejarBackButton();
        });

        return () => {
            listener.then((handle: {remove: () => void}) => handle.remove());
        };
    }, [manejarBackButton]);
}

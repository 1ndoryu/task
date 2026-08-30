/*
 * useBackButtonCapacitor
 * Hook para interceptar el botón back en aplicaciones Capacitor (APK)
 * Cierra modales, BottomSheets, menús y navegación antes de permitir la salida
 * TAREA 1: Fix botón back en APK - Versión mejorada
 */

import {useEffect, useCallback, useRef} from 'react';
/* @ts-ignore - Modulo solo disponible en plataforma nativa Capacitor */
import {App} from '@capacitor/app';
import {Capacitor} from '@capacitor/core';

/* Fragments cohesivos de ElementosCerrables para cumplir ISP (≤10 campos por
 * declaración). Se componen con `extends`, conservando el contrato plano. */
interface ElementosModalesBasicos {
    modalLoginAbierto?: boolean;
    modalUpgradeAbierto?: boolean;
    modalPerfilAbierto?: boolean;
    modalEquiposAbierto?: boolean;
    modalNotificacionesAbierto?: boolean;
    modalExperimentosAbierto?: boolean;
    modalCrearProyectoAbierto?: boolean;
    proyectoEditando?: unknown;
}
interface ElementosModalesConfig {
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
}
interface ElementosModalesEdicion {
    habitoEditandoMovil?: unknown;
    modalCreacionRapida?: unknown;
    modalTemasAbierto?: boolean;
    modalConfigMCPAbierto?: boolean;
    modalConfigUsuarioAbierto?: boolean;
    modalBackupsAbierto?: boolean;
    modalFeedbackAbierto?: boolean;
    panelSeguridadAbierto?: boolean;
    panelAdminAbierto?: boolean;
    modalNotasAbierto?: boolean;
}
interface ElementosCerrables extends ElementosModalesBasicos, ElementosModalesConfig, ElementosModalesEdicion {}

/* Fragments cohesivos de AccionesCierre (ISP). */
interface AccionesModalesBasicas {
    cerrarModalLogin?: () => void;
    cerrarModalUpgrade?: () => void;
    cerrarModalPerfil?: () => void;
    cerrarModalEquipos?: () => void;
    cerrarModalNotificaciones?: () => void;
    cerrarModalExperimentos?: () => void;
    cerrarModalCrearProyecto?: () => void;
    cerrarModalEditarProyecto?: () => void;
}
interface AccionesModalesConfig {
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
}
interface AccionesModalesEdicion {
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
interface AccionesCierre extends AccionesModalesBasicas, AccionesModalesConfig, AccionesModalesEdicion {}

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

/* [H-F12-07] Pares (abierto, cerrar) declarativos en orden de prioridad de
 * cierre: agregar un modal = añadir una tupla aquí, sin tocar la lógica de
 * back ni DashboardIsland (que pasa el objeto `modales` completo). */
const PARES_CIERRE_MODALES: Array<[keyof ElementosCerrables, keyof AccionesCierre]> = [
    /* Modales de edición */
    ['tareaEditando', 'cerrarModalEditarTarea'],
    ['proyectoEditando', 'cerrarModalEditarProyecto'],
    /* Modales de creación */
    ['modalCreacionRapida', 'cerrarCreacionRapida'],
    ['modalNuevaTareaAbierto', 'cerrarModalNuevaTarea'],
    ['modalCrearProyectoAbierto', 'cerrarModalCrearProyecto'],
    /* Modales de configuración */
    ['modalConfigTareasAbierto', 'cerrarModalConfigTareas'],
    ['modalConfigHabitosAbierto', 'cerrarModalConfigHabitos'],
    ['modalConfigProyectosAbierto', 'cerrarModalConfigProyectos'],
    ['modalConfigScratchpadAbierto', 'cerrarModalConfigScratchpad'],
    ['modalConfigActividadAbierto', 'cerrarModalConfigActividad'],
    ['modalConfigLayoutAbierto', 'cerrarModalConfigLayout'],
    ['modalConfigMCPAbierto', 'cerrarModalConfigMCP'],
    ['modalConfigUsuarioAbierto', 'cerrarModalConfigUsuario'],
    /* Modales auxiliares */
    ['modalNotificacionesAbierto', 'cerrarModalNotificaciones'],
    ['modalTemasAbierto', 'cerrarModalTemas'],
    ['modalVersionesAbierto', 'cerrarModalVersiones'],
    ['modalBackupsAbierto', 'cerrarModalBackups'],
    ['modalFeedbackAbierto', 'cerrarModalFeedback'],
    /* Modales principales */
    ['modalPerfilAbierto', 'cerrarModalPerfil'],
    ['modalEquiposAbierto', 'cerrarModalEquipos'],
    ['modalExperimentosAbierto', 'cerrarModalExperimentos'],
    ['modalUpgradeAbierto', 'cerrarModalUpgrade'],
    ['modalLoginAbierto', 'cerrarModalLogin'],
    /* Paneles */
    ['panelSeguridadAbierto', 'cerrarPanelSeguridad'],
    ['panelAdminAbierto', 'cerrarPanelAdmin'],
    /* Modal de notas */
    ['modalNotasAbierto', 'cerrarModalNotas'],
];

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

        /* Prioridad 4: Modales (orden de profundidad, declarativo) */
        for (const [estado, cerrar] of PARES_CIERRE_MODALES) {
            const cerrarAccion = acciones[cerrar];
            if (elementos[estado] && cerrarAccion) {
                cerrarAccion();
                return;
            }
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
        const listener = App.addListener('backButton', (_event: {canGoBack: boolean}) => {
            /* Siempre manejamos el back button nosotros mismos */
            manejarBackButton();
        });

        return () => {
            listener.then((handle: {remove: () => void}) => handle.remove());
        };
    }, [manejarBackButton]);
}

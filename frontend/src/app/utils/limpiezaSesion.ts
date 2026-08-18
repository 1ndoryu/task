/*
 * limpiezaSesion
 * Limpia todos los datos de usuario al hacer logout para evitar cruce de sesiones.
 * Resetea stores de Zustand, limpia localStorage y cache de sincronización.
 */

import {useHabitosStore} from '../stores/habitosStore';
import {useHabitosHistorialStore} from '../stores/habitosHistorialStore';
import {CLAVES_LOCALSTORAGE} from '../hooks/useLocalStorage';

/*
 * Claves de localStorage que deben limpiarse al cerrar sesión.
 * Incluye las claves de los stores con persist y claves de configuración del dashboard.
 */
const CLAVES_SESION = [
    /* Stores Zustand con persist */
    'glory-habitos-store',
    'grupos-tareas-storage',
    'configuracion-usuario-storage',

    /* Claves de useLocalStorage del dashboard */
    CLAVES_LOCALSTORAGE.habitos,
    CLAVES_LOCALSTORAGE.tareas,
    CLAVES_LOCALSTORAGE.notas,
    CLAVES_LOCALSTORAGE.configuracion,
    CLAVES_LOCALSTORAGE.proyectos,
    CLAVES_LOCALSTORAGE.sync,

    /* Claves de ordenamiento y preferencias */
    'glory_orden_habitos',
    'glory_orden_tareas',

    /* Cache de sincronización */
    'dashboard_sync_meta',
];

/*
 * Limpia todos los datos del usuario actual.
 * Se ejecuta ANTES del POST de logout para asegurar que no quedan datos residuales.
 */
export function limpiarTodosLosDatosUsuario(): void {
    /* 1. Resetear stores de Zustand en memoria */
    try {
        useHabitosStore.setState({habitos: [], inicializado: false, estadoGuardado: 'idle', errorGuardado: null});
    } catch (e) {
        console.warn('[Limpieza] Error reseteando habitosStore:', e);
    }

    try {
        useHabitosHistorialStore.getState().limpiarTodoHistorialDetallado();
    } catch (e) {
        console.warn('[Limpieza] Error limpiando historial:', e);
    }

    /* 2. Limpiar todas las claves conocidas de localStorage */
    for (const clave of CLAVES_SESION) {
        try {
            localStorage.removeItem(clave);
        } catch (e) {
            console.warn(`[Limpieza] Error eliminando clave "${clave}":`, e);
        }
    }

    /* 3. Limpiar claves con prefijo glory_ que pudieran haberse creado dinámicamente */
    try {
        const clavesAEliminar: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const clave = localStorage.key(i);
            if (clave && (clave.startsWith('glory') || clave.startsWith('dashboard_'))) {
                clavesAEliminar.push(clave);
            }
        }
        for (const clave of clavesAEliminar) {
            localStorage.removeItem(clave);
        }
    } catch (e) {
        console.warn('[Limpieza] Error en limpieza por prefijo:', e);
    }

    /* 4. Limpiar sessionStorage */
    try {
        sessionStorage.clear();
    } catch (e) {
        console.warn('[Limpieza] Error limpiando sessionStorage:', e);
    }
}

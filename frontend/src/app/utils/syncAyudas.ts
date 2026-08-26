/**
 * [T7] Ayudas puras y de persistencia ligera del cluster de sincronización.
 *
 * Extraídas de `hooks/dashboard/useSyncManager.ts` en el refactor H-F12-13.
 * Son funciones sin estado del hook (lógica de bienvenida y guards), testables
 * de forma aislada. NO incluyen la máquina de sync (init/auto-save): esa queda
 * en `useSyncManager` por acoplar estado compartido (`syncMeta`, `hasChanges`,
 * `isInitialized`) con los guards anti-loop/anti-wipeout/WS-absorb.
 */

import type {DashboardData} from '../hooks/useDashboardApi';
import {habitosIniciales, notasIniciales, tareasIniciales} from '../data/datosIniciales';
import {apiFetch} from '../utils/apiClient';
import {devWarn} from './devLog';

/*
 * Clave para detectar si ya se inicializó con datos de bienvenida.
 * Evita subir datos iniciales múltiples veces o a usuarios que ya tenían datos.
 */
export const CLAVE_USUARIO_INICIALIZADO = 'glory_usuario_inicializado';

/**
 * Verifica si los datos del servidor están "vacíos" (usuario nuevo sin datos).
 * Consideramos vacío si no tiene hábitos, tareas, y notas vacías.
 */
export function esServidorVacio(serverData: DashboardData | null): boolean {
    if (!serverData) return true;

    const sinHabitos = !serverData.habitos || serverData.habitos.length === 0;
    const sinTareas = !serverData.tareas || serverData.tareas.length === 0;
    const sinNotas = !serverData.notas || serverData.notas.trim() === '';

    return sinHabitos && sinTareas && sinNotas;
}

/**
 * [275A-1] Safety guard contra wipeout: NUNCA subir datos si TODOS los arrays
 * principales están vacíos y ya existía una sincronización previa (lastSync > 0).
 * Esto previene la catástrofe cuando Zustand aún no ha hidratado sus stores
 * (habitos = []) pero isDataReady ya es true, causando que el sync o el
 * auto-save envíen un estado vacío al servidor que soft-deletea todo.
 * Excepción: lastSync === 0 = primera sincronización (usuario nuevo), permitido.
 */
export function esProbableWipeout(
    data: DashboardData,
    lastSync: number,
    habitosInicializado?: boolean
): boolean {
    if (lastSync === 0) return false; // Primera vez = usuario nuevo, ok subir vacio

    const sinHabitos = !data.habitos || data.habitos.length === 0;
    const sinTareas = !data.tareas || data.tareas.length === 0;
    const sinProyectos = !data.proyectos || data.proyectos.length === 0;

    /* [275A-1] Si Zustand persist aún no hidrato (habitosInicializado=false),
     * los arrays de habitos SIEMPRE estan vacios. Cualquier subida en este
     * estado es peligrosa: bloquear si hay al menos 2 arrays vacios (no solo 3). */
    if (habitosInicializado === false) {
        const arraysVacios = [sinHabitos, sinTareas, sinProyectos].filter(Boolean).length;
        return arraysVacios >= 2;
    }
    /* Solo bloquear si TODOS los arrays estan vacios simultaneamente.
     * Que un solo array sea vacio es normal (ej: el usuario no tiene proyectos). */
    return sinHabitos && sinTareas && sinProyectos;
}

/**
 * Verifica si el usuario ya fue inicializado previamente con datos de bienvenida.
 * Evita que al borrar localStorage y recargar, se vuelvan a subir datos iniciales.
 */
export function usuarioYaInicializado(): boolean {
    try {
        return localStorage.getItem(CLAVE_USUARIO_INICIALIZADO) === 'true';
    } catch {
        return false;
    }
}

/**
 * Marca al usuario como inicializado después de subir datos de bienvenida.
 * Esta marca persiste incluso si se borra el resto del localStorage.
 */
export function marcarUsuarioComoInicializado(): void {
    try {
        localStorage.setItem(CLAVE_USUARIO_INICIALIZADO, 'true');
    } catch {
        devWarn('[SyncManager] No se pudo guardar marca de inicialización');
    }
}

/**
 * Genera datos iniciales completos para usuarios nuevos.
 * Combina datos base con los datos de bienvenida de datosIniciales.ts.
 *
 * IMPORTANTE: NO depende de currentData para el contenido — solo usa `baseData`
 * para la estructura (version, configuracion, etc.), evitando condiciones de
 * carrera con stores que se hidratan vacíos.
 */
export function generarDatosInicialesUsuarioNuevo(baseData: DashboardData): DashboardData {
    return {
        ...baseData,
        habitos: habitosIniciales,
        tareas: tareasIniciales,
        notas: notasIniciales,
        proyectos: []
    };
}

/**
 * [18-08-2026] Paridad con WP (DashboardApiController + generateBackup): al
 * guardar como premium se intenta una copia de seguridad automática; el
 * backend aplica el intervalo de 30 minutos y descarta el exceso.
 */
export function dispararBackupAutomatico(esPremium: boolean): void {
    if (!esPremium) return;
    apiFetch('/backups', {method: 'POST', body: {trigger: 'auto'}}).catch(() => {});
}
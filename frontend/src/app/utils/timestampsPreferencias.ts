/*
 * utils/timestampsPreferencias.ts
 * [25-08-2026] Índice de timestamps por clave de preferencia (local-only).
 *
 * El blob de preferencias viaja como { clave: { valor, ts } } para que el merge
 * LWW (last-write-wins) por clave funcione entre navegadores: gana la clave con
 * el ts mayor, en el servidor (merge SQL) y al aplicar en el front.
 *
 * Este índice NO se sube: es metadata de sincronización local (cuándo se escribió
 * cada clave en ESTE navegador). Se actualiza al escribir (escribirClave) y en el
 * observador usePreferenciasServidor (writes directos de stores zustand persist).
 */

const CLAVE_INDICE = 'glory_prefs_ts';

/** Devuelve el ts (epoch ms) registrado para una clave, o undefined si nunca se registró. */
export function obtenerTs(clave: string): number | undefined {
    try {
        const indice: Record<string, unknown> = JSON.parse(localStorage.getItem(CLAVE_INDICE) || '{}');
        const ts = indice[clave];
        return typeof ts === 'number' ? ts : undefined;
    } catch {
        return undefined;
    }
}

/** Registra la escritura de una clave con ts = ahora (o el ts explícito, p. ej.
 * el del servidor al aplicar una descarga). Idempotente. */
export function registrarEscritura(clave: string, ts?: number): void {
    try {
        const indice: Record<string, unknown> = JSON.parse(localStorage.getItem(CLAVE_INDICE) || '{}');
        indice[clave] = ts ?? Date.now();
        localStorage.setItem(CLAVE_INDICE, JSON.stringify(indice));
    } catch {
        /* localStorage no disponible */
    }
}

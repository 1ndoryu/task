/*
 * utils/almacenamientoPreferencias.ts
 * [H-F15-01] Capa de acceso a localStorage para preferencias: lectura, escritura
 * y notificación intra/inter pestaña (extraída de preferenciasUsuario.ts).
 */

/* Eventos que usan los hooks/stores para reaccionar a cambios en la misma
 * pestaña (useLocalStorage) y entre pestañas (storage). */
const EVENTO_SYNC_LOCAL = '__glory_ls_update__';

/** Lee una clave de localStorage y devuelve su valor parseado (o undefined). */
export function leerClave(clave: string): unknown | undefined {
    try {
        const raw = localStorage.getItem(clave);
        if (raw === null) return undefined;
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

/** Escribe una clave en localStorage y notifica a hooks/stores de la pestaña. */
export function escribirClave(clave: string, valor: unknown): void {
    try {
        const serializado = JSON.stringify(valor);
        localStorage.setItem(clave, serializado);
        /* [233A-66] Mismo canal que useLocalStorage: actualiza instancias de la
         * misma pestaña; el evento 'storage' (nativo, cross-tab) también se
         * dispara solo en otras pestañas, así que emitimos el CustomEvent. */
        window.dispatchEvent(new CustomEvent(EVENTO_SYNC_LOCAL, {
            detail: {clave, valor: serializado}
        }));
        /* Los stores Zustand con persist (plugins, nav móvil, IA, etc.) escuchan
         * el evento nativo 'storage': un StorageEvent sintético en la misma
         * pestaña les rehidrata el estado sin recargar la página. */
        window.dispatchEvent(new StorageEvent('storage', {
            key: clave,
            newValue: serializado,
            storageArea: localStorage
        }));
    } catch (error) {
        console.warn(`[Preferencias] No se pudo escribir "${clave}":`, error);
    }
}

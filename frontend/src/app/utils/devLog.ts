/* [H-F12-03] Logger de depuración: los console.log de desarrollo no deben
 * salir en producción. Misma firma que console.log; sin operación fuera de DEV.
 * Los errores (console.error/warn) se mantienen con su canal nativo. */
export function devLog(...args: unknown[]): void {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
}

/* [H-F11-07] Avisos de fallbacks controlados: se observan en DEV pero no
 * ensucian producción. Los errores reales siguen usando console.error nativo. */
export function devWarn(...args: unknown[]): void {
    if (import.meta.env.DEV) {
        console.warn(...args);
    }
}

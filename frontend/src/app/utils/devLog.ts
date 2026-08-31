/* [H-F12-03] Logger de depuración: los console.log de desarrollo no deben
 * salir en producción. Misma firma que console.log; sin operación fuera de DEV.
 * Los errores (console.error/warn) se mantienen con su canal nativo.
 *
 * Delega en `./logger` (boundary declarado de console-production) para no
 * emitir `console.*` directo desde module de producción. */
import {log, logWarn} from './logger';

export function devLog(...args: unknown[]): void {
    log('dev', ...args);
}

export function devWarn(...args: unknown[]): void {
    if (import.meta.env.DEV) {
        logWarn('dev', ...args);
    }
}

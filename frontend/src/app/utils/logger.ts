/*
 * [console-production] Logger centralizado (boundary declarado en
 * sentinel.config.json › portableBoundaries.loggerModules).
 *
 * Toda llamada a `console.*` de la aplicación pasa por estos accesores:
 * las severidad error/warn se conservan con su canal nativo (instrumentación
 * legítima que ya llega al usuario por la vía de feedback del flujo), y log/
 * debug se silencian fuera de DEV para no ensuciar producción. Es la única
 * excepción documentada de la regla; los datos van precedidos de un prefijo
 * estable de módulo para poder filtrar en consola.
 *
 * Nombres logError/logWarn (no `error`/`warn`) para no colisionar con los
 * bindings locales `catch (error)` de los consumidores.
 */
export function logError(ambito: string, ...args: unknown[]): void {
    console.error(`[${ambito}]`, ...args);
}

export function logWarn(ambito: string, ...args: unknown[]): void {
    console.warn(`[${ambito}]`, ...args);
}

export function log(ambito: string, ...args: unknown[]): void {
    if (import.meta.env.DEV) {
        console.log(`[${ambito}]`, ...args);
    }
}

export function debug(ambito: string, ...args: unknown[]): void {
    if (import.meta.env.DEV) {
        console.debug(`[${ambito}]`, ...args);
    }
}

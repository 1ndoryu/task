/*
 * Utilidades para manejo de errores tipados
 * ErrorSilencioso: Error que no debe mostrarse al usuario (ej: 401 esperados)
 */

export class ErrorSilencioso extends Error {
    readonly silent = true;

    constructor(message: string) {
        super(message);
        this.name = 'ErrorSilencioso';
    }
}

/* Type guard para verificar si un error es silencioso */
export function esErrorSilencioso(error: unknown): error is ErrorSilencioso {
    return error instanceof ErrorSilencioso;
}

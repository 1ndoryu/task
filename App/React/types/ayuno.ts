/*
 * types/ayuno.ts
 * Tipos para el plugin de ayuno intermitente
 * Define estados, sesiones y configuración del tracker de ayuno
 */

/* Duración preconfigurada de ayuno (en horas) */
export type DuracionAyunoPreset = 14 | 16 | 18 | 20;

/* Estado del temporizador de ayuno */
export type EstadoAyuno = 'inactivo' | 'activo' | 'completado';

/* Sesión individual de ayuno registrada */
export interface SesionAyuno {
    id: string;
    inicio: number;
    fin: number | null;
    duracionObjetivoMs: number;
    completada: boolean;
    cancelada: boolean;
    tiempoEfectivoMs: number;
}

/* Configuración del plugin de ayuno */
export interface ConfiguracionAyuno {
    duracionHoras: number;
    duracionPersonalizadaMinutos?: number;
}

/* Estado persistido del store de ayuno */
export interface AyunoState {
    estado: EstadoAyuno;
    sesionActiva: {
        id: string;
        inicio: number;
        duracionObjetivoMs: number;
    } | null;
    historial: SesionAyuno[];
    ultimoAyunoCompletado: SesionAyuno | null;
}

/* Acciones del store de ayuno */
export interface AyunoActions {
    iniciarAyuno: (duracionHoras: number) => void;
    terminarAyuno: () => SesionAyuno | null;
    reiniciarAyuno: () => void;
    obtenerTiempoTranscurridoMs: () => number;
    obtenerUltimoAyuno: () => SesionAyuno | null;
}

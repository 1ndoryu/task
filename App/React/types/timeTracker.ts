/*
 * types/timeTracker.ts
 * Tipos para el sistema de Time Tracker
 * Permite rastrear tiempo dedicado a tareas y hábitos
 */

/*
 * Tipo de entidad que se está rastreando
 */
export type TipoEntidadTracker = 'tarea' | 'habito';

/*
 * Estado actual del tracker
 * activo: cronómetro corriendo
 * pausado: cronómetro detenido temporalmente
 * inactivo: sin tracking activo
 */
export type EstadoTracker = 'activo' | 'pausado' | 'inactivo';

/*
 * Registro de una pausa durante una sesión de tracking
 */
export interface PausaTracker {
    inicio: number; /* timestamp ms */
    fin?: number; /* timestamp ms, undefined si la pausa sigue activa */
}

/*
 * Sesión de tracking activa o completada
 */
export interface SesionTracking {
    id: string;
    entidadId: number;
    tipoEntidad: TipoEntidadTracker;
    nombreEntidad: string;
    inicio: number; /* timestamp ms */
    fin?: number; /* timestamp ms, undefined si sigue activa */
    pausas: PausaTracker[];
    /* Tiempo efectivo en ms (excluyendo pausas) */
    tiempoEfectivoMs: number;
    /* Tiempo mínimo objetivo en minutos (opcional) */
    tiempoMinimoMinutos?: number;
    completada: boolean;
    cancelada?: boolean;
}

/*
 * Estado persistible del store de tracking
 */
export interface TimeTrackerState {
    sesionActiva: SesionTracking | null;
    estado: EstadoTracker;
    /* Historial de sesiones completadas (últimas 50) */
    historialSesiones: SesionTracking[];
}

/*
 * Acciones del store de tracking
 */
export interface TimeTrackerActions {
    iniciarTracking: (entidadId: number, tipoEntidad: TipoEntidadTracker, nombreEntidad: string, tiempoMinimoMinutos?: number) => void;
    pausarTracking: () => void;
    reanudarTracking: () => void;
    completarTracking: () => SesionTracking | null;
    cancelarTracking: () => void;
    /* Calcula el tiempo efectivo actual en ms (sin pausas) */
    obtenerTiempoEfectivoActual: () => number;
    /* Limpia historial */
    limpiarHistorial: () => void;
}

/*
 * types/dashboard.ts
 * [H-F15-01] Barrel del dominio de tipos: re-exporta los módulos por dominio
 * (habito, tarea, proyecto, suscripcion, social) y conserva los tipos propios
 * del dashboard. Todos los importadores existentes siguen usando esta ruta.
 */

import type {Habito} from './habito';
import type {Tarea} from './tarea';
import type {Proyecto} from './proyecto';

export * from './habito';
export * from './tarea';
export * from './proyecto';
export * from './suscripcion';
export * from './social';

export interface DashboardData {
    habitos: Habito[];
    tareas: Tarea[];
    proyectos?: Proyecto[];
    notasIniciales?: string;
}

/*
 * Configuracion del Dashboard
 * Parametros ajustables para el comportamiento de habitos
 */
export interface ConfiguracionDashboard {
    /* Dias de inactividad maximos antes de resetear la racha */
    umbralReseteoRacha: number;
    /* Dias restantes para mostrar advertencia de perdida de racha */
    diasAdvertenciaRacha: number;
}

/*
 * Información de sincronización
 * Estado actual de la conexión con el servidor
 */
export interface SincronizacionInfo {
    sincronizado: boolean;
    pendiente: boolean;
    error: string | null;
    estaLogueado: boolean;
    sincronizarAhora: () => Promise<boolean>;
    onLogin?: () => void;
    onLogout?: () => void;
    cargandoDesdeServidor?: boolean;
}

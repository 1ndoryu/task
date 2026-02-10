/*
 * types/plugins.ts
 * Tipos para el sistema de plugins del dashboard
 * Permite definir, registrar y gestionar plugins opcionales
 */

import type {ReactNode} from 'react';
import type {NivelImportancia, FrecuenciaHabito} from './dashboard';

/*
 * Estado de activación de un plugin
 */
export type EstadoPlugin = 'activo' | 'inactivo';

/*
 * Configuración de hábito que un plugin puede crear automáticamente
 */
export interface ConfigHabitoPlugin {
    nombre: string;
    importancia: NivelImportancia;
    frecuencia: FrecuenciaHabito;
    descripcion?: string;
    icono?: string;
    /* Si el plugin maneja el completado automáticamente (ej: ayuno termina = completado) */
    completadoAutomatico?: boolean;
}

/*
 * Definición completa de un plugin
 */
export interface DefinicionPlugin {
    id: string;
    nombre: string;
    descripcion: string;
    icono: ReactNode;
    /* Versión del plugin */
    version: string;
    /* IDs de los paneles que registra este plugin */
    panelesIds: string[];
    /* Hábitos que se crean/pausan al activar/desactivar */
    habitos?: ConfigHabitoPlugin[];
    /* Si el plugin requiere configuración antes de activarse */
    requiereConfiguracion?: boolean;
}

/*
 * Estado persistido de plugins activos del usuario
 */
export interface EstadoPluginsUsuario {
    pluginsActivos: string[];
    /* Configuración específica por plugin */
    configuracionPlugins: Record<string, Record<string, unknown>>;
}

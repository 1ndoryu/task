/*
 * SidebarMenu — módulo compartido
 *
 * [300A-2] Tipos, constantes y utilidades sin estado de los módulos de hooks
 * del sidebar. Se separa de los hooks para que cada archivo de hook quede por
 * debajo del límite de useState (máx. 3) y de líneas (300), evitando que la
 * extracción de SidebarMenu vuelva a concentrar el estado en un solo archivo.
 */
import {Folder} from 'lucide-react';
import type {PanelId} from '../../hooks/useConfiguracionLayout';

/* Anchos mínimo y máximo del sidebar al arrastrar el borde (px) */
export const ANCHO_MIN = 56;
export const ANCHO_MAX = 320;
/* Umbral: al soltar por debajo de este ancho, encaja en colapsado */
export const UMBRAL_COLAPSAR = 72;

/** Estado del menú contextual de click derecho (paneles) */
export interface ContextMenuState {
    abierto: boolean;
    panelId: PanelId | null;
    x: number;
    y: number;
}

/** Estado del menú contextual de los grupos */
export interface ContextMenuGrupoState {
    abierto: boolean;
    grupo: string | null;
    x: number;
    y: number;
}

export interface UsuarioSidebar {
    usuario: string;
    avatarUrl?: string;
    version: string;
    suscripcion?: {plan?: string; estado?: string} | null;
    sincronizacion?: {onLogout?: () => void};
    onClickConfigUsuario?: () => void;
    onClickVersion?: () => void;
    onClickPlan?: () => void;
    onClickFeedback?: () => void;
    onExportarDatos?: () => void;
    onImportarDatos?: (archivo: File) => void;
}

/* Persistencia en localStorage con degradación tolerante (localStorage puede
 * no estar disponible en webviews/privacy). Devuelve el valor o default. */
export function leerGuardado<T>(clave: string, fallback: T, parsear: (raw: string) => T): T {
    try {
        const raw = localStorage.getItem(clave);
        if (raw) return parsear(raw);
    } catch {
        /* localStorage no disponible */
    }
    return fallback;
}

export {Folder};
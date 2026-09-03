/*
 * hooks/vistasDistribucion.ts
 * [029A-1] Lógica pura del Modo Vistas extraída de useConfiguracionVistas
 * para respetar limite-lineas (el hook quedaba en 302/300). Sin estado React:
 * distribución, factories por defecto y normalización/migración. El hook
 * (useConfiguracionVistas.ts) conserva solo estado + callbacks.
 */

import type {PanelId} from './useConfiguracionLayout';
import {
    type Vista, type CeldaVista, type ConfiguracionVistas,
    MAX_PANELES_VISTA, MAX_COLUMNAS_VISTA, MAX_FILAS_VISTA
} from '../types/vistas';

/* Clave de localStorage (se añade a CLAVES_PREFERENCIAS para persistencia BD) */
export const CLAVE_VISTAS = 'glory_config_vistas';

/* Paneles por defecto de la vista "Principal" (los 4 principales visibles) */
export const PANELES_VISTA_DEFECTO: PanelId[] = ['ejecucion', 'focoPrioritario', 'proyectos', 'scratchpad'];

/* Generar un id único corto */
export function generarIdVista(): string {
    return `vista-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* Generar un id de celda único */
export function generarIdCelda(): string {
    return `celda-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* Distribución por defecto según cantidad de paneles:
 *  1 → 1x1
 *  2 → 2 columnas (1x2)
 *  3 → 2 arriba + 1 abajo (2 filas, 2 cols; tercero ocupa toda la fila inferior)
 *  4 → 2x2
 * Devuelve las celdas + totalColumnas/totalFilas + proporciones. */
export function crearCeldasDistribucion(paneles: PanelId[]): {celdas: CeldaVista[]; totalColumnas: number; totalFilas: number} {
    const celdas: CeldaVista[] = [];
    const n = Math.min(paneles.length, MAX_PANELES_VISTA);
    const ids = paneles.slice(0, n);

    if (n <= 0) {
        return {celdas, totalColumnas: 1, totalFilas: 1};
    }

    if (n === 1) {
        celdas.push({id: generarIdCelda(), panelId: ids[0], columna: 1, fila: 1, ancho: 1, alto: 1});
        return {celdas, totalColumnas: 1, totalFilas: 1};
    }

    if (n === 2) {
        celdas.push({id: generarIdCelda(), panelId: ids[0], columna: 1, fila: 1, ancho: 1, alto: 1});
        celdas.push({id: generarIdCelda(), panelId: ids[1], columna: 2, fila: 1, ancho: 1, alto: 1});
        return {celdas, totalColumnas: 2, totalFilas: 1};
    }

    if (n === 3) {
        /* 2 arriba + 1 abajo (todo el ancho) */
        celdas.push({id: generarIdCelda(), panelId: ids[0], columna: 1, fila: 1, ancho: 1, alto: 1});
        celdas.push({id: generarIdCelda(), panelId: ids[1], columna: 2, fila: 1, ancho: 1, alto: 1});
        celdas.push({id: generarIdCelda(), panelId: ids[2], columna: 1, fila: 2, ancho: 2, alto: 1});
        return {celdas, totalColumnas: 2, totalFilas: 2};
    }

    /* n === 4: 2x2 */
    celdas.push({id: generarIdCelda(), panelId: ids[0], columna: 1, fila: 1, ancho: 1, alto: 1});
    celdas.push({id: generarIdCelda(), panelId: ids[1], columna: 2, fila: 1, ancho: 1, alto: 1});
    celdas.push({id: generarIdCelda(), panelId: ids[2], columna: 1, fila: 2, ancho: 1, alto: 1});
    celdas.push({id: generarIdCelda(), panelId: ids[3], columna: 2, fila: 2, ancho: 1, alto: 1});
    return {celdas, totalColumnas: 2, totalFilas: 2};
}

/* Crear la vista por defecto */
export function crearVistaDefecto(nombre = 'Principal'): Vista {
    const {celdas, totalColumnas, totalFilas} = crearCeldasDistribucion(PANELES_VISTA_DEFECTO);
    return {
        id: generarIdVista(),
        nombre,
        celdas,
        totalColumnas,
        totalFilas,
        proporcionesFilas: Array.from({length: totalFilas}, () => 1),
        proporcionesColumnas: Array.from({length: totalColumnas}, () => 1)
    };
}

/* Configuración por defecto */
export function crearConfigVistasDefecto(): ConfiguracionVistas {
    const principal = crearVistaDefecto();
    return {
        vistaActivaId: principal.id,
        vistas: [principal]
    };
}

/* Normalizar una vista (migración/saneado): garantiza invariantes:
 *  - máx MAX_PANELES_VISTA celdas
 *  - paneles existentes en el registro (o se descartan)
 *  - totalColumnas/totalFilas válidos
 *  - proporciones con longitud correcta */
export function normalizarVista(vista: Partial<Vista> | undefined, panelesRegistrados: string[]): Vista | null {
    if (!vista || !Array.isArray(vista.celdas)) return null;

    const celdas = (vista.celdas as CeldaVista[])
        .filter(c => c && typeof c.panelId === 'string' && panelesRegistrados.includes(c.panelId))
        .slice(0, MAX_PANELES_VISTA)
        .map(c => ({
            id: c.id || generarIdCelda(),
            panelId: c.panelId,
            columna: Math.max(1, Math.min(MAX_COLUMNAS_VISTA, Number(c.columna) || 1)),
            fila: Math.max(1, Math.min(MAX_FILAS_VISTA, Number(c.fila) || 1)),
            ancho: Math.max(1, Math.min(MAX_COLUMNAS_VISTA, Number(c.ancho) || 1)),
            alto: Math.max(1, Math.min(MAX_FILAS_VISTA, Number(c.alto) || 1))
        }));

    if (celdas.length === 0) return null;

    const totalColumnas = Math.max(1, Math.min(MAX_COLUMNAS_VISTA, Number(vista.totalColumnas) || 1));
    const totalFilas = Math.max(1, Math.min(MAX_FILAS_VISTA, Number(vista.totalFilas) || 1));

    const normProporciones = (arr: unknown, len: number): number[] => {
        if (!Array.isArray(arr) || arr.length !== len) return Array.from({length: len}, () => 1);
        return arr.slice(0, len).map((v: unknown) => {
            const num = Number(v);
            return Number.isFinite(num) && num > 0 ? Math.max(0.1, Math.min(10, num)) : 1;
        });
    };

    return {
        id: vista.id || generarIdVista(),
        nombre: typeof vista.nombre === 'string' && vista.nombre.trim() ? vista.nombre.slice(0, 40) : 'Vista',
        celdas,
        totalColumnas,
        totalFilas,
        proporcionesFilas: normProporciones(vista.proporcionesFilas, totalFilas),
        proporcionesColumnas: normProporciones(vista.proporcionesColumnas, totalColumnas)
    };
}

/* Normalizar la configuración completa */
export function normalizarConfiguracion(valor: unknown, panelesRegistrados: string[]): ConfiguracionVistas {
    const defecto = crearConfigVistasDefecto();

    if (!valor || typeof valor !== 'object') return defecto;

    const obj = valor as Record<string, unknown>;
    const vistas = Array.isArray(obj.vistas)
        ? (obj.vistas as unknown[]).map(v => normalizarVista(v as Partial<Vista>, panelesRegistrados)).filter((v): v is Vista => v !== null)
        : [];

    if (vistas.length === 0) return defecto;

    /* Si no hay celdas visibles en la vista activa, elegir la primera */
    let vistaActivaId = typeof obj.vistaActivaId === 'string' ? obj.vistaActivaId : defecto.vistaActivaId;
    if (!vistas.some(v => v.id === vistaActivaId)) {
        vistaActivaId = vistas[0].id;
    }

    return {vistaActivaId, vistas};
}

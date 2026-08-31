/*
 * types/vistas.ts
 *
 * Tipos del Modo Vistas (318A-2): dashboard con vistas configurables.
 *
 * Cada vista define un grid libre de hasta 4 paneles que llenan la pantalla.
 * La distribución se modela como un grid CSS con celdas que pueden fusionar
 * filas/columnas (rowSpan/colSpan): el usuario acomoda los paneles como quiera
 * (3 arriba + 1 abajo, 2x2, 1 grande + 2 chicos, etc.) y los paneles se
 * redimensionan y reordenan.
 */

import type {PanelId} from '../hooks/useConfiguracionLayout';

/* Máximo de paneles por vista (mismo límite que el modo sidebar) */
export const MAX_PANELES_VISTA = 4;

/* Número máximo de columnas del grid libre de una vista */
export const MAX_COLUMNAS_VISTA = 4;
export const MAX_FILAS_VISTA = 4;

/* Una celda del grid de la vista: qué panel ocupa qué área.
 * `columna` y `fila` son la posición base (1-indexada); `ancho` y `alto` son
 * cuántas columnas/filas ocupa la celda (fusiones → rowSpan/colSpan). */
export interface CeldaVista {
    id: string;
    panelId: PanelId;
    columna: number; // 1..MAX_COLUMNAS_VISTA
    fila: number; // 1..MAX_FILAS_VISTA
    ancho: number; // columnas que ocupa (colSpan)
    alto: number; // filas que ocupa (rowSpan)
}

/* Una vista del dashboard */
export interface Vista {
    id: string;
    nombre: string;
    /* Celdas del grid; máx MAX_PANELES_VISTA */
    celdas: CeldaVista[];
    /* Total de columnas y filas del grid de esta vista */
    totalColumnas: number;
    totalFilas: number;
    /* Proporciones (pesos) de redimensionamiento entre filas y columnas.
     * Cada elemento es un peso de la fila/columna i; el grid renderiza con
     * unidades `fr` (peso relativo a la suma). Longitud = totalFilas o
     * totalColumnas. Un handle de resize ajusta un PAR de pesos contiguos
     * (i e i+1) conservando la suma del par (rango 25-75 dentro del par). */
    proporcionesFilas: number[]; // pesos por fila (longitud totalFilas)
    proporcionesColumnas: number[]; // pesos por columna (longitud totalColumnas)
}

/* Configuración completa del modo vistas */
export interface ConfiguracionVistas {
    vistaActivaId: string;
    vistas: Vista[];
}

/* Tipo para crear una vista nueva (sin id) */
export interface VistaNueva {
    nombre: string;
    paneles: PanelId[];
}

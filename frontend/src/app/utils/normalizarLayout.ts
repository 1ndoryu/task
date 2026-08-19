/*
 * utils/normalizarLayout.ts
 * [H-F15-01] Normalización de posiciones de paneles (helper compartido entre
 * layoutLogica.ts y duplicadosPanel.ts).
 */

import type {OrdenPanel} from '../types/paneles';

/*
 * Normalizar posiciones dentro de una columna
 * Asegura que las posiciones sean consecutivas (0, 1, 2...)
 * Helper puro.
 */
export function normalizarPosiciones(paneles: OrdenPanel[]): OrdenPanel[] {
    const porColumna: Record<number, OrdenPanel[]> = {1: [], 2: [], 3: []};

    paneles.forEach(p => {
        porColumna[p.columna].push(p);
    });

    /* Ordenar cada columna por posición y reasignar índices */
    const resultado: OrdenPanel[] = [];
    [1, 2, 3].forEach(col => {
        porColumna[col]
            .sort((a, b) => a.posicion - b.posicion)
            .forEach((panel, idx) => {
                resultado.push({...panel, posicion: idx});
            });
    });

    return resultado;
}

/*
 * stores/habitos/normalizarHabitos.ts
 * [H-F11-01] Normalización de hábitos ante registros malformados.
 *
 * Por qué existe: una pestaña con código a medio refactor (o un write
 * concurrente) puede persistir en localStorage un hábito SIN campos
 * obligatorios (nombre/importancia). Al rehidratar, FilaHabito hacía
 * `habito.importancia.toUpperCase()` y tumbaba toda la isla con
 * "Cannot read properties of undefined (reading 'toUpperCase')".
 *
 * Invariante: tras pasar por normalizarHabitos, todo hábito tiene
 * nombre, importancia, frecuencia, tags, historialCompletados y
 * diasInactividad/racha numéricos. Los valores reales los repone el
 * servidor en el siguiente download; esto solo evita el crash y cura
 * el localStorage envenenado (mismo patrón que sanitizarSubhabitos).
 */

import type {Habito} from '../../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../../types/dashboard';

export interface ResultadoNormalizacion {
    habitos: Habito[];
    corregidos: number;
}

/* Niveles válidos de importancia. Si el registro trae algo fuera de este
 * set (o undefined), se usa 'Media' en lugar de reventar el render. */
const NIVELES_VALIDOS = new Set(['Muy Alta', 'Alta', 'Media', 'Baja', 'Muy Baja']);

export function normalizarHabitos(habitos: Habito[]): ResultadoNormalizacion {
    let corregidos = 0;
    const resultado = habitos.map(h => {
        if (!h || typeof h !== 'object' || typeof h.id !== 'number') {
            /* Registro basura sin id no se puede recuperar: se descarta. */
            corregidos++;
            return null;
        }

        const nombre = typeof h.nombre === 'string' && h.nombre.trim() ? h.nombre : `Hábito ${h.id}`;
        const importancia =
            typeof h.importancia === 'string' && NIVELES_VALIDOS.has(h.importancia) ? h.importancia : 'Media';
        const frecuencia = h.frecuencia ?? FRECUENCIA_POR_DEFECTO;
        const tags = Array.isArray(h.tags) ? h.tags : [];
        const historialCompletados = Array.isArray(h.historialCompletados) ? h.historialCompletados : [];
        const historialPospuestos = Array.isArray(h.historialPospuestos) ? h.historialPospuestos : [];
        const diasInactividad = typeof h.diasInactividad === 'number' ? h.diasInactividad : 0;
        const racha = typeof h.racha === 'number' ? h.racha : 0;
        const fechaCreacion = typeof h.fechaCreacion === 'string' && h.fechaCreacion ? h.fechaCreacion : new Date().toISOString().slice(0, 10);

        const corregido =
            nombre !== h.nombre ||
            importancia !== h.importancia ||
            frecuencia !== h.frecuencia ||
            tags !== h.tags ||
            historialCompletados !== h.historialCompletados ||
            historialPospuestos !== h.historialPospuestos ||
            diasInactividad !== h.diasInactividad ||
            racha !== h.racha ||
            fechaCreacion !== h.fechaCreacion;

        if (!corregido) return h;
        corregidos++;
        return {
            ...h,
            nombre,
            importancia,
            frecuencia,
            tags,
            historialCompletados,
            historialPospuestos,
            diasInactividad,
            racha,
            fechaCreacion
        };
    });

    const habitosValidos = resultado.filter((h): h is Habito => h !== null);
    return {habitos: habitosValidos, corregidos};
}

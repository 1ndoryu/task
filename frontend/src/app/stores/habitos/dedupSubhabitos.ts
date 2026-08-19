/*
 * stores/habitos/dedupSubhabitos.ts
 * [H-F11-01] Deduplicación/sanitización de subhábitos, extraída del god-store.
 * Se usa desde sliceCrud (setHabitos), onRehydrateStorage y el subscriber
 * global; antes había tres copias de esta lógica en el mismo archivo.
 */

import type {Habito, SubHabito} from '../../types/dashboard';

export interface ResultadoSanitizacion {
    habitos: Habito[];
    eliminados: number;
}

/* [044A-25] Sanitizar subhábitos al recibir datos (servidor o rehidratación):
 * 1. filtra sin nombre
 * 2. reasigna IDs colisionados (mismo ID distinto nombre)
 * 3. elimina duplicados verdaderos (mismo ID + mismo nombre)
 * 4. elimina duplicados por nombre (distinto ID pero mismo nombre)
 * 5. limita a 50
 * La dedup por nombre es necesaria porque Date.now() generó IDs únicos para
 * cientos de copias del mismo subhábito (arrastrar hábitos). */
export function sanitizarSubhabitos(habitos: Habito[]): ResultadoSanitizacion {
    let eliminados = 0;
    const resultado = habitos.map(h => {
        if (!h.subhabitos || h.subhabitos.length === 0) return h;

        /* Paso 1: resolver colisiones de ID */
        const conNombre = h.subhabitos.filter(sh => sh.nombre && sh.nombre.trim());
        const idsVistos = new Map<number, string>();
        const sinColisionId: SubHabito[] = [];
        for (const sh of conNombre) {
            const nombreExistente = idsVistos.get(sh.id);
            if (nombreExistente === undefined) {
                idsVistos.set(sh.id, sh.nombre);
                sinColisionId.push(sh);
            } else if (nombreExistente !== sh.nombre) {
                const nuevoId = Date.now() * 1000 + Math.floor(Math.random() * 1000) + sinColisionId.length;
                sinColisionId.push({...sh, id: nuevoId});
            }
            /* Mismo ID + mismo nombre = duplicado verdadero, se descarta */
        }

        /* Paso 2: dedup por nombre (conservar el primero con cada nombre) */
        const nombresVistos = new Set<string>();
        const unicos: SubHabito[] = [];
        for (const sh of sinColisionId) {
            const nombreNorm = sh.nombre.trim().toLowerCase();
            if (!nombresVistos.has(nombreNorm)) {
                nombresVistos.add(nombreNorm);
                unicos.push(sh);
            }
        }

        const final = unicos.slice(0, 50);
        if (final.length === h.subhabitos.length) return h;
        eliminados += h.subhabitos.length - final.length;
        return {...h, subhabitos: final};
    });
    return {habitos: resultado, eliminados};
}

/* [044A-27] Dedup ligera por nombre (subscriber global): sin reasignación de
 * IDs. Devuelve la misma referencia si no hay duplicados — no genera
 * re-renders innecesarios. */
export function limpiarSubhabitosDuplicados(habitos: Habito[]): Habito[] {
    return habitos.map(h => {
        if (!h.subhabitos || h.subhabitos.length <= 1) return h;
        const nombresVistos = new Set<string>();
        const limpio: SubHabito[] = [];
        for (const sh of h.subhabitos) {
            if (!sh.nombre || !sh.nombre.trim()) continue;
            const norm = sh.nombre.trim().toLowerCase();
            if (nombresVistos.has(norm)) continue;
            nombresVistos.add(norm);
            limpio.push(sh);
        }
        if (limpio.length === h.subhabitos.length) return h;
        return {...h, subhabitos: limpio};
    });
}

/*
 * utils/ciclosDependencias.ts
 * [H-F15-01] Detección de ciclos en dependencias condicionales (extraído de
 * dependencias.ts): valida que agregar nuevas dependencias no cree un ciclo.
 */

import type {Habito, ReferenciaDependencia, Tarea} from '../types/dashboard';

/**
 * Detecta si agregar nuevas dependencias crearia un ciclo.
 * Recibe el tipo e ID del elemento origen y las dependencias a evaluar.
 */
export function detectarCicloDependencias(
    tipoOrigen: 'tarea' | 'habito' | 'subhabito',
    idOrigen: number,
    padreIdOrigen: number | undefined,
    nuevasDependencias: ReferenciaDependencia[],
    tareas: Tarea[],
    habitos: Habito[]
): boolean {
    const origenKey = claveElemento(tipoOrigen, idOrigen, padreIdOrigen);
    const visitados = new Set<string>();

    function checkCiclo(deps: ReferenciaDependencia[]): boolean {
        for (const dep of deps) {
            const key = claveElemento(dep.tipo, dep.id, dep.padreId);

            if (key === origenKey) return true;
            if (visitados.has(key)) continue;
            visitados.add(key);

            const subDeps = obtenerDependenciasElemento(dep, tareas, habitos);
            if (subDeps.length > 0 && checkCiclo(subDeps)) {
                return true;
            }
        }
        return false;
    }

    return checkCiclo(nuevasDependencias);
}

function claveElemento(tipo: 'tarea' | 'habito' | 'subhabito', id: number, padreId?: number): string {
    if (tipo === 'subhabito') return `subhabito-${padreId}-${id}`;
    return `${tipo}-${id}`;
}

function obtenerDependenciasElemento(ref: ReferenciaDependencia, tareas: Tarea[], habitos: Habito[]): ReferenciaDependencia[] {
    if (ref.tipo === 'tarea') {
        return tareas.find(t => t.id === ref.id)?.dependencias || [];
    }

    if (ref.tipo === 'habito') {
        return habitos.find(h => h.id === ref.id)?.dependencias || [];
    }

    if (ref.tipo === 'subhabito') {
        const habito = habitos.find(h => h.id === ref.padreId);
        const subhabito = habito?.subhabitos?.find(sh => sh.id === ref.id);
        return subhabito?.dependencias || [];
    }

    return [];
}

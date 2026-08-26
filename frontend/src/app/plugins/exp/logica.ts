/*
 * plugins/exp/logica.ts
 * Lógica pura del plugin EXP (testeable sin React ni red):
 * - Curva: base por dificultad × multiplicador por importancia × tipo.
 * - Vida: derivada de incumplimientos reales (historial vs frecuencia).
 * - Niveles: umbral creciente.
 * - Dificultad automática: prompt IA + heurística de fallback.
 */

import type {Dificultad} from './types';
import type {NivelImportancia} from '../../types/dashboard';

/* ---- Curva de EXP ---- */

export const BASE_DIFICULTAD: Record<Dificultad, number> = {
    'Muy Baja': 1,
    'Baja': 2,
    'Media': 3,
    'Alta': 4,
    'Muy Alta': 5
};

export const MULT_IMPORTANCIA: Record<NivelImportancia, number> = {
    'Muy Baja': 0.5,
    'Baja': 0.75,
    'Media': 1,
    'Alta': 1.5,
    'Muy Alta': 2
};

export interface ParametrosExp {
    dificultad: Dificultad;
    importancia: NivelImportancia;
    multTipo: number;
}

/** EXP redondeada de una entidad: base(dificultad) × mult(importancia) × mult(tipo). */
export function calcularExp({dificultad, importancia, multTipo}: ParametrosExp): number {
    return Math.round(BASE_DIFICULTAD[dificultad] * MULT_IMPORTANCIA[importancia] * multTipo);
}

/* ---- Niveles ---- */

/** EXP acumulada necesaria para alcanzar el nivel N (N≥1). */
export function expNecesariaParaNivel(nivel: number, expBase: number): number {
    const n = Math.max(1, Math.floor(nivel));
    return Math.round(expBase * Math.pow(n, 1.5));
}

export interface EstadoNivel {
    nivel: number;
    expEnNivel: number;
    expParaSiguienteNivel: number;
}

/** Deriva el nivel y el progreso de la barra desde la EXP acumulada. */
export function calcularNivel(expTotal: number, expBase: number): EstadoNivel {
    let nivel = 1;
    let acumulado = 0;
    for (;;) {
        const costo = expNecesariaParaNivel(nivel, expBase);
        if (expTotal < acumulado + costo) break;
        acumulado += costo;
        nivel++;
        /* Tope de seguridad para exp absurdas (evita loop infinito). */
        if (nivel > 10_000) break;
    }
    const costoActual = expNecesariaParaNivel(nivel, expBase);
    return {
        nivel,
        expEnNivel: expTotal - acumulado,
        expParaSiguienteNivel: costoActual
    };
}

/* ---- Vida (derivada del historial real) ---- */

export interface HabitoParaVida {
    id: number;
    importancia: NivelImportancia;
    pausado?: boolean;
    frecuencia?: {tipo: string; cadaDias?: number; diasSemana?: string[]; vecesAlMes?: number} | null;
    historialCompletados: string[];
    historialPospuestos?: string[];
}

export interface ParametrosVida {
    vidaMaxima: number;
    penalizacionFraccion: number;
    ventanaDias: number;
    fechaHoy: string; /* YYYY-MM-DD local */
}

/**
 * Calcula la vida actual desde los incumplimientos REALES: para cada día de la
 * ventana, cada hábito que "debía cumplirse" (según frecuencia) y no está en
 * historialCompletados ni historialPospuestos ni pausado, penaliza.
 * `dificultades` es el mapa id→Dificultad (del store/payload).
 * La vida se recorre desde la máxima: `vida = vidaMaxima - penalizaciónTotal`,
 * con piso 0. Es determinista: mismos datos → mismo resultado (coherencia
 * multinavegador; el servidor podría replicarlo en fase 2).
 */
export function calcularVida(
    habitos: HabitoParaVida[],
    dificultades: Record<string, Dificultad>,
    params: ParametrosVida
): number {
    const hoy = new Date(params.fechaHoy + 'T12:00:00');
    let penalizacion = 0;

    for (let i = 0; i < params.ventanaDias; i++) {
        const dia = new Date(hoy);
        dia.setDate(dia.getDate() - i);
        const claveDia = isoLocal(dia);

        for (const habito of habitos) {
            if (habito.pausado) continue;
            if (habito.historialCompletados.includes(claveDia)) continue;
            if ((habito.historialPospuestos || []).includes(claveDia)) continue;
            if (!debioCumplirse(habito.frecuencia, claveDia)) continue;

            const dificultad = dificultades[String(habito.id)] ?? 'Media';
            const dano = (BASE_DIFICULTAD[dificultad] * MULT_IMPORTANCIA[habito.importancia]) * params.penalizacionFraccion;
            penalizacion += dano;
        }
    }

    return Math.max(0, Math.round(params.vidaMaxima - penalizacion));
}

function isoLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
}

/** ¿Este hábito debía cumplirse en la fecha dada según su frecuencia? */
export function debioCumplirse(
    frecuencia: HabitoParaVida['frecuencia'],
    fecha: string
): boolean {
    if (!frecuencia) return true; /* sin frecuencia = diario (legacy) */
    const tipo = frecuencia.tipo;
    if (tipo === 'diario') return true;

    const d = new Date(fecha + 'T12:00:00');
    if (tipo === 'cadaXDias') {
        const cada = Math.max(1, frecuencia.cadaDias ?? 1);
        /* Días desde época: cada X días es "debido" si el ordinal del día es
         * múltiplo de X. Aproximación estable por fecha. */
        const ordinal = Math.floor(d.getTime() / 86_400_000);
        return ordinal % cada === 0;
    }
    if (tipo === 'semanal') {
        /* semanal: se cumple un día por semana; sin día fijo se considera
         * "debido" cada 7 días desde el lunes. */
        const diaSemana = d.getDay(); /* 0=domingo */
        const diasDesdeLunes = (diaSemana + 6) % 7;
        return diasDesdeLunes === 0;
    }
    if (tipo === 'diasEspecificos') {
        const nombres = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const hoy = nombres[d.getDay()];
        return (frecuencia.diasSemana || []).includes(hoy);
    }
    if (tipo === 'mensual') {
        /* vecesAlMes: sin día fijo, se asume debido el día 1. */
        return d.getDate() === 1;
    }
    return true;
}

/* ---- Dificultad automática ---- */

/**
 * Prompt para estimar dificultad por IA. Devuelve SOLO JSON {dificultad}.
 * Se pasa a /api/ai/chat (admin, key en servidor) con un modelo barato.
 */
export function construirPromptDificultad(nombre: string, importancia: NivelImportancia, frecuenciaDesc: string, extras: string): string {
    return [
        'Eres un diseñador de hábitos/productividad. Estima la DIFICULTAD de mantener esta actividad como hábito.',
        'Usa esta escala exacta: Muy Baja, Baja, Media, Alta, Muy Alta.',
        'Considera: frecuencia exigida, importancia, complejidad implícita del nombre, duración probable, si depende de recursos externos.',
        'Responde SOLO con JSON válido, sin markdown ni explicación: {"dificultad":"Media"}',
        '',
        `Nombre: ${nombre}`,
        `Importancia: ${importancia}`,
        `Frecuencia: ${frecuenciaDesc}`,
        extras ? `Contexto extra: ${extras}` : ''
    ].filter(Boolean).join('\n');
}

/** Parsea la respuesta de la IA a una Dificultad válida (null si no parsea). */
export function parsearDificultadIA(respuesta: string): Dificultad | null {
    const limpiar = (s: string) => s.replace(/```json|```/g, '').trim();
    try {
        const datos = JSON.parse(limpiar(respuesta));
        const valor = String(datos?.dificultad ?? '').trim();
        return esDificultad(valor) ? valor : null;
    } catch {
        /* El modelo a veces devuelve solo la palabra; aceptarla si es válida. */
        const directa = limpiar(respuesta).replace(/[^A-Za-z ]/g, '').trim();
        return esDificultad(directa) ? directa : null;
    }
}

export function esDificultad(valor: string): valor is Dificultad {
    return valor === 'Muy Baja' || valor === 'Baja' || valor === 'Media' || valor === 'Alta' || valor === 'Muy Alta';
}

/** Fallback heurístico cuando la IA no responde (no bloquea la creación). */
export function dificultadHeuristica(importancia: NivelImportancia, esDiario: boolean, esComplejo: boolean): Dificultad {
    const base: Record<NivelImportancia, Dificultad> = {
        'Muy Baja': 'Baja',
        'Baja': 'Baja',
        'Media': 'Media',
        'Alta': 'Alta',
        'Muy Alta': 'Muy Alta'
    };
    let dificultad = base[importancia];
    if (esDiario && (importancia === 'Muy Alta' || importancia === 'Alta')) dificultad = subirNivel(dificultad);
    if (esComplejo) dificultad = subirNivel(dificultad);
    return dificultad;
}

export function subirNivel(d: Dificultad): Dificultad {
    const orden: Dificultad[] = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];
    const i = orden.indexOf(d);
    return i >= 0 && i < orden.length - 1 ? orden[i + 1] : d;
}

/*
 * plugins/exp/service.ts
 * Servicio del plugin EXP: estimación de dificultad por IA (reutiliza el proxy
 * /api/ai/chat del backend, key en servidor).
 *
 * NOTA de persistencia: el estado del plugin (vida, EXP, nivel, dificultades,
 * registros) se persiste vía el store Zustand `glory-exp` + el mecanismo LWW
 * existente de preferencias (CLAVES_PREFERENCIAS incluye 'glory-exp', ver
 * utils/preferenciasUsuario.ts). No hay PUT custom: el observador de
 * preferencias sube el blob y aplicaPreferenciasServidor restaura en navegador
 * nuevo — igual que ayuno/déficit.
 */

import type {Dificultad} from './types';
import {enviarMensajeLLM} from '../../services/iaService';
import {esUsuarioAdmin} from '../../utils/dashboardRuntime';
import {construirPromptDificultad, parsearDificultadIA, dificultadHeuristica} from './logica';

export interface EntidadParaDificultad {
    nombre: string;
    importancia: 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja';
    frecuenciaDesc: string;
    extras?: string;
}

/**
 * Estima la dificultad de una entidad usando el proxy IA del backend (admin).
 * Para usuarios no-admin sin proxy, usa la heurística (fase 1; la IA queda
 * limitada al admin como el resto de /ai/*). Nunca lanza: degrada a heurística
 * si la IA no responde (key ausente, 429, parseo fallido) para no bloquear.
 */
export async function estimarDificultad(entidad: EntidadParaDificultad): Promise<Dificultad> {
    if (!esUsuarioAdmin()) {
        return dificultadPorHeuristica(entidad);
    }
    try {
        const mensajes = [
            {role: 'system' as const, content: 'Eres un clasificador de dificultad de hábitos. Respondes solo JSON.'},
            {role: 'user' as const, content: construirPromptDificultad(entidad.nombre, entidad.importancia, entidad.frecuenciaDesc, entidad.extras ?? '')}
        ];
        /* Usa el modelo flash de groq (barato y rápido) vía el flujo existente. */
        const respuesta = await enviarMensajeLLM(mensajes, {
            proveedor: 'groq',
            modelo: 'groq/compound-mini'
        }, undefined, {temperature: 0.1, maxTokens: 64});
        const dificultad = parsearDificultadIA(respuesta.contenido);
        return dificultad ?? dificultadPorHeuristica(entidad);
    } catch {
        /* No bloquear la creación si la IA falla (key ausente, 429...). */
        return dificultadPorHeuristica(entidad);
    }
}

function dificultadPorHeuristica(entidad: EntidadParaDificultad): Dificultad {
    const esDiario = entidad.frecuenciaDesc.toLowerCase().includes('diario');
    const esComplejo = Boolean(entidad.extras && entidad.extras.length > 30);
    return dificultadHeuristica(entidad.importancia, esDiario, esComplejo);
}

/*
 * services/iaService.ts
 * Servicio para comunicación con LLM (Groq API / OpenAI-compatible)
 *
 * [233A-69] Fase 1: Estructura base del servicio.
 * Fase 2+3: Flujo completo con system prompt, acciones y parsing.
 */

import type {MensajeIA, AccionIA} from '../stores/iaStore';
import type {EjecutoresTareasIA} from '../config/accionesIA';
import {generarContexto, generarSystemPrompt, parsearRespuestaLLM, ejecutarAcciones} from '../config/accionesIA';

const URL_BASE_GROQ = 'https://api.groq.com/openai/v1/chat/completions';

/* [243A-4] Modelos más inteligentes disponibles en Groq (actualizado marzo 2026)
 * Orden: más capaz primero. Fuente: console.groq.com/docs/models */
export const MODELOS_IA = [
    {id: 'openai/gpt-oss-120b', nombre: 'GPT-OSS 120B — más inteligente (producción)'},
    {id: 'moonshotai/kimi-k2-instruct-0905', nombre: 'Kimi K2 — 262K contexto (preview)'},
    {id: 'meta-llama/llama-4-maverick-17b-128e-instruct', nombre: 'Llama 4 Maverick (preview)'},
    {id: 'qwen/qwen3-32b', nombre: 'Qwen3 32B (preview)'},
    {id: 'llama-3.3-70b-versatile', nombre: 'Llama 3.3 70B — rápido (producción)'},
    {id: 'meta-llama/llama-4-scout-17b-16e-instruct', nombre: 'Llama 4 Scout — ultrarrápido (preview)'}
] as const;

/* Mensaje para la API (formato OpenAI-compatible) */
export interface MensajeAPI {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/* Respuesta del LLM */
export interface RespuestaLLM {
    contenido: string;
    tokensPrompt: number;
    tokensComplecion: number;
}

/* Estimación simple de tokens (~4 chars = 1 token) */
export function estimarTokens(texto: string): number {
    return Math.ceil(texto.length / 4);
}

/*
 * Enviar mensajes al LLM via Groq API
 * Retorna el contenido de la respuesta + uso de tokens
 */
export async function enviarMensajeLLM(
    mensajes: MensajeAPI[],
    apiKey: string,
    modelo: string,
    signal?: AbortSignal
): Promise<RespuestaLLM> {
    if (!apiKey) {
        throw new Error('API Key de Groq no configurada. Ve a configuración del panel IA.');
    }

    const respuesta = await fetch(URL_BASE_GROQ, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelo,
            messages: mensajes,
            temperature: 0.7,
            max_completion_tokens: 2048
        }),
        signal
    });

    if (!respuesta.ok) {
        const errorTexto = await respuesta.text();
        if (respuesta.status === 401) {
            throw new Error('API Key inválida. Revisa tu configuración.');
        }
        if (respuesta.status === 429) {
            throw new Error('Límite de peticiones alcanzado. Intenta en unos segundos.');
        }
        throw new Error(`Error del servidor (${respuesta.status}): ${errorTexto}`);
    }

    const datos = await respuesta.json();
    const eleccion = datos.choices?.[0];

    if (!eleccion?.message?.content) {
        throw new Error('Respuesta vacía del modelo.');
    }

    return {
        contenido: eleccion.message.content,
        tokensPrompt: datos.usage?.prompt_tokens ?? 0,
        tokensComplecion: datos.usage?.completion_tokens ?? 0
    };
}

/*
 * [233A-69] Fase 2+3: Resultado completo del flujo IA
 */
export interface ResultadoMensajeIA {
    contenido: string;
    acciones: AccionIA[];
    tokensUsados: number;
}

/*
 * Flujo completo: system prompt → historial → API → parseo → ejecución
 * Extraído del hook para mantener usePanelIA bajo el límite de 120 líneas.
 */
export async function procesarMensajeIA(
    mensajes: MensajeIA[],
    apiKey: string,
    modelo: string,
    preferencias: string,
    ejecutoresTareas: EjecutoresTareasIA,
    signal?: AbortSignal
): Promise<ResultadoMensajeIA> {
    /* Generar system prompt con contexto actual de tareas/hábitos */
    const contexto = generarContexto(ejecutoresTareas.tareas);
    const systemPrompt = generarSystemPrompt(contexto, preferencias);

    /* Construir historial para la API (últimos 20 mensajes) */
    const historial: MensajeAPI[] = [
        {role: 'system', content: systemPrompt},
        ...mensajes.slice(-20).map(m => ({
            role: m.rol === 'usuario' ? 'user' as const : m.rol === 'asistente' ? 'assistant' as const : 'system' as const,
            content: m.contenido
        }))
    ];

    /* Llamar al LLM */
    const respuesta = await enviarMensajeLLM(historial, apiKey, modelo, signal);

    /* Parsear respuesta JSON con acciones */
    const parsed = parsearRespuestaLLM(respuesta.contenido);

    /* Ejecutar acciones si hay */
    let accionesResultado: AccionIA[] = [];
    if (parsed.acciones.length > 0) {
        const resultados = ejecutarAcciones(parsed.acciones, ejecutoresTareas);
        accionesResultado = resultados.map((r, i) => ({
            tipo: parsed.acciones[i].tipo,
            parametros: parsed.acciones[i].parametros,
            ejecutada: r.exito,
            resultado: r.descripcion
        }));
    }

    return {
        contenido: parsed.respuesta,
        acciones: accionesResultado,
        tokensUsados: respuesta.tokensPrompt + respuesta.tokensComplecion
    };
}

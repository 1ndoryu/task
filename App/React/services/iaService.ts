/*
 * services/iaService.ts
 * Servicio para comunicación con LLM (Groq API / OpenAI-compatible)
 *
 * [233A-69] Fase 1: Estructura base del servicio.
 * Envía mensajes al LLM y retorna la respuesta con métricas de tokens.
 * La lógica de acciones se agrega en Fase 3.
 */

const URL_BASE_GROQ = 'https://api.groq.com/openai/v1/chat/completions';

/* Modelos disponibles en Groq */
export const MODELOS_IA = [
    {id: 'meta-llama/llama-4-scout-17b-16e-instruct', nombre: 'Llama 4 Scout'},
    {id: 'meta-llama/llama-4-maverick-17b-128e-instruct', nombre: 'Llama 4 Maverick'},
    {id: 'qwen/qwen3-32b', nombre: 'Qwen3 32B'},
    {id: 'deepseek-r1-distill-llama-70b', nombre: 'DeepSeek R1 70B'},
    {id: 'llama-3.3-70b-versatile', nombre: 'Llama 3.3 70B'},
    {id: 'gemma2-9b-it', nombre: 'Gemma 2 9B'}
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

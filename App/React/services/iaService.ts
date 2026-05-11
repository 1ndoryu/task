/*
 * services/iaService.ts
 * Servicio para comunicación con LLM (Groq API / OpenAI-compatible)
 *
 * [233A-69] Fase 1: Estructura base del servicio.
 * Fase 2+3: Flujo completo con system prompt, acciones y parsing.
 */

import type {MensajeIA, AccionIA, ProveedorIA} from '../stores/iaStore';
import type {EjecutoresTareasIA} from '../config/accionesIA';
import {generarContexto, generarSystemPrompt, parsearRespuestaLLM, ejecutarAcciones} from '../config/accionesIA';
import {esUsuarioAdmin, obtenerApiUrlWP, obtenerNonceWP} from '../utils/dashboardRuntime';

const URLS_PROVIDER: Record<ProveedorIA, string> = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions'
};

export interface ModeloIA {
    id: string;
    nombre: string;
    proveedor: ProveedorIA;
}

export const PROVEEDORES_IA: Array<{id: ProveedorIA; nombre: string; descripcion: string}> = [
    {id: 'groq', nombre: 'Groq', descripcion: 'Modelos rápidos y producción por defecto'},
    {id: 'deepseek', nombre: 'DeepSeek', descripcion: 'DeepSeek Chat y Reasoner'}
];

/* [243A-4] Modelos más inteligentes disponibles en Groq (actualizado marzo 2026)
 * Orden: más capaz primero. Fuente: console.groq.com/docs/models */
export const MODELOS_IA = [
    {id: 'openai/gpt-oss-120b', nombre: 'GPT-OSS 120B — más inteligente (Groq)', proveedor: 'groq'},
    {id: 'moonshotai/kimi-k2-instruct-0905', nombre: 'Kimi K2 — 262K contexto (Groq)', proveedor: 'groq'},
    {id: 'meta-llama/llama-4-maverick-17b-128e-instruct', nombre: 'Llama 4 Maverick (Groq)', proveedor: 'groq'},
    {id: 'qwen/qwen3-32b', nombre: 'Qwen3 32B (Groq)', proveedor: 'groq'},
    {id: 'llama-3.3-70b-versatile', nombre: 'Llama 3.3 70B — rápido (Groq)', proveedor: 'groq'},
    {id: 'meta-llama/llama-4-scout-17b-16e-instruct', nombre: 'Llama 4 Scout — flash (Groq)', proveedor: 'groq'},
    {id: 'deepseek-chat', nombre: 'DeepSeek Chat — flash', proveedor: 'deepseek'},
    {id: 'deepseek-reasoner', nombre: 'DeepSeek Reasoner', proveedor: 'deepseek'}
] as const;

export const MODELO_FLASH_POR_PROVEEDOR: Record<ProveedorIA, string> = {
    groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
    deepseek: 'deepseek-chat'
};

export interface ConfigProveedorIA {
    proveedor: ProveedorIA;
    apiKey?: string;
    modelo: string;
}

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

export interface OpcionesLLM {
    temperature?: number;
    maxTokens?: number;
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
    config: ConfigProveedorIA,
    signal?: AbortSignal,
    opciones: OpcionesLLM = {}
): Promise<RespuestaLLM> {
    if (!config.apiKey && esUsuarioAdmin()) {
        return enviarMensajeLLMBackend(mensajes, config, signal, opciones);
    }

    if (!config.apiKey) {
        throw new Error('API key no configurada. Ve a Configuración → Asistente IA.');
    }

    const body: Record<string, unknown> = {
        model: config.modelo,
        messages: mensajes,
        temperature: opciones.temperature ?? 0.7
    };
    if (config.proveedor === 'groq') {
        body.max_completion_tokens = opciones.maxTokens ?? 2048;
    } else {
        body.max_tokens = opciones.maxTokens ?? 2048;
    }

    const respuesta = await fetch(URLS_PROVIDER[config.proveedor], {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body),
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

async function enviarMensajeLLMBackend(mensajes: MensajeAPI[], config: ConfigProveedorIA, signal?: AbortSignal, opciones: OpcionesLLM = {}): Promise<RespuestaLLM> {
    const respuesta = await fetch(`${obtenerApiUrlWP()}/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': obtenerNonceWP()
        },
        body: JSON.stringify({
            provider: config.proveedor,
            model: config.modelo,
            messages: mensajes,
            temperature: opciones.temperature ?? 0.7,
            maxTokens: opciones.maxTokens ?? 2048
        }),
        signal
    });

    const datos = await respuesta.json().catch(() => null) as {success?: boolean; data?: RespuestaLLM; error?: {message?: string}} | null;
    if (!respuesta.ok || !datos?.success || !datos.data) {
        throw new Error(datos?.error?.message || `Error del servidor IA (${respuesta.status})`);
    }
    return datos.data;
}

export function obtenerApiKeyParaProveedor(proveedor: ProveedorIA, apiKeyGroq: string, apiKeyDeepseek: string): string {
    return proveedor === 'deepseek' ? apiKeyDeepseek : apiKeyGroq;
}

export function proveedorTieneCredenciales(proveedor: ProveedorIA, apiKeyGroq: string, apiKeyDeepseek: string): boolean {
    return Boolean(obtenerApiKeyParaProveedor(proveedor, apiKeyGroq, apiKeyDeepseek)) || esUsuarioAdmin();
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
    config: ConfigProveedorIA,
    preferencias: string,
    promptSistema: string,
    ejecutoresTareas: EjecutoresTareasIA,
    signal?: AbortSignal
): Promise<ResultadoMensajeIA> {
    /* Generar system prompt con contexto actual de tareas/hábitos */
    const contexto = generarContexto(ejecutoresTareas.tareas);
    const systemPrompt = generarSystemPrompt(contexto, preferencias, promptSistema);

    /* Construir historial para la API (últimos 20 mensajes) */
    const historial: MensajeAPI[] = [
        {role: 'system', content: systemPrompt},
        ...mensajes.slice(-20).map(m => ({
            role: m.rol === 'usuario' ? 'user' as const : m.rol === 'asistente' ? 'assistant' as const : 'system' as const,
            content: m.contenido
        }))
    ];

    /* Llamar al LLM */
    const respuesta = await enviarMensajeLLM(historial, config, signal);

    /* Parsear respuesta JSON con acciones */
    const parsed = parsearRespuestaLLM(respuesta.contenido);

    /* Ejecutar acciones si hay */
    let accionesResultado: AccionIA[] = [];
    if (parsed.acciones.length > 0) {
        const resultados = await ejecutarAcciones(parsed.acciones, ejecutoresTareas);
        accionesResultado = resultados.map((r, i) => ({
            tipo: parsed.acciones[i].tipo,
            parametros: parsed.acciones[i].parametros,
            ejecutada: r.exito,
            resultado: r.descripcion,
            pendienteConfirmacion: r.pendienteConfirmacion,
            accionExternaId: r.accionExternaId
        }));
    }

    return {
        contenido: parsed.respuesta,
        acciones: accionesResultado,
        tokensUsados: respuesta.tokensPrompt + respuesta.tokensComplecion
    };
}

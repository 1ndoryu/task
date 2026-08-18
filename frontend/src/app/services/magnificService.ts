import {obtenerApiUrlWP, obtenerNonceWP} from '../utils/dashboardRuntime';

export type ModoMagnific = 'creative' | 'precision';

export interface OpcionesMagnific {
    mode: ModoMagnific;
    image: string;
    /* scale_factor: string para creative ('2x', '4x'…), number para precision (2, 4, 8, 16) */
    scale_factor: string | number;
    optimized_for: string;
    engine: string;
    prompt: string;
    creativity: number;
    hdr: number;
    resemblance: number;
    fractality: number;
    sharpen: number;
    smart_grain: number;
    ultra_detail: number;
    filter_nsfw: boolean;
    flavor: string;
}

export interface RespuestaMagnific {
    data?: {
        task_id?: string;
        id?: string;
        status?: string;
        generated?: string | string[];
        [key: string]: unknown;
    };
    task_id?: string;
    id?: string;
    status?: string;
    generated?: string | string[];
    [key: string]: unknown;
}

interface RespuestaApi<T> {
    success: boolean;
    data?: T;
    error?: {message?: string};
}

async function fetchMagnific<T>(url: string, opciones: RequestInit): Promise<T> {
    const respuesta = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': obtenerNonceWP(),
            ...opciones.headers
        },
        ...opciones
    });

    const datos = await respuesta.json().catch(() => null) as RespuestaApi<T> | null;
    if (!respuesta.ok || !datos?.success || !datos.data) {
        throw new Error(datos?.error?.message || `Error Magnific (${respuesta.status})`);
    }
    return datos.data;
}

export const magnificService = {
    iniciar(opciones: OpcionesMagnific): Promise<RespuestaMagnific> {
        return fetchMagnific<RespuestaMagnific>(`${obtenerApiUrlWP()}/magnific/upscale`, {
            method: 'POST',
            body: JSON.stringify(opciones)
        });
    },

    estado(taskId: string, mode: ModoMagnific): Promise<RespuestaMagnific> {
        const params = new URLSearchParams({mode});
        return fetchMagnific<RespuestaMagnific>(`${obtenerApiUrlWP()}/magnific/upscale/${encodeURIComponent(taskId)}?${params.toString()}`, {
            method: 'GET'
        });
    }
};

export function extraerTaskId(respuesta: RespuestaMagnific): string {
    return respuesta.data?.task_id || respuesta.data?.id || respuesta.task_id || respuesta.id || '';
}

export function extraerEstado(respuesta: RespuestaMagnific): string {
    return respuesta.data?.status || respuesta.status || 'pending';
}

export function extraerImagenGenerada(respuesta: RespuestaMagnific): string {
    const generada = respuesta.data?.generated || respuesta.generated || '';
    return Array.isArray(generada) ? (generada[0] || '') : generada;
}

/**
 * Estima el costo en euros basado en el área del output (pixeles de salida).
 * Fuente: Magnific pricing docs (tiers por megapíxeles de output).
 */
export function calcularCostoEstimado(ancho: number, alto: number, scaleFactor: number): number {
    const outputMP = (ancho * scaleFactor * alto * scaleFactor) / 1_000_000;
    if (outputMP <= 4) return 0.10;
    if (outputMP <= 10) return 0.20;
    if (outputMP <= 16) return 0.40;
    if (outputMP <= 22) return 0.50;
    return Number((outputMP * 0.025).toFixed(2));
}
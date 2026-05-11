import {obtenerApiUrlWP, obtenerNonceWP} from '../utils/dashboardRuntime';

export type ModoMagnific = 'creative' | 'precision';

export interface OpcionesMagnific {
    mode: ModoMagnific;
    image: string;
    scale_factor: string;
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
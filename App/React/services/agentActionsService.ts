import {obtenerApiUrlWP, obtenerNonceWP} from '../utils/dashboardRuntime';

export interface AccionAgente {
    id: number;
    tipo: string;
    titulo: string;
    estado: string;
    requiere_aprobacion: boolean;
    payload: Record<string, unknown>;
    resultado: unknown;
}

interface RespuestaApi<T> {
    success?: boolean;
    data?: T;
    error?: {message?: string};
}

async function requestAgente<T>(path: string, init: RequestInit = {}): Promise<T> {
    const respuesta = await fetch(`${obtenerApiUrlWP()}${path}`, {
        credentials: 'include',
        ...init,
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': obtenerNonceWP(),
            ...(init.headers || {})
        }
    });

    const datos = await respuesta.json().catch(() => null) as RespuestaApi<T> | null;
    if (!respuesta.ok || !datos?.success || datos.data === undefined) {
        throw new Error(datos?.error?.message || `Error del agente (${respuesta.status})`);
    }
    return datos.data;
}

export async function proponerWhatsapp(message: string, to?: string): Promise<AccionAgente> {
    const data = await requestAgente<{accion: AccionAgente}>('/agent/actions/whatsapp', {
        method: 'POST',
        body: JSON.stringify({message, to})
    });
    return data.accion;
}

export async function aprobarAccionAgente(id: number): Promise<AccionAgente> {
    const data = await requestAgente<{accion: AccionAgente}>(`/agent/actions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({})
    });
    return data.accion;
}

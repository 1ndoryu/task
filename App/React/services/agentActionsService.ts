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

export interface MensajeAgentePersistido {
    id: number;
    sessionId: string;
    rol: 'usuario' | 'asistente' | 'sistema';
    contenido: string;
    acciones?: unknown[] | null;
    tokens: number;
    fechaCreacion: string | null;
}

export interface ResultadoResearchLocal {
    provider: 'local';
    query: string;
    results: Array<{tipo: string; id: number; titulo: string; resumen: string; score: number; fecha?: string | null}>;
}

interface RespuestaApi<T> {
    success?: boolean;
    data?: T;
    error?: {message?: string};
}

async function requestAgente<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const respuesta = await fetch(`${obtenerApiUrlWP()}${path}`, {
        credentials: 'include',
        ...init,
        signal,
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

export async function proponerGithub(title: string, description: string, kind = 'issue', repo?: string): Promise<AccionAgente> {
    const data = await requestAgente<{accion: AccionAgente}>('/agent/actions/github', {
        method: 'POST',
        body: JSON.stringify({title, description, kind, repo})
    });
    return data.accion;
}

export async function proponerRecordatorio(title: string, message: string, scheduledAt: string): Promise<AccionAgente> {
    const data = await requestAgente<{accion: AccionAgente}>('/agent/actions/reminder', {
        method: 'POST',
        body: JSON.stringify({title, message, scheduledAt})
    });
    return data.accion;
}

export async function buscarResearchLocal(query: string, limit = 10): Promise<ResultadoResearchLocal> {
    return requestAgente<ResultadoResearchLocal>('/agent/research', {
        method: 'POST',
        body: JSON.stringify({query, limit})
    });
}

export async function listarMensajesAgente(sessionId: string, signal?: AbortSignal): Promise<MensajeAgentePersistido[]> {
    const data = await requestAgente<{mensajes: MensajeAgentePersistido[]}>(`/agent/chat/messages?sessionId=${encodeURIComponent(sessionId)}`, {}, signal);
    return data.mensajes;
}

export async function guardarMensajeAgente(params: {
    sessionId: string;
    rol: 'usuario' | 'asistente' | 'sistema';
    contenido: string;
    acciones?: unknown[];
    tokens?: number;
}): Promise<MensajeAgentePersistido> {
    const data = await requestAgente<{mensaje: MensajeAgentePersistido}>('/agent/chat/messages', {
        method: 'POST',
        body: JSON.stringify(params)
    });
    return data.mensaje;
}

export async function limpiarMensajesAgente(sessionId: string): Promise<number> {
    const data = await requestAgente<{deleted: number}>(`/agent/chat/messages?sessionId=${encodeURIComponent(sessionId)}`, {method: 'DELETE'});
    return data.deleted;
}

export async function ejecutarAnalisisActivo(force = false): Promise<{created: number; acciones?: AccionAgente[]; skipped?: boolean}> {
    return requestAgente<{created: number; acciones?: AccionAgente[]; skipped?: boolean}>('/agent/analyze', {
        method: 'POST',
        body: JSON.stringify({force})
    });
}

export async function aprobarAccionAgente(id: number): Promise<AccionAgente> {
    const data = await requestAgente<{accion: AccionAgente}>(`/agent/actions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({})
    });
    return data.accion;
}

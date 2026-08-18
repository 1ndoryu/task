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

/* [107A] Resultado de búsqueda web (Tavily o Serper) */
export interface ResultadoResearchWeb {
    provider: 'tavily' | 'serper';
    query: string;
    results: Array<{tipo: 'web'; titulo: string; url: string; resumen: string; score: number}>;
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

export interface NotaCompleta {
    id: number;
    titulo: string;
    contenido: string;
    carpetaId: number | null;
    fechaCreacion: string | null;
    fechaModificacion: string | null;
}

export async function leerNota(id: number): Promise<NotaCompleta> {
    return requestAgente<NotaCompleta>(`/notas/${id}`);
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
        body: JSON.stringify({query, limit, type: 'local'})
    });
}

/* [107A] Búsqueda web vía Tavily (primario) + Serper (fallback en 429). */
export async function buscarResearchWeb(query: string, limit = 5): Promise<ResultadoResearchWeb> {
    return requestAgente<ResultadoResearchWeb>('/agent/research', {
        method: 'POST',
        body: JSON.stringify({query, limit, type: 'web'})
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

/* [125A-8] Acción automejora: modifica el código del propio agente (glorytemplate,
 * rama glory-react-logic). Se usa desde el LLM vía el system prompt; el backend
 * crea un opencode_job con commit=true y deploy condicional al nivel de riesgo.
 * No necesita función TypeScript específica porque el flujo es server-side:
 *   LLM → AgentChatProcessor → OpencodeJobService → runner → OpenCode. */

/* [106A] Actualiza el campo `acciones` de un mensaje ya persistido. Necesario para que
 * confirmar/rechazar acciones pendientes sobreviva un re-mount del panel. */
export async function actualizarAccionesMensajeAgente(id: number, acciones: unknown[]): Promise<MensajeAgentePersistido> {
    const data = await requestAgente<{mensaje: MensajeAgentePersistido}>(`/agent/chat/messages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({acciones})
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

/*
 * plugins/agente/service.ts
 * Servicio del plugin de agente de IA (plan-agente-ia-plugin, Fase 4).
 * Habla con el backend real: CRUD de conversaciones (tabs), historial
 * persistido y stream SSE /api/agente/stream con eventos tipados.
 * No simula nada: si el backend no responde, lanza con el mensaje real.
 */

import {apiFetch} from '../../utils/apiClient';
import {obtenerTokenCsrf} from '../../utils/apiClient';

export type ModoAgente = 'predeterminado' | 'meta' | 'autonomo';

export interface ConversacionAgente {
    id: string;
    titulo: string;
    modo: ModoAgente;
}

export interface MensajeConversacion {
    id: number;
    rol: 'user' | 'assistant' | 'system' | 'tool';
    contenido: string;
    creadoEn: string;
}

/* Eventos del contrato SSE (src/handlers/agente.rs + src/agent/runtime.rs). */
export type EventoAgente =
    | {tipo: 'token'; texto: string}
    | {tipo: 'tool_start'; tool: string; argumentos: unknown}
    | {tipo: 'tool_result'; tool: string; ok: boolean; resumen: string}
    | {tipo: 'usage'; tokens_prompt?: number; tokens_complecion?: number; ocupacion_pct?: number | null}
    | {tipo: 'requiere_aprobacion'; tool: string; argumentos: unknown}
    | {tipo: 'error'; mensaje: string; retryable: boolean}
    | {tipo: 'done'; turno_id: string};

/* ---------- Conversaciones (tabs) ---------- */

export async function listarConversaciones(): Promise<ConversacionAgente[]> {
    return apiFetch<ConversacionAgente[]>('/agente/conversaciones');
}

export async function crearConversacion(titulo: string, modo: ModoAgente): Promise<ConversacionAgente> {
    return apiFetch<ConversacionAgente>('/agente/conversaciones', {
        method: 'POST',
        body: {titulo, modo},
    });
}

export async function renombrarConversacion(id: string, titulo: string): Promise<ConversacionAgente> {
    return apiFetch<ConversacionAgente>(`/agente/conversaciones/${id}`, {
        method: 'PUT',
        body: {titulo},
    });
}

export async function eliminarConversacion(id: string): Promise<void> {
    await apiFetch<void>(`/agente/conversaciones/${id}`, {method: 'DELETE'});
}

/* ---------- Historial (persistencia en servidor) ---------- */

export async function cargarHistorial(id: string): Promise<MensajeConversacion[]> {
    return apiFetch<MensajeConversacion[]>(`/agente/conversaciones/${id}`);
}

/* ---------- Stream SSE ---------- */

/**
 * Envía un mensaje y consume el stream SSE del backend. `onEvento` se llama
 * por cada evento tipado; `onError` con el error real del backend. Devuelve
 * una promesa que resuelve al terminar (evento done) o con el error.
 */
export async function enviarMensajeAgente(
    conversacionId: string,
    mensaje: string,
    onEvento: (evento: EventoAgente) => void,
    signal?: AbortSignal,
    modelo?: string,
): Promise<void> {
    const respuesta = await fetch('/api/agente/stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': obtenerTokenCsrf(),
        },
        body: JSON.stringify({conversacionId, mensaje, ...(modelo ? {modelo} : {})}),
        signal,
    });

    if (!respuesta.ok) {
        let mensajeError = `Error del agente (${respuesta.status})`;
        try {
            const datos = await respuesta.json();
            if (datos?.message) mensajeError = datos.message;
        } catch {
            /* cuerpo no JSON: usar el mensaje genérico */
        }
        throw new Error(mensajeError);
    }
    if (!respuesta.body) {
        throw new Error('El servidor no devolvió un cuerpo de stream');
    }

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let buffer = '';

    try {
        for (;;) {
            const {done, value} = await lector.read();
            if (done) break;
            buffer += decodificador.decode(value, {stream: true});
            /* Los eventos SSE llegan como `data: {json}\n\n`. */
            const bloques = buffer.split('\n\n');
            buffer = bloques.pop() ?? '';
            for (const bloque of bloques) {
                const linea = bloque.split('\n').find(l => l.startsWith('data:'));
                if (!linea) continue;
                const datos = linea.slice(5).trim();
                if (!datos) continue;
                try {
                    onEvento(JSON.parse(datos) as EventoAgente);
                } catch {
                    /* línea no JSON del proveedor: ignorar (igual que el E2E) */
                }
            }
        }
    } finally {
        lector.releaseLock();
    }
}

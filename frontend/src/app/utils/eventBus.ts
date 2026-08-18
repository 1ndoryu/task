/*
 * EventBus ligero para eventos de tiempo real.
 * [18-08-2026] Conecta el WebSocket (/api/realtime/ws) con los consumidores
 * locales (chat/timeline): cuando llega un evento de timeline, useMensajes se
 * entera y recarga, sin acoplar el hook de WS a la UI.
 */

export interface EventoRealtime {
    tipo: 'timeline';
    itemType: 'tarea' | 'proyecto' | 'habito';
    itemId: number;
    [clave: string]: unknown;
}

type Handler = (evento: EventoRealtime) => void;

const handlers = new Set<Handler>();

export function publicarEvento(evento: EventoRealtime): void {
    for (const handler of handlers) {
        try {
            handler(evento);
        } catch {
            /* Un handler roto no debe cortar el resto */
        }
    }
}

export function suscribirEvento(handler: Handler): () => void {
    handlers.add(handler);
    return () => handlers.delete(handler);
}

/* [039A-1/FASE-FINAL] Ayudas puras del store del agente (ids, mapeos,
 * config efectiva), extraídas de `store.ts`. Sin acceso al store. */
import type {ConfigAgente, MensajeConversacion} from './service';
import type {EstadoAgente, MensajeTabAgente, TabAgente} from './tiposAgente';

export function generarIdLocal(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* Clave de idempotencia del turno (UUID v4 del cliente). El backend usa
 * `ON CONFLICT (conversacion_id, user_id, clave_idempotencia) DO NOTHING`; por
 * eso la clave debe ser estable para el mismo turno y única entre turnos. */
export function generarClaveIdempotencia(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40; // variante 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80; // range 10xx
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function tabDe(estado: EstadoAgente, id: string): TabAgente | undefined {
    return estado.tabs.find(t => t.conversacion.id === id);
}

/* [039A-2] Convierte un mensaje del historial del servidor a mensaje de tab,
 * conservando las tarjetas de tools y el contexto restaurados por el backend
 * (antes se mapeaban solo id/rol/contenido y todo se perdía al recargar).
 * El `diff` nunca viajó persistido: las tarjetas restauradas muestran
 * resumen + argumentos (suficiente para ver el cambio específico). */
export function aMensajeTab(h: MensajeConversacion): MensajeTabAgente {
    const herramientas = (h.herramientas ?? []).map(t => ({
        tool: t.tool,
        ok: t.ok,
        resumen: t.resumen,
        argumentos: t.argumentos,
    }));
    const base: MensajeTabAgente = {
        id: `db-${h.id}`,
        rol: h.rol === 'user' ? 'user' as const : 'assistant' as const,
        contenido: h.contenido,
    };
    if (herramientas.length > 0) base.herramientas = herramientas;
    if (h.contexto) {
        base.contexto = {
            /* La ocupación % no se persistió por turno: null (el front deriva
             * el % en la barra inferior desde tokens/maxVentana). */
            ocupacionPct: null,
            tokensPrompt: h.contexto.tokens_prompt ?? 0,
            tokensComplecion: h.contexto.tokens_complecion ?? 0,
            skills: 0,
            provider: h.contexto.provider ?? null,
            modelo: h.contexto.modelo ?? null,
        };
    }
    return base;
}

/* [318A-8] La config de la conversación activa es la fuente de verdad del
 * selector/modal: al abrir una tab (o cargar la lista) se sincroniza la config
 * global del store con la de esa conversación para que el selector muestre lo
 * que realmente se guardó en el servidor (antes quedaba la del localStorage,
 * que podía pertenecer a otra conversación). */
export function configDeTab(estado: EstadoAgente, id: string | null): ConfigAgente {
    const tab = id ? tabDe(estado, id) : undefined;
    return tab?.config ?? estado.config;
}

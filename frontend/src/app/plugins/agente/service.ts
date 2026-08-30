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
    config?: ConfigAgente;
}

export interface ConfigAgenteModelo {
    modo: ModoAgente;
    modelo: string;
    temperatura: number;
    maxTokens: number;
    idioma: 'es' | 'en' | 'pt' | 'fr';
}

export interface ConfigAgenteDatos {
    incluirNotas: boolean;
    incluirTareasCompletadas: boolean;
    incluirHabitosPausados: boolean;
    incluirMemoria: boolean;
    incluirSkills: boolean;
}

export interface ConfigAgenteLimites {
    permitirBusquedaWeb: boolean;
    permitirRecordatorios: boolean;
    promptSistema: string;
    maxTurns: number;
    timeoutToolSecs: number;
}

/* [02-09-2026] Fase 5: comportamiento (migración de SeccionConfigIAPanelChat),
 * workspace (solo local) y ventana/umbral de compactación. */
export interface ConfigAgenteComportamiento {
    estilo: 'conciso' | 'detallado' | 'amable';
    preferencias: string;
    workspace: string;
    maxVentana: number;
    umbralCompactacion: number;
}

export interface ConfigAgente extends ConfigAgenteModelo, ConfigAgenteDatos, ConfigAgenteLimites, ConfigAgenteComportamiento {}

/* [02-09-2026] Fase 5: normaliza la config camelCase del front al contrato
 * snake_case que lee el backend (clave única de verdad; antes la config de la
 * conversación se guardaba con camelCase y el runtime nunca la leía). */
export function aConfigBackend(config: Partial<ConfigAgente>): Record<string, unknown> {
    const salida: Record<string, unknown> = {};
    if (config.modo) salida.modo = config.modo;
    if (config.modelo) salida.modelo = config.modelo;
    if (config.temperatura !== undefined) salida.temperatura = config.temperatura;
    if (config.maxTokens !== undefined) salida.max_tokens = config.maxTokens;
    if (config.idioma) salida.idioma = config.idioma;
    if (config.incluirNotas !== undefined) salida.incluir_notas = config.incluirNotas;
    if (config.incluirTareasCompletadas !== undefined) salida.incluir_tareas_completadas = config.incluirTareasCompletadas;
    if (config.incluirHabitosPausados !== undefined) salida.incluir_habitos_pausados = config.incluirHabitosPausados;
    if (config.permitirBusquedaWeb !== undefined) salida.permitir_busqueda_web = config.permitirBusquedaWeb;
    if (config.permitirRecordatorios !== undefined) salida.permitir_recordatorios = config.permitirRecordatorios;
    if (config.promptSistema) salida.prompt_sistema = config.promptSistema;
    if (config.maxTurns !== undefined) salida.max_turns = config.maxTurns;
    if (config.timeoutToolSecs !== undefined) salida.timeout_tool_secs = config.timeoutToolSecs;
    if (config.incluirMemoria !== undefined) salida.incluir_memoria = config.incluirMemoria;
    if (config.incluirSkills !== undefined) salida.incluir_skills = config.incluirSkills;
    if (config.estilo) salida.estilo = config.estilo;
    if (config.preferencias) salida.preferencias = config.preferencias;
    if (config.workspace) salida.workspace = config.workspace;
    if (config.maxVentana !== undefined) salida.max_ventana = config.maxVentana;
    if (config.umbralCompactacion !== undefined) salida.umbral_compactacion = config.umbralCompactacion;
    return salida;
}

/* Inversa: config snake_case que devuelve el backend → camelCase del store
 * (para que reabrir una conversación conserve sus valores reales). */
export function aConfigFrontend(cruda: unknown): Partial<ConfigAgente> {
    if (!cruda || typeof cruda !== 'object') return {};
    const c = cruda as Record<string, unknown>;
    const numero = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
    const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
    const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
    return {
        modo: c.modo === 'meta' || c.modo === 'autonomo' ? c.modo : c.modo === 'predeterminado' ? 'predeterminado' : undefined,
        modelo: texto(c.modelo),
        temperatura: numero(c.temperatura),
        maxTokens: numero(c.max_tokens),
        idioma: c.idioma === 'es' || c.idioma === 'en' || c.idioma === 'pt' || c.idioma === 'fr' ? c.idioma : undefined,
        incluirNotas: bool(c.incluir_notas),
        incluirTareasCompletadas: bool(c.incluir_tareas_completadas),
        incluirHabitosPausados: bool(c.incluir_habitos_pausados),
        permitirBusquedaWeb: bool(c.permitir_busqueda_web),
        permitirRecordatorios: bool(c.permitir_recordatorios),
        promptSistema: texto(c.prompt_sistema),
        maxTurns: numero(c.max_turns),
        timeoutToolSecs: numero(c.timeout_tool_secs),
        incluirMemoria: bool(c.incluir_memoria),
        incluirSkills: bool(c.incluir_skills),
        estilo: c.estilo === 'conciso' || c.estilo === 'detallado' || c.estilo === 'amable' ? c.estilo : undefined,
        preferencias: texto(c.preferencias),
        workspace: texto(c.workspace),
        maxVentana: numero(c.max_ventana),
        umbralCompactacion: numero(c.umbral_compactacion),
    };
}

export interface MensajeConversacion {
    id: number;
    rol: 'user' | 'assistant' | 'system' | 'tool';
    contenido: string;
    creadoEn: string;
}

export interface SkillAgente {
    id: string;
    nombre: string;
    descripcion: string;
    activa: boolean;
}

export interface TareaProgramada {
    id: string;
    nombre: string;
    prompt: string;
    tipo: 'una_vez' | 'recurrente';
    cron_expr: string | null;
    estado: 'pendiente' | 'ejecutando' | 'completada' | 'fallida' | 'cancelada';
    proxima_ejecucion: string | null;
    result_summary: string | null;
}

/* Eventos del contrato SSE (src/handlers/agente.rs + src/agent/runtime.rs). */
export type EventoAgente =
    | {tipo: 'token'; texto: string}
    | {tipo: 'tool_start'; tool: string; argumentos: unknown}
    | {tipo: 'tool_result'; tool: string; ok: boolean; resumen: string; diff?: string}
    | {tipo: 'usage'; tokens_prompt?: number; tokens_complecion?: number; ocupacion_pct?: number | null}
    | {tipo: 'contexto'; skills: number}
    | {tipo: 'requiere_aprobacion'; tool: string; argumentos: unknown}
    | {tipo: 'error'; mensaje: string; retryable: boolean}
    | {tipo: 'done'; turno_id: string};

/* ---------- Conversaciones (tabs) ---------- */

export async function listarConversaciones(): Promise<ConversacionAgente[]> {
    return apiFetch<ConversacionAgente[]>('/agente/conversaciones');
}

export async function crearConversacion(titulo: string, modo: ModoAgente, config: Partial<ConfigAgente>): Promise<ConversacionAgente> {
    return apiFetch<ConversacionAgente>('/agente/conversaciones', {
        method: 'POST',
        body: {titulo, modo, config: aConfigBackend(config)},
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

/* ---------- Skills (persistentes por usuario, inyectadas en el contexto) ---------- */

export async function listarSkills(): Promise<SkillAgente[]> {
    return apiFetch<SkillAgente[]>('/agente/skills');
}

export async function crearSkill(datos: {nombre: string; descripcion: string; activa: boolean}): Promise<SkillAgente> {
    return apiFetch<SkillAgente>('/agente/skills', {method: 'POST', body: datos});
}

export async function actualizarSkill(id: string, cambios: Partial<Pick<SkillAgente, 'nombre' | 'descripcion' | 'activa'>>): Promise<SkillAgente> {
    return apiFetch<SkillAgente>(`/agente/skills/${id}`, {method: 'PUT', body: cambios});
}

export async function eliminarSkill(id: string): Promise<void> {
    await apiFetch<void>(`/agente/skills/${id}`, {method: 'DELETE'});
}

/* ---------- Tareas programadas (el agente las ejecuta como turnos) ---------- */

export async function listarTareasProgramadas(): Promise<TareaProgramada[]> {
    return apiFetch<TareaProgramada[]>('/agente/tareas-programadas');
}

export async function crearTareaProgramada(datos: {
    nombre: string;
    prompt: string;
    tipo: 'una_vez' | 'recurrente';
    cron_expr?: string;
    ejecutar_en?: string;
}): Promise<TareaProgramada> {
    return apiFetch<TareaProgramada>('/agente/tareas-programadas', {method: 'POST', body: datos});
}

export async function eliminarTareaProgramada(id: string): Promise<void> {
    await apiFetch<void>(`/agente/tareas-programadas/${id}`, {method: 'DELETE'});
}

/* ---------- Historial (persistencia en servidor) ---------- */

export async function guardarConfigConversacion(id: string, config: Partial<ConfigAgente>): Promise<ConversacionAgente> {
    return apiFetch<ConversacionAgente>(`/agente/conversaciones/${id}/config`, {method: 'PUT', body: {config: aConfigBackend(config)}});
}

export async function cargarHistorial(id: string): Promise<MensajeConversacion[]> {
    return apiFetch<MensajeConversacion[]>(`/agente/conversaciones/${id}`);
}

/* ---------- Stream SSE ---------- */

/**
 * Envía un mensaje y consume el stream SSE del backend. `onEvento` se llama
 * por cada evento tipado; `onError` con el error real del backend. Devuelve
 * una promesa que resuelve al terminar (evento done) o con el error.
 */
export function construirPayloadStream(
    conversacionId: string,
    mensaje: string,
    config: Partial<ConfigAgente> = {},
    claveIdempotencia?: string,
): Record<string, unknown> {
    return {
        conversacionId,
        mensaje,
        ...(claveIdempotencia ? {clave_idempotencia: claveIdempotencia} : {}),
        ...aConfigBackend(config),
    };
}

export async function enviarMensajeAgente(
    conversacionId: string,
    mensaje: string,
    onEvento: (evento: EventoAgente) => void,
    signal?: AbortSignal,
    config: Partial<ConfigAgente> = {},
    claveIdempotencia?: string,
): Promise<void> {
    const respuesta = await fetch('/api/agente/stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': obtenerTokenCsrf(),
        },
        body: JSON.stringify(construirPayloadStream(conversacionId, mensaje, config, claveIdempotencia)),
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

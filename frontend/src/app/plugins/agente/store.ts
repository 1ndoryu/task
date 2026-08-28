/*
 * plugins/agente/store.ts
 * Store Zustand del plugin de agente: tabs (conversaciones) + mensajes +
 * estado de streaming. La fuente de verdad de las conversaciones y mensajes
 * es el SERVIDOR (persistencia multinavegador); este store es la sesión del
 * navegador actual (tab activa, mensajes en memoria, streaming en curso).
 * Al abrir una tab se carga el historial de BD (cargarHistorial).
 */

import {create} from 'zustand';
import type {ConversacionAgente, ConfigAgente, MensajeConversacion} from './service';
import {
    cargarHistorial,
    crearConversacion,
    eliminarConversacion,
    enviarMensajeAgente,
    listarConversaciones,
    renombrarConversacion,
} from './service';

export interface MensajeTabAgente {
    id: string;
    rol: 'user' | 'assistant';
    contenido: string;
    /* Eventos de tool del último turno (para las tarjetas). */
    herramientas?: Array<{tool: string; ok: boolean; resumen: string}>;
    aprobacionPendiente?: {tool: string; argumentos: unknown} | null;
}

export interface TabAgente {
    conversacion: ConversacionAgente;
    mensajes: MensajeTabAgente[];
    cargandoHistorial: boolean;
    enviando: boolean;
    error: string | null;
}

/* Configuración del agente persistida en localStorage y enviada en cada turno. */
const CLAVE_CONFIG = 'glory-agente-config';

const CONFIG_DEFECTO: ConfigAgente = {
    modo: 'predeterminado', modelo: 'commandcode', temperatura: 0.2, maxTokens: 2048,
    idioma: 'es', incluirNotas: false, incluirTareasCompletadas: false,
    incluirHabitosPausados: false, permitirBusquedaWeb: true,
    permitirRecordatorios: true, promptSistema: '', maxTurns: 10,
    timeoutToolSecs: 15, incluirMemoria: true, incluirSkills: true,
};

function cargarConfig(): ConfigAgente {
    try {
        const crudo = localStorage.getItem(CLAVE_CONFIG);
        if (crudo) {
            const parsed = JSON.parse(crudo) as Partial<ConfigAgente>;
            return {
                ...CONFIG_DEFECTO,
                ...parsed,
                modo: parsed.modo === 'meta' || parsed.modo === 'autonomo' || parsed.modo === 'predeterminado' ? parsed.modo : 'predeterminado',
                modelo: typeof parsed.modelo === 'string' && parsed.modelo.trim() ? parsed.modelo.replace(/^glory\//, '') : CONFIG_DEFECTO.modelo,
                temperatura: typeof parsed.temperatura === 'number' ? Math.max(0, Math.min(2, parsed.temperatura)) : CONFIG_DEFECTO.temperatura,
                maxTokens: typeof parsed.maxTokens === 'number' ? Math.max(64, Math.min(4096, Math.round(parsed.maxTokens))) : CONFIG_DEFECTO.maxTokens,
                maxTurns: typeof parsed.maxTurns === 'number' ? Math.max(1, Math.min(10, Math.round(parsed.maxTurns))) : CONFIG_DEFECTO.maxTurns,
                timeoutToolSecs: typeof parsed.timeoutToolSecs === 'number' ? Math.max(1, Math.min(15, Math.round(parsed.timeoutToolSecs))) : CONFIG_DEFECTO.timeoutToolSecs,
                idioma: parsed.idioma === 'es' || parsed.idioma === 'en' || parsed.idioma === 'pt' || parsed.idioma === 'fr' ? parsed.idioma : 'es',
                promptSistema: typeof parsed.promptSistema === 'string' ? parsed.promptSistema.slice(0, 4000) : '',
                incluirMemoria: typeof parsed.incluirMemoria === 'boolean' ? parsed.incluirMemoria : true,
                incluirSkills: typeof parsed.incluirSkills === 'boolean' ? parsed.incluirSkills : true,
            };
        }
    } catch {
        /* configuración corrupta: usar defaults */
    }
    return {...CONFIG_DEFECTO};
}

interface EstadoAgente {
    tabs: TabAgente[];
    tabActivaId: string | null;
    conversacionesCargadas: boolean;
    cargandoLista: boolean;
    errorLista: string | null;
    config: ConfigAgente;
    /* Acciones */
    cargarConversaciones: () => Promise<void>;
    abrirTab: (id: string) => Promise<void>;
    crearTab: () => Promise<ConversacionAgente | null>;
    renombrarTab: (id: string, titulo: string) => Promise<void>;
    cerrarTab: (id: string) => Promise<void>;
    enviarMensaje: (texto: string, signal?: AbortSignal) => Promise<void>;
    limpiarErrorTab: (id: string) => void;
    establecerConfig: (config: Partial<ConfigAgente>) => void;
}

function generarIdLocal(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function tabDe(estado: EstadoAgente, id: string): TabAgente | undefined {
    return estado.tabs.find(t => t.conversacion.id === id);
}

export const useAgenteStore = create<EstadoAgente>()((set, get) => ({
    tabs: [],
    tabActivaId: null,
    conversacionesCargadas: false,
    cargandoLista: false,
    errorLista: null,
    config: cargarConfig(),

    cargarConversaciones: async () => {
        set({cargandoLista: true, errorLista: null});
        try {
            const conversaciones = await listarConversaciones();
            const tabs: TabAgente[] = conversaciones.map(c => ({
                conversacion: c,
                mensajes: [],
                cargandoHistorial: false,
                enviando: false,
                error: null,
            }));
            set({
                tabs,
                conversacionesCargadas: true,
                cargandoLista: false,
                tabActivaId: get().tabActivaId && tabs.some(t => t.conversacion.id === get().tabActivaId)
                    ? get().tabActivaId
                    : (tabs[0]?.conversacion.id ?? null),
            });
            const activa = get().tabActivaId;
            if (activa) {
                void get().abrirTab(activa);
            }
        } catch (error) {
            set({
                cargandoLista: false,
                errorLista: error instanceof Error ? error.message : 'No se pudieron cargar las conversaciones',
            });
        }
    },

    abrirTab: async (id) => {
        set({tabActivaId: id});
        const tab = tabDe(get(), id);
        if (!tab || tab.mensajes.length > 0) return;
        set(state => ({
            tabs: state.tabs.map(t =>
                t.conversacion.id === id ? {...t, cargandoHistorial: true, error: null} : t
            ),
        }));
        try {
            const historial = await cargarHistorial(id);
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === id
                        ? {
                              ...t,
                              cargandoHistorial: false,
                              mensajes: historial.map(h => ({
                                  id: `db-${h.id}`,
                                  rol: h.rol === 'user' ? 'user' as const : 'assistant' as const,
                                  contenido: h.contenido,
                              })),
                          }
                        : t
                ),
            }));
        } catch (error) {
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === id
                        ? {
                              ...t,
                              cargandoHistorial: false,
                              error: error instanceof Error ? error.message : 'No se pudo cargar el historial',
                          }
                        : t
                ),
            }));
        }
    },

    crearTab: async () => {
        try {
            const conversacion = await crearConversacion('Nueva conversación', get().config.modo);
            set(state => ({
                tabs: [
                    ...state.tabs,
                    {conversacion, mensajes: [], cargandoHistorial: false, enviando: false, error: null},
                ],
                tabActivaId: conversacion.id,
            }));
            return conversacion;
        } catch (error) {
            set({errorLista: error instanceof Error ? error.message : 'No se pudo crear la conversación'});
            return null;
        }
    },

    renombrarTab: async (id, titulo) => {
        const tituloLimpio = titulo.trim();
        if (!tituloLimpio) return;
        try {
            const actualizada = await renombrarConversacion(id, tituloLimpio);
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === id ? {...t, conversacion: actualizada} : t
                ),
            }));
        } catch (error) {
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === id
                        ? {...t, error: error instanceof Error ? error.message : 'No se pudo renombrar'}
                        : t
                ),
            }));
        }
    },

    cerrarTab: async (id) => {
        try {
            await eliminarConversacion(id);
        } catch (error) {
            /* Fallo de red: la tab se cierra localmente igual; el servidor la
             * reconciliará en la próxima carga de la lista. */
            console.warn('agente: no se pudo eliminar la conversación en el servidor', error);
        }
        const resto = get().tabs.filter(t => t.conversacion.id !== id);
        set(state => ({
            tabs: resto,
            tabActivaId:
                state.tabActivaId === id
                    ? (resto[0]?.conversacion.id ?? null)
                    : state.tabActivaId,
        }));
        const activa = get().tabActivaId;
        if (activa && resto.some(t => t.conversacion.id === activa) && !tabDe(get(), activa)?.mensajes.length) {
            void get().abrirTab(activa);
        }
    },

    enviarMensaje: async (texto, signal) => {
        const tabId = get().tabActivaId;
        const tab = tabId ? tabDe(get(), tabId) : undefined;
        const limpio = texto.trim();
        if (!tabId || !tab || !limpio || tab.enviando) return;

        const msgUsuario: MensajeTabAgente = {id: generarIdLocal(), rol: 'user', contenido: limpio};
        const msgAsistente: MensajeTabAgente = {
            id: generarIdLocal(),
            rol: 'assistant',
            contenido: '',
            herramientas: [],
            aprobacionPendiente: null,
        };
        set(state => ({
            tabs: state.tabs.map(t =>
                t.conversacion.id === tabId
                    ? {
                          ...t,
                          enviando: true,
                          error: null,
                          mensajes: [...t.mensajes, msgUsuario, msgAsistente],
                      }
                    : t
            ),
        }));

        try {
            await enviarMensajeAgente(
                tabId,
                limpio,
                evento => {
                    const estado = get();
                    const tabActual = tabDe(estado, tabId);
                    if (!tabActual) return;
                    const idx = tabActual.mensajes.findIndex(m => m.id === msgAsistente.id);
                    if (idx === -1) return;
                    const mensajes = [...tabActual.mensajes];
                    const objetivo = {...mensajes[idx]};
                    switch (evento.tipo) {
                        case 'token':
                            objetivo.contenido += evento.texto;
                            break;
                        case 'tool_start':
                            objetivo.herramientas = [
                                ...(objetivo.herramientas ?? []),
                                {tool: evento.tool, ok: true, resumen: 'ejecutando...'},
                            ];
                            break;
                        case 'tool_result':
                            objetivo.herramientas = (objetivo.herramientas ?? []).map(h =>
                                h.tool === evento.tool ? {tool: evento.tool, ok: evento.ok, resumen: evento.resumen} : h
                            );
                            break;
                        case 'requiere_aprobacion':
                            objetivo.aprobacionPendiente = {tool: evento.tool, argumentos: evento.argumentos};
                            break;
                        case 'error':
                            /* El error retryable se muestra en la burbuja; el
                             * mensaje no se marca como fallido en servidor. */
                            objetivo.contenido = objetivo.contenido || `⚠ ${evento.mensaje}`;
                            break;
                        default:
                            break;
                    }
                    mensajes[idx] = objetivo;
                    set(state => ({
                        tabs: state.tabs.map(t => (t.conversacion.id === tabId ? {...t, mensajes} : t)),
                    }));
                },
                signal,
                get().config,
            );
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error desconocido del agente';
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === tabId
                        ? {
                              ...t,
                              enviando: false,
                              error: mensajeError,
                              mensajes: t.mensajes.map(m =>
                                  m.id === msgAsistente.id && m.contenido === ''
                                      ? {...m, contenido: `⚠ ${mensajeError}`}
                                      : m
                              ),
                          }
                        : t
                ),
            }));
            return;
        }

        set(state => ({
            tabs: state.tabs.map(t =>
                t.conversacion.id === tabId
                    ? {
                          ...t,
                          enviando: false,
                          /* Los mensajes persisten en el servidor (el runtime
                           * guarda user+assistant); la lista local ya los tiene. */
                      }
                    : t
            ),
        }));
    },

    limpiarErrorTab: (id) => {
        set(state => ({
            tabs: state.tabs.map(t => (t.conversacion.id === id ? {...t, error: null} : t)),
        }));
    },

    establecerConfig: (config) => {
        const nueva = {...get().config, ...config};
        nueva.modelo = nueva.modelo.trim().replace(/^glory\//, '') || 'commandcode';
        nueva.temperatura = Math.max(0, Math.min(2, Number(nueva.temperatura) || 0));
        nueva.maxTokens = Math.max(64, Math.min(4096, Math.round(Number(nueva.maxTokens) || 2048)));
        nueva.maxTurns = Math.max(1, Math.min(10, Math.round(Number(nueva.maxTurns) || 10)));
        nueva.timeoutToolSecs = Math.max(1, Math.min(15, Math.round(Number(nueva.timeoutToolSecs) || 15)));
        nueva.promptSistema = nueva.promptSistema.trim().slice(0, 4000);
        nueva.idioma = ['es', 'en', 'pt', 'fr'].includes(nueva.idioma) ? nueva.idioma : 'es';
        nueva.incluirMemoria = Boolean(nueva.incluirMemoria);
        nueva.incluirSkills = Boolean(nueva.incluirSkills);
        if (nueva.modo !== 'predeterminado' && nueva.modo !== 'meta' && nueva.modo !== 'autonomo') {
            nueva.modo = 'predeterminado';
        }
        try {
            localStorage.setItem(CLAVE_CONFIG, JSON.stringify(nueva));
        } catch {
            /* almacenamiento no disponible: la config se mantiene solo en memoria */
        }
        set({config: nueva});
    },
}));

/* Selector: la tab activa completa (para el panel). */
export function useTabActivaAgente(): TabAgente | null {
    return useAgenteStore(s => {
        const tabId = s.tabActivaId;
        return s.tabs.find(t => t.conversacion.id === tabId) ?? null;
    });
}

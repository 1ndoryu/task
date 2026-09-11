/* [039A-1/FASE-FINAL] Motor del turno SSE del agente (stream + volcado a
 * la burbuja), extraído de `store.ts`. */
import {enviarMensajeAgente} from './service';
import type {ConfigAgente} from './service';
import {tabDe} from './ayudasAgente';
import type {EstadoAgente, MensajeTabAgente} from './tiposAgente';

/* Ejecuta el stream SSE de un turno y aplica los eventos a la burbuja del
 * asistente. Idempotencia y reintento: la clave ya viene fijada. */
export async function correrTurno(
    get: () => EstadoAgente,
    set: (partial: Partial<EstadoAgente> | ((s: EstadoAgente) => Partial<EstadoAgente>)) => void,
    tabId: string,
    texto: string,
    signal: AbortSignal | undefined,
    clave: string,
    msgUsuario: MensajeTabAgente,
    msgAsistente: MensajeTabAgente,
    config: ConfigAgente,
): Promise<void> {
    try {
        await enviarMensajeAgente(
            tabId,
            texto,
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
                            {tool: evento.tool, ok: true, resumen: 'ejecutando...', argumentos: evento.argumentos},
                        ];
                        break;
                    case 'tool_result': {
                        /* [039A-2] Actualiza SOLO la última tarjeta pendiente
                         * con ese nombre (antes el `.map` pisaba TODAS las
                         * tarjetas con el mismo tool: 3× file_search mostraban
                         * las 3 el último resultado). Sin pendiente, la última
                         * con ese nombre; sin ninguna, se añade. */
                        const lista = [...(objetivo.herramientas ?? [])];
                        let idx = -1;
                        for (let k = lista.length - 1; k >= 0; k--) {
                            const h = lista[k];
                            if (h && h.tool === evento.tool && h.resumen === 'ejecutando...') {
                                idx = k;
                                break;
                            }
                        }
                        if (idx === -1) {
                            for (let k = lista.length - 1; k >= 0; k--) {
                                if (lista[k]?.tool === evento.tool) {
                                    idx = k;
                                    break;
                                }
                            }
                        }
                        const actualizada = {
                            tool: evento.tool,
                            ok: evento.ok,
                            resumen: evento.resumen,
                            argumentos: idx >= 0 ? lista[idx]?.argumentos : undefined,
                            diff: evento.diff,
                        };
                        if (idx >= 0) {
                            lista[idx] = actualizada;
                        } else {
                            lista.push(actualizada);
                        }
                        objetivo.herramientas = lista;
                        break;
                    }
                    case 'usage':
                        /* El runtime emite `usage` con ocupacion_pct: None (y el
                         * final con tokens_prompt: 0): conserva los valores
                         * previos (contexto_detalle/turnos con tools) cuando el
                         * evento no trae dato, para no borrar la barra. El
                         * provider/modelo real llegan en el Usage de cada llamada
                         * LLM y el Usage final los trae null: se conservan los
                         * primeros. */
                        objetivo.contexto = {
                            ocupacionPct: evento.ocupacion_pct ?? objetivo.contexto?.ocupacionPct ?? null,
                            tokensPrompt: (evento.tokens_prompt ?? 0) > 0 ? (evento.tokens_prompt ?? 0) : objetivo.contexto?.tokensPrompt ?? 0,
                            tokensComplecion: (evento.tokens_complecion ?? 0) > 0 ? (evento.tokens_complecion ?? 0) : objetivo.contexto?.tokensComplecion ?? 0,
                            skills: objetivo.contexto?.skills ?? 0,
                            provider: typeof evento.provider === 'string' && evento.provider.trim()
                                ? evento.provider
                                : objetivo.contexto?.provider ?? null,
                            modelo: typeof evento.modelo === 'string' && evento.modelo.trim()
                                ? evento.modelo
                                : objetivo.contexto?.modelo ?? null,
                        };
                        break;
                    case 'contexto':
                        objetivo.contexto = {
                            ocupacionPct: objetivo.contexto?.ocupacionPct ?? null,
                            tokensPrompt: objetivo.contexto?.tokensPrompt ?? 0,
                            tokensComplecion: objetivo.contexto?.tokensComplecion ?? 0,
                            skills: evento.skills,
                            provider: objetivo.contexto?.provider ?? null,
                            modelo: objetivo.contexto?.modelo ?? null,
                        };
                        break;
                    /* [318A-7] Desglose de la ventana de contexto (evento del
                     * runtime en cada llamada LLM). Conserva los campos previos
                     * (usage/contexto) y añade las secciones del desglose. */
                    case 'contexto_detalle':
                        objetivo.contexto = {
                            ocupacionPct: evento.ocupacion_pct,
                            /* total_entrada es la suma de entrada del desglose
                             * (system+tools+mensajes+resultados): si aún no
                             * llegó usage, úsalo como tokens de entrada. */
                            tokensPrompt: (objetivo.contexto?.tokensPrompt ?? 0) > 0
                                ? objetivo.contexto?.tokensPrompt ?? 0
                                : evento.total_entrada ?? 0,
                            tokensComplecion: objetivo.contexto?.tokensComplecion ?? 0,
                            skills: objetivo.contexto?.skills ?? 0,
                            provider: objetivo.contexto?.provider ?? null,
                            modelo: objetivo.contexto?.modelo ?? null,
                            maxVentana: evento.max_ventana,
                            reservaSalida: evento.reserva_salida,
                            systemInstrucciones: evento.system_instrucciones,
                            definicionesTools: evento.definiciones_tools,
                            mensajes: evento.mensajes,
                            resultadosTools: evento.resultados_tools,
                            totalEntrada: evento.total_entrada,
                        };
                        break;
                    /* [318A-16 F2] El runtime emite `peticion_aprobacion`
                     * (con id + clasificacion) y después `requiere_aprobacion`
                     * (compat). La petición rica gana; `requiere_aprobacion`
                     * solo actúa como fallback si aún no hay pendiente (backend
                     * que solo emita el evento viejo). */
                    case 'peticion_aprobacion':
                        objetivo.aprobacionPendiente = {
                            id: evento.id,
                            tool: evento.tool,
                            argumentos: evento.argumentos,
                            clasificacion: evento.clasificacion,
                        };
                        break;
                    case 'requiere_aprobacion':
                        if (!objetivo.aprobacionPendiente) {
                            objetivo.aprobacionPendiente = {
                                id: '',
                                tool: evento.tool,
                                argumentos: evento.argumentos,
                                clasificacion: '',
                            };
                        }
                        break;
                    case 'error':
                        /* El error retryable se muestra en la burbuja con el
                         * botón reintentar; el mensaje no se marca fallido en
                         * servidor. Se conserva la clave de idempotencia. */
                        objetivo.contenido = objetivo.contenido || `⚠ ${evento.mensaje}`;
                        objetivo.reintentar = evento.retryable;
                        break;
                }
                mensajes[idx] = objetivo;
                mensajesDe(set, get, tabId, mensajes);
            },
            signal,
            config,
            clave,
        );
    } catch (error) {
        /* Cancelación por el usuario (botón cancelar / cierre del panel): no es
         * un fallo retryable del proveedor. La fila del usuario ya se persistió
         * al inicio del turno (ON CONFLICT DO NOTHING), así que un reintento con
         * la misma clave no duplica; se deja la burbuja como "cancelado" y con
         * el botón reintentar por si el usuario quiere reanudar. */
        const cancelado =
            signal?.aborted === true ||
            (error instanceof DOMException && error.name === 'AbortError') ||
            (error instanceof Error && error.name === 'AbortError');
        if (cancelado) {
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === tabId
                        ? {
                              ...t,
                              enviando: false,
                              mensajes: t.mensajes.map(m =>
                                  m.id === msgAsistente.id && m.contenido === ''
                                      ? {
                                            ...m,
                                            contenido: '⏹ Turno cancelado',
                                            claveIdempotencia: msgUsuario.claveIdempotencia,
                                            reintentar: true,
                                        }
                                      : m
                              ),
                          }
                        : t
                ),
            }));
            return;
        }
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
                                  ? {...m, contenido: `⚠ ${mensajeError}`, claveIdempotencia: msgUsuario.claveIdempotencia, reintentar: true}
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
}

export function mensajesDe(
    set: (partial: Partial<EstadoAgente> | ((s: EstadoAgente) => Partial<EstadoAgente>)) => void,
    get: () => EstadoAgente,
    tabId: string,
    mensajes: MensajeTabAgente[],
) {
    set(() => ({
        tabs: get().tabs.map(t => (t.conversacion.id === tabId ? {...t, mensajes} : t)),
    }));
}

/* [039A-1/FASE-FINAL] Slice de turnos (envío/reintento/aprobación/
 * rebobinado/compactado) del store del agente. */
import type {StateCreator} from 'zustand';
import {compactarConversacion, rebobinarConversacion, responderAprobacionConversacion} from './service';
import type {DecisionAprobacion} from './service';
import {correrTurno} from './turnoAgente';
import {aMensajeTab, generarClaveIdempotencia, generarIdLocal, tabDe} from './ayudasAgente';
import type {EstadoAgente, EstadoAgenteAccionesTurnos, MensajeTabAgente} from './tiposAgente';

export const crearSliceTurnos: StateCreator<EstadoAgente, [], [], Omit<EstadoAgenteAccionesTurnos, 'establecerConfig'>> = (set, get) => ({
    enviarMensaje: async (texto, signal, claveIdempotencia) => {
        const tabId = get().tabActivaId;
        const tab = tabId ? tabDe(get(), tabId) : undefined;
        const limpio = texto.trim();
        if (!tabId || !tab || !limpio || tab.enviando) return;

        const msgUsuario: MensajeTabAgente = {
            id: generarIdLocal(),
            rol: 'user',
            contenido: limpio,
            /* Se genera en el primer intento y se conserva en el mensaje para
             * que un reintento con la misma clave no duplique la fila en BD. */
            claveIdempotencia: claveIdempotencia ?? generarClaveIdempotencia(),
        };
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

        await correrTurno(
            get,
            set,
            tabId,
            limpio,
            signal,
            msgUsuario.claveIdempotencia!,
            msgUsuario,
            msgAsistente,
            tab.config,
        );
    },

    /* Reintenta el último turno fallido reutilizando la misma clave de
     * idempotencia: la fila del usuario ya existe en BD (ON CONFLICT DO
     * NOTHING no duplica) y se reenvía a la red. Busca el último mensaje de
     * usuario con clave y crea una burbuja de asistente nueva a continuación. */
    reintentarMensaje: async () => {
        const tabId = get().tabActivaId;
        const tab = tabId ? tabDe(get(), tabId) : undefined;
        if (!tabId || !tab || tab.enviando) return;

        /* Último turno de usuario que ya se persistió (tiene clave). */
        const ultimoUsuario = [...tab.mensajes].reverse().find(m => m.rol === 'user' && m.claveIdempotencia);
        if (!ultimoUsuario) return;

        /* Quitar la burbuja de asistente fallida que quedó debajo, si existe. */
        const idxUsuario = tab.mensajes.findIndex(m => m.id === ultimoUsuario.id);
        const sinBurbujaFallida = [...tab.mensajes].slice(0, idxUsuario + 1);
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
                          mensajes: [...sinBurbujaFallida, msgAsistente],
                      }
                    : t
            ),
        }));

        await correrTurno(
            get,
            set,
            tabId,
            ultimoUsuario.contenido,
            undefined,
            ultimoUsuario.claveIdempotencia!,
            ultimoUsuario,
            msgAsistente,
            tab.config,
        );
    },

    /* [318A-16 F2] Responde la aprobación pendiente del último mensaje del
     * tab y reenvía el turno: el POST persiste la decisión (token de una vez
     * o regla de clase) y el siguiente stream la siembra en el registro del
     * runtime antes de evaluar la primera tool_call. Rechazar también reenvía
     * para que el modelo vea el deny silencioso y cambie de plan. */
    responderAprobacion: async (tabId, decision) => {
        const tab = tabId ? tabDe(get(), tabId) : undefined;
        if (!tab || tab.enviando) return;
        const pendiente = [...tab.mensajes].reverse().find(m => m.rol === 'assistant' && m.aprobacionPendiente)?.aprobacionPendiente;
        if (!pendiente) return;
        if (!pendiente.id) {
            /* Sin canal explícito: solo se puede confirmar por texto (flujo
             * conversacional previo); no hay botones habilitados. */
            return;
        }
        try {
            await responderAprobacionConversacion(tab.conversacion.id, {
                decision,
                tool: pendiente.tool,
                clasificacion: pendiente.clasificacion,
            });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'No se pudo guardar la decisión de aprobación';
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === tabId ? {...t, error: mensajeError} : t
                ),
            }));
            return;
        }
        /* La decisión quedó guardada: reenvía el turno para que surta efecto
         * (misma clave de idempotencia; la fila del usuario ya existe). */
        await get().reintentarMensaje();
    },

    limpiarErrorTab: (id) => {
        set(state => ({
            tabs: state.tabs.map(t => (t.conversacion.id === id ? {...t, error: null} : t)),
        }));
    },

    /* [318A-5] Rebobina hasta un mensaje (volver atrás/editar): el backend borra
     * los mensajes posteriores (o desde, si `editar`) y devuelve el historial
     * resultante; la sesión local se reconcilia con él. `hastaMensajeId` es el id
     * local (p.ej. `db-123`) del mensaje objetivo. */
    rebobinarTab: async (id, hastaId, hastaMensajeId, editar = false) => {
        const tab = tabDe(get(), id);
        if (!tab) return;
        try {
            const historial = await rebobinarConversacion(id, hastaId, editar);
            /* Reconciliar la sesión local con el historial real del servidor
             * (los ids `db-N` coinciden con el backend). */
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === id
                        ? {
                              ...t,
                              mensajes: historial.map(aMensajeTab),
                          }
                        : t
                ),
            }));
        } catch (error) {
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === id
                        ? {...t, error: error instanceof Error ? error.message : 'No se pudo rebobinar la conversación'}
                        : t
                ),
            }));
        }
    },

    /* [318A-7] Compacta la conversación: el backend marca los mensajes antiguos
     * como compactados e inserta un resumen system (que el historial sí vuelve a
     * cargar). La sesión local se reconcilia con el historial resultante. */
    compactarTab: async (id) => {
        const tab = tabDe(get(), id);
        if (!tab) return;
        try {
            const historial = await compactarConversacion(id);
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === id
                        ? {
                              ...t,
                              mensajes: historial.map(aMensajeTab),
                          }
                        : t
                ),
            }));
        } catch (error) {
            set(state => ({
                tabs: state.tabs.map(t =>
                    t.conversacion.id === id
                        ? {...t, error: error instanceof Error ? error.message : 'No se pudo compactar la conversación'}
                        : t
                ),
            }));
        }
    },
});

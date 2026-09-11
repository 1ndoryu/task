/* [039A-1/FASE-FINAL] Slice de tabs/conversaciones del store del agente. */
import type {StateCreator} from 'zustand';
import {logWarn} from '../../utils/logger';
import {aConfigFrontend, cargarHistorial, crearConversacion, eliminarConversacion, listarConversaciones, renombrarConversacion} from './service';
import type {ConversacionAgente} from './service';
import {cargarConfig, normalizarConfig} from './configAgente';
import {aMensajeTab, configDeTab, tabDe} from './ayudasAgente';
import type {EstadoAgente, EstadoAgenteAccionesTabs, TabAgente} from './tiposAgente';

export const crearSliceTabs: StateCreator<EstadoAgente, [], [], EstadoAgenteAccionesTabs> = (set, get) => ({
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
                config: c.config ? normalizarConfig(aConfigFrontend(c.config)) : cargarConfig(),
            }));
            const tabActivaId = get().tabActivaId && tabs.some(t => t.conversacion.id === get().tabActivaId)
                ? get().tabActivaId
                : (tabs[0]?.conversacion.id ?? null);
            /* [318A-8] Al cargar, la config global se alinea con la de la
             * conversación activa (fuente de verdad del selector); si no hay
             * conversaciones, conserva la del localStorage. */
            const tabActiva = tabActivaId ? tabs.find(t => t.conversacion.id === tabActivaId) : undefined;
            set({
                tabs,
                config: tabActiva?.config ?? get().config,
                conversacionesCargadas: true,
                cargandoLista: false,
                tabActivaId,
            });
            if (tabActivaId) {
                void get().abrirTab(tabActivaId);
            }
        } catch (error) {
            set({
                cargandoLista: false,
                errorLista: error instanceof Error ? error.message : 'No se pudieron cargar las conversaciones',
            });
        }
    },

    abrirTab: async (id) => {
        set(state => ({
            tabActivaId: id,
            /* [318A-8] Al cambiar de conversación, el selector/modal deben
             * mostrar la config de ESA conversación (persistida en el
             * servidor), no la del localStorage. */
            config: configDeTab(state, id),
        }));
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
                              mensajes: historial.map(aMensajeTab),
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
            const config = get().config;
            const conversacion = await crearConversacion('Nueva conversación', config.modo, config);
            set(state => ({
                tabs: [
                    ...state.tabs,
                    {conversacion: {...conversacion, config}, mensajes: [], cargandoHistorial: false, enviando: false, error: null, config},
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
            logWarn('agenteStore', 'no se pudo eliminar la conversación en el servidor', error);
        }
        const resto = get().tabs.filter(t => t.conversacion.id !== id);
        const nuevaActiva = (state: EstadoAgente) => {
            const activaId = state.tabActivaId === id ? (resto[0]?.conversacion.id ?? null) : state.tabActivaId;
            /* [318A-8] Si no queda ninguna conversación, la config global vuelve
             * a la del localStorage (defaults); si queda, se alinea con la nueva
             * tab activa para que el selector no muestre la de la cerrada. */
            const config = activaId
                ? (resto.find(t => t.conversacion.id === activaId)?.config ?? state.config)
                : cargarConfig();
            return {tabs: resto, tabActivaId: activaId, config};
        };
        set(nuevaActiva);
        const activa = get().tabActivaId;
        if (activa && resto.some(t => t.conversacion.id === activa) && !tabDe(get(), activa)?.mensajes.length) {
            void get().abrirTab(activa);
        }
    },
});

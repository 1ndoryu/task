/*
 * stores/pluginsStore.ts
 * Store de Zustand para gestionar plugins activos del usuario
 * Persiste en localStorage qué plugins están activos y su configuración
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {EstadoPluginsUsuario} from '../types/plugins';

interface PluginsActions {
    activarPlugin: (pluginId: string) => void;
    desactivarPlugin: (pluginId: string) => void;
    togglePlugin: (pluginId: string) => void;
    estaActivo: (pluginId: string) => boolean;
    obtenerConfiguracion: <T = Record<string, unknown>>(pluginId: string) => T;
    guardarConfiguracion: (pluginId: string, config: Record<string, unknown>) => void;
}

type PluginsStore = EstadoPluginsUsuario & PluginsActions;

export const usePluginsStore = create<PluginsStore>()(
    persist(
        (set, get) => ({
            pluginsActivos: [],
            configuracionPlugins: {},

            activarPlugin: (pluginId: string) => {
                const {pluginsActivos} = get();
                if (pluginsActivos.includes(pluginId)) return;
                set({pluginsActivos: [...pluginsActivos, pluginId]});
            },

            desactivarPlugin: (pluginId: string) => {
                const {pluginsActivos} = get();
                set({pluginsActivos: pluginsActivos.filter(id => id !== pluginId)});
            },

            togglePlugin: (pluginId: string) => {
                const {pluginsActivos} = get();
                if (pluginsActivos.includes(pluginId)) {
                    set({pluginsActivos: pluginsActivos.filter(id => id !== pluginId)});
                } else {
                    set({pluginsActivos: [...pluginsActivos, pluginId]});
                }
            },

            estaActivo: (pluginId: string) => {
                return get().pluginsActivos.includes(pluginId);
            },

            obtenerConfiguracion: <T = Record<string, unknown>>(pluginId: string): T => {
                return (get().configuracionPlugins[pluginId] ?? {}) as T;
            },

            guardarConfiguracion: (pluginId: string, config: Record<string, unknown>) => {
                const {configuracionPlugins} = get();
                set({
                    configuracionPlugins: {
                        ...configuracionPlugins,
                        [pluginId]: {...(configuracionPlugins[pluginId] ?? {}), ...config}
                    }
                });
            }
        }),
        {
            name: 'glory-plugins'
        }
    )
);

/* Selectores */
export const usePluginActivo = (pluginId: string) => usePluginsStore(s => s.pluginsActivos.includes(pluginId));

/*
 * stores/deficitCaloricoStore.ts
 * Store Zustand para el plugin de déficit calórico
 * Persiste comidas, historial y configuración del usuario
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {DeficitCaloricoState, DeficitCaloricoActions, ComidaRegistrada, RegistroDiario} from '../types/deficitCalorico';

/* Obtener fecha local en formato YYYY-MM-DD */
function obtenerFechaHoy(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

const MAX_HISTORIAL = 30;

type DeficitCaloricoStore = DeficitCaloricoState & DeficitCaloricoActions;

export const useDeficitCaloricoStore = create<DeficitCaloricoStore>()(
    persist(
        (set, get) => ({
            datosUsuario: {},
            apiKeyGemini: '',
            comidas: [],
            historial: [],
            cargandoIA: false,
            errorIA: null,
            updatedAt: 0,

            guardarDatosUsuario: datos => {
                set(prev => ({
                    datosUsuario: {...prev.datosUsuario, ...datos},
                    updatedAt: Date.now()
                }));
            },

            guardarApiKey: (keyIA) => {
                set({
                    apiKeyGemini: keyIA,
                    updatedAt: Date.now()
                });
            },

            agregarComida: (comida: ComidaRegistrada) => {
                set(prev => ({
                    comidas: [...prev.comidas, comida],
                    errorIA: null,
                    updatedAt: Date.now()
                }));
            },

            eliminarComida: (comidaId: string) => {
                set(prev => ({
                    comidas: prev.comidas.filter(c => c.id !== comidaId),
                    updatedAt: Date.now()
                }));
            },

            setCargandoIA: (cargando: boolean) => {
                set({cargandoIA: cargando, updatedAt: Date.now()});
            },

            setErrorIA: (error: string | null) => {
                set({errorIA: error, updatedAt: Date.now()});
            },

            /* [135A-7+8] Sincroniza desde servidor CON stale-protection por timestamp.
             * Solo acepta datos del servidor si su updatedAt es ESTRICTAMENTE mayor
             * que el local. Si el servidor devuelve datos mas viejos o iguales,
             * preserva el estado local (que es mas reciente). Esto evita la perdida
             * de datos cuando el auto-save (2s debounce) no ha completado antes de
             * un refresh de 30s, focus change, o recarga de pagina.
             * Misma proteccion que PluginStateRepository::setState() usa en PHP. */
            sincronizarDesdeServidor: estadoServidor => {
                const local = get();
                const serverUpdatedAt = estadoServidor.updatedAt ?? 0;
                if (serverUpdatedAt > 0 && serverUpdatedAt <= local.updatedAt) {
                    /* Servidor tiene datos mas viejos o iguales — preservar estado local */
                    return;
                }
                const apiKeyGeminiLocal = local.apiKeyGemini;
                set({
                    datosUsuario: estadoServidor.datosUsuario ?? {},
                    apiKeyGemini: estadoServidor.apiKeyGemini || apiKeyGeminiLocal,
                    comidas: estadoServidor.comidas ?? [],
                    historial: estadoServidor.historial ?? [],
                    cargandoIA: false,
                    errorIA: estadoServidor.errorIA ?? null,
                    updatedAt: serverUpdatedAt || local.updatedAt
                });
            },

            obtenerComidasHoy: (): ComidaRegistrada[] => {
                const hoy = obtenerFechaHoy();
                return get().comidas.filter(c => c.fecha === hoy);
            },

            obtenerCaloriasHoy: (): number => {
                const hoy = obtenerFechaHoy();
                return get()
                    .comidas.filter(c => c.fecha === hoy)
                    .reduce((sum, c) => sum + c.calorias, 0);
            },

            /* Consolida las comidas de un día en el historial */
            consolidarDia: (fecha: string, tmb: number) => {
                const {comidas, historial} = get();
                const comidasDia = comidas.filter(c => c.fecha === fecha);
                if (comidasDia.length === 0) return;

                const totalCalorias = comidasDia.reduce((sum, c) => sum + c.calorias, 0);

                const registro: RegistroDiario = {
                    fecha,
                    comidas: comidasDia,
                    totalCalorias,
                    tmb,
                    deficit: tmb - totalCalorias
                };

                /* Reemplazar si ya existe el día, o agregar */
                const indice = historial.findIndex(r => r.fecha === fecha);
                const nuevoHistorial = [...historial];
                if (indice >= 0) {
                    nuevoHistorial[indice] = registro;
                } else {
                    nuevoHistorial.unshift(registro);
                }

                set({
                    historial: nuevoHistorial.slice(0, MAX_HISTORIAL),
                    /* Limpiar comidas consolidadas del array principal */
                    comidas: comidas.filter(c => c.fecha !== fecha),
                    updatedAt: Date.now()
                });
            },

            obtenerHistorial: (dias: number): RegistroDiario[] => {
                return get().historial.slice(0, dias);
            }
        }),
        {
            name: 'glory-deficit-calorico'
        }
    )
);

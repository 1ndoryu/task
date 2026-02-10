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
    return ahora.toISOString().split('T')[0];
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

            guardarDatosUsuario: (datos) => {
                set(prev => ({
                    datosUsuario: {...prev.datosUsuario, ...datos}
                }));
            },

            guardarApiKey: (key) => {
                set({apiKeyGemini: key});
            },

            agregarComida: (comida: ComidaRegistrada) => {
                set(prev => ({
                    comidas: [...prev.comidas, comida],
                    errorIA: null
                }));
            },

            eliminarComida: (comidaId: string) => {
                set(prev => ({
                    comidas: prev.comidas.filter(c => c.id !== comidaId)
                }));
            },

            setCargandoIA: (cargando: boolean) => {
                set({cargandoIA: cargando});
            },

            setErrorIA: (error: string | null) => {
                set({errorIA: error});
            },

            obtenerComidasHoy: (): ComidaRegistrada[] => {
                const hoy = obtenerFechaHoy();
                return get().comidas.filter(c => c.fecha === hoy);
            },

            obtenerCaloriasHoy: (): number => {
                const hoy = obtenerFechaHoy();
                return get().comidas
                    .filter(c => c.fecha === hoy)
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
                    comidas: comidas.filter(c => c.fecha !== fecha)
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

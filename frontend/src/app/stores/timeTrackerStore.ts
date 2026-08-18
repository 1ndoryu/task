/*
 * stores/timeTrackerStore.ts
 * Store Zustand para el Time Tracker
 * Persistido en localStorage para sobrevivir recargas accidentales
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {TimeTrackerState, TimeTrackerActions, SesionTracking, TipoEntidadTracker, PausaTracker} from '../types/timeTracker';

/* Límite de historial para no saturar localStorage */
const MAX_HISTORIAL = 50;

/*
 * Calcula el tiempo efectivo de una sesión (excluyendo pausas)
 */
function calcularTiempoEfectivo(sesion: SesionTracking, ahora: number): number {
    const finReal = sesion.fin ?? ahora;
    const totalBruto = finReal - sesion.inicio;

    const totalPausas = sesion.pausas.reduce((acum, pausa) => {
        const finPausa = pausa.fin ?? ahora;
        return acum + (finPausa - pausa.inicio);
    }, 0);

    const tiempoBase = totalBruto - totalPausas;
    const ajusteManualMs = sesion.ajusteManualMs ?? 0;

    return Math.max(0, tiempoBase + ajusteManualMs);
}

/*
 * Genera un ID único para sesiones
 */
function generarIdSesion(): string {
    return `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

type TimeTrackerStore = TimeTrackerState & TimeTrackerActions;

export const useTimeTrackerStore = create<TimeTrackerStore>()(
    persist(
        (set, get) => ({
            sesionActiva: null,
            estado: 'inactivo',
            historialSesiones: [],

            iniciarTracking: (entidadId: number, tipoEntidad: TipoEntidadTracker, nombreEntidad: string, tiempoMinimoMinutos?: number) => {
                const sesionPrevia = get().sesionActiva;

                /* Si hay una sesión activa, completarla primero */
                if (sesionPrevia) {
                    get().completarTracking();
                }

                const nuevaSesion: SesionTracking = {
                    id: generarIdSesion(),
                    entidadId,
                    tipoEntidad,
                    nombreEntidad,
                    inicio: Date.now(),
                    pausas: [],
                    tiempoEfectivoMs: 0,
                    ajusteManualMs: 0,
                    tiempoMinimoMinutos,
                    completada: false
                };

                set({sesionActiva: nuevaSesion, estado: 'activo'});
            },

            pausarTracking: () => {
                const {sesionActiva, estado} = get();
                if (!sesionActiva || estado !== 'activo') return;

                const nuevaPausa: PausaTracker = {inicio: Date.now()};
                const pausasActualizadas = [...sesionActiva.pausas, nuevaPausa];

                set({
                    sesionActiva: {...sesionActiva, pausas: pausasActualizadas},
                    estado: 'pausado'
                });
            },

            reanudarTracking: () => {
                const {sesionActiva, estado} = get();
                if (!sesionActiva || estado !== 'pausado') return;

                /* Cerrar la última pausa abierta */
                const pausasActualizadas = sesionActiva.pausas.map((pausa, i) => {
                    if (i === sesionActiva.pausas.length - 1 && !pausa.fin) {
                        return {...pausa, fin: Date.now()};
                    }
                    return pausa;
                });

                set({
                    sesionActiva: {...sesionActiva, pausas: pausasActualizadas},
                    estado: 'activo'
                });
            },

            completarTracking: (): SesionTracking | null => {
                const {sesionActiva} = get();
                if (!sesionActiva) return null;

                const ahora = Date.now();

                /* Cerrar pausas abiertas */
                const pausasCerradas = sesionActiva.pausas.map(pausa => {
                    if (!pausa.fin) return {...pausa, fin: ahora};
                    return pausa;
                });

                const sesionFinal: SesionTracking = {
                    ...sesionActiva,
                    fin: ahora,
                    pausas: pausasCerradas,
                    tiempoEfectivoMs: calcularTiempoEfectivo({...sesionActiva, pausas: pausasCerradas, fin: ahora}, ahora),
                    completada: true
                };

                const historialActualizado = [sesionFinal, ...get().historialSesiones].slice(0, MAX_HISTORIAL);

                set({
                    sesionActiva: null,
                    estado: 'inactivo',
                    historialSesiones: historialActualizado
                });

                return sesionFinal;
            },

            cancelarTracking: () => {
                const {sesionActiva} = get();
                if (!sesionActiva) return;

                const ahora = Date.now();
                const sesionCancelada: SesionTracking = {
                    ...sesionActiva,
                    fin: ahora,
                    tiempoEfectivoMs: calcularTiempoEfectivo(sesionActiva, ahora),
                    completada: false,
                    cancelada: true
                };

                const historialActualizado = [sesionCancelada, ...get().historialSesiones].slice(0, MAX_HISTORIAL);

                set({
                    sesionActiva: null,
                    estado: 'inactivo',
                    historialSesiones: historialActualizado
                });
            },

            ajustarTiempoTracking: (deltaMs: number) => {
                const {sesionActiva} = get();
                if (!sesionActiva || deltaMs === 0) return;

                const ahora = Date.now();
                const tiempoActual = calcularTiempoEfectivo(sesionActiva, ahora);
                const tiempoObjetivo = Math.max(0, tiempoActual + deltaMs);

                const finReal = sesionActiva.fin ?? ahora;
                const totalBruto = finReal - sesionActiva.inicio;
                const totalPausas = sesionActiva.pausas.reduce((acum, pausa) => {
                    const finPausa = pausa.fin ?? ahora;
                    return acum + (finPausa - pausa.inicio);
                }, 0);

                const tiempoBase = totalBruto - totalPausas;
                const nuevoAjusteMs = tiempoObjetivo - tiempoBase;

                set({
                    sesionActiva: {
                        ...sesionActiva,
                        ajusteManualMs: nuevoAjusteMs
                    }
                });
            },

            obtenerTiempoEfectivoActual: (): number => {
                const {sesionActiva} = get();
                if (!sesionActiva) return 0;
                return calcularTiempoEfectivo(sesionActiva, Date.now());
            },

            limpiarHistorial: () => {
                set({historialSesiones: []});
            }
        }),
        {
            name: 'glory-time-tracker',
            /* Solo persistir estado y historial, no funciones */
            partialize: (state) => ({
                sesionActiva: state.sesionActiva,
                estado: state.estado,
                historialSesiones: state.historialSesiones
            })
        }
    )
);

/*
 * Selector para verificar si hay tracking activo
 */
export const useTrackingActivo = () => useTimeTrackerStore(s => s.estado !== 'inactivo');

/*
 * Selector para el estado del tracker
 */
export const useEstadoTracker = () => useTimeTrackerStore(s => s.estado);

/*
 * Selector para la sesión activa
 */
export const useSesionActiva = () => useTimeTrackerStore(s => s.sesionActiva);

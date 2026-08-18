/**
 * Store de Historial Detallado de Habitos (Zustand)
 *
 * Gestiona el historial detallado de hábitos (para modal/heatmap).
 * Separado de habitosStore para mantener el store principal ligero.
 *
 * @package App/React/stores
 */

import {create} from 'zustand';
import {devtools} from 'zustand/middleware';
import type {HistorialHabito, EstadoHabito, DiaHistorial, EstadisticasHabito} from '../types/historialHabitos';
import {habitosService} from '../services/habitosService';

/*
 * Tipos del Store
 */

export interface HistorialDetalladoEntry {
    historial: HistorialHabito;
    resumen7Dias: DiaHistorial[];
    estadisticas: EstadisticasHabito | null;
    timestamp: number;
    dias: number;
}

interface HabitosHistorialState {
    /* Cache de historial detallado por hábito */
    historialDetallado: Record<number, HistorialDetalladoEntry>;
}

interface HabitosHistorialActions {
    /* Carga de historial detallado */
    cargarHistorialDetallado: (habitoId: number, dias?: number) => Promise<void>;
    guardarHistorialDetallado: (habitoId: number, historial: HistorialHabito, resumen7Dias: DiaHistorial[], estadisticas: EstadisticasHabito | null, dias: number) => void;

    /* Gestión de Cache */
    invalidarHistorialDetallado: (habitoId: number) => void;
    limpiarTodoHistorialDetallado: () => void;
    obtenerHistorialDetallado: (habitoId: number, diasRequeridos?: number) => HistorialDetalladoEntry | null;

    /* Sincronización puntual (llamada desde habitosStore) */
    actualizarDiaHistorial: (habitoId: number, fecha: string, estado: EstadoHabito | null) => void;
}

export type HabitosHistorialStore = HabitosHistorialState & HabitosHistorialActions;

const CACHE_TTL_MS = 10 * 60 * 1000; /* 10 minutos */

export const useHabitosHistorialStore = create<HabitosHistorialStore>()(
    devtools(
        (set, get) => ({
            /* Estado inicial */
            historialDetallado: {},

            /* Acciones */
            cargarHistorialDetallado: async (habitoId, dias = 30) => {
                /* Verificar cache primero */
                const cacheEntry = get().obtenerHistorialDetallado(habitoId, dias);
                if (cacheEntry) {
                    return; /* Ya está en cache y es válido */
                }

                try {
                    /* Cargar desde servicio */
                    const data = await habitosService.obtenerHistorialDetallado(habitoId, dias);

                    /* Guardar en el store */
                    get().guardarHistorialDetallado(habitoId, data.historial, data.resumen7Dias, data.estadisticas, dias);
                } catch (error) {
                    console.error('[HabitosHistorialStore] Error cargando historial:', error);
                }
            },

            guardarHistorialDetallado: (habitoId, historial, resumen7Dias, estadisticas, dias) => {
                set(
                    state => ({
                        historialDetallado: {
                            ...state.historialDetallado,
                            [habitoId]: {
                                historial,
                                resumen7Dias,
                                estadisticas,
                                timestamp: Date.now(),
                                dias
                            }
                        }
                    }),
                    false,
                    'guardarHistorialDetallado'
                );
            },

            invalidarHistorialDetallado: habitoId => {
                set(
                    state => {
                        const nuevo = {...state.historialDetallado};
                        delete nuevo[habitoId];
                        return {historialDetallado: nuevo};
                    },
                    false,
                    'invalidarHistorialDetallado'
                );
            },

            limpiarTodoHistorialDetallado: () => {
                set({historialDetallado: {}}, false, 'limpiarTodoHistorialDetallado');
            },

            obtenerHistorialDetallado: (habitoId, diasRequeridos = 30) => {
                const entry = get().historialDetallado[habitoId];
                if (!entry) return null;

                /* Verificar TTL y días requeridos */
                const esValido = Date.now() - entry.timestamp < CACHE_TTL_MS && entry.dias >= diasRequeridos;
                if (!esValido) {
                    get().invalidarHistorialDetallado(habitoId);
                    return null;
                }

                return entry;
            },

            actualizarDiaHistorial: (habitoId, fecha, estado) => {
                set(
                    state => {
                        const entry = state.historialDetallado[habitoId];
                        if (!entry) return {}; /* No está en cache, nada que actualizar */

                        const nuevoHistorial = {...entry.historial};

                        if (estado === null) {
                            delete nuevoHistorial[fecha];
                        } else {
                            nuevoHistorial[fecha] = {
                                estado,
                                notas: nuevoHistorial[fecha]?.notas || null,
                                fechaRegistro: nuevoHistorial[fecha]?.fechaRegistro || new Date().toISOString()
                            };
                        }

                        return {
                            historialDetallado: {
                                ...state.historialDetallado,
                                [habitoId]: {
                                    ...entry,
                                    historial: nuevoHistorial,
                                    timestamp: Date.now() /* Refrescamos timestamp */
                                }
                            }
                        };
                    },
                    false,
                    'actualizarDiaHistorial'
                );
            }
        }),
        {name: 'HabitosHistorialStore'}
    )
);

/* Selectores básicos */
export const useHistorialDetallado = (id: number) => useHabitosHistorialStore(state => state.historialDetallado[id]);

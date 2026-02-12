/*
 * stores/ayunoStore.ts
 * Store Zustand para el plugin de ayuno intermitente
 * Persiste sesiones activas e historial en localStorage
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {AyunoState, AyunoActions, SesionAyuno} from '../types/ayuno';
import {habitosActions} from './habitosStore';
import {usePluginsStore} from './pluginsStore';

const MAX_HISTORIAL = 60;
const DURACION_MINIMA_COMPLETAR_MS = 12 * 60 * 60 * 1000;

function generarIdSesion(): string {
    return `ayuno_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type AyunoStore = AyunoState & AyunoActions;

export const useAyunoStore = create<AyunoStore>()(
    persist(
        (set, get) => ({
            estado: 'inactivo',
            sesionActiva: null,
            historial: [],
            ultimoAyunoCompletado: null,

            iniciarAyuno: (duracionHoras: number, horaUltimaComidaMs?: number) => {
                const ahora = Date.now();
                const inicioReal = horaUltimaComidaMs ?? ahora;
                set({
                    estado: 'activo',
                    sesionActiva: {
                        id: generarIdSesion(),
                        inicio: inicioReal,
                        horaUltimaComidaMs,
                        duracionObjetivoMs: duracionHoras * 60 * 60 * 1000
                    }
                });
            },

            terminarAyuno: (finMs?: number): SesionAyuno | null => {
                const {sesionActiva, historial} = get();
                if (!sesionActiva) return null;

                const ahora = finMs ?? Date.now();
                const tiempoEfectivoMs = Math.max(0, ahora - sesionActiva.inicio);
                const completada = tiempoEfectivoMs >= sesionActiva.duracionObjetivoMs;

                const sesionFinalizada: SesionAyuno = {
                    id: sesionActiva.id,
                    inicio: sesionActiva.inicio,
                    fin: ahora,
                    horaUltimaComidaMs: sesionActiva.horaUltimaComidaMs,
                    duracionObjetivoMs: sesionActiva.duracionObjetivoMs,
                    completada,
                    cancelada: false,
                    tiempoEfectivoMs
                };

                const nuevoHistorial = [sesionFinalizada, ...historial].slice(0, MAX_HISTORIAL);

                set({
                    estado: 'inactivo',
                    sesionActiva: null,
                    historial: nuevoHistorial,
                    ultimoAyunoCompletado: sesionFinalizada
                });

                /* Hábito especial: si el ayuno duró >= 12h, completar el hábito del plugin (si existe) */
                if (tiempoEfectivoMs >= DURACION_MINIMA_COMPLETAR_MS) {
                    const config = usePluginsStore.getState().configuracionPlugins['ayuno'] as unknown as {habitoId?: number} | undefined;
                    if (config?.habitoId) {
                        habitosActions.completarHabitoHoy(config.habitoId);
                    }
                }

                return sesionFinalizada;
            },

            actualizarDuracionObjetivo: (duracionHoras: number) => {
                const {sesionActiva, estado} = get();
                if (!sesionActiva || estado !== 'activo') return;

                const duracionObjetivoMs = Math.max(1, duracionHoras) * 60 * 60 * 1000;
                set({
                    sesionActiva: {
                        ...sesionActiva,
                        duracionObjetivoMs
                    }
                });
            },

            /* Reiniciar descarta el ayuno sin registrarlo en historial */
            reiniciarAyuno: () => {
                set({
                    estado: 'inactivo',
                    sesionActiva: null
                });
            },

            eliminarSesion: (sesionId: string) => {
                const {historial, ultimoAyunoCompletado} = get();
                const nuevoHistorial = historial.filter(s => s.id !== sesionId);
                set({
                    historial: nuevoHistorial,
                    ultimoAyunoCompletado: ultimoAyunoCompletado?.id === sesionId ? null : ultimoAyunoCompletado
                });
            },

            obtenerTiempoTranscurridoMs: (): number => {
                const {sesionActiva} = get();
                if (!sesionActiva) return 0;
                return Date.now() - sesionActiva.inicio;
            },

            obtenerUltimoAyuno: (): SesionAyuno | null => {
                const {historial} = get();
                return historial[0] ?? null;
            }
        }),
        {
            name: 'glory-ayuno'
        }
    )
);

/* Selectores */
export const useAyunoActivo = () => useAyunoStore(s => s.estado === 'activo');
export const useEstadoAyuno = () => useAyunoStore(s => s.estado);
export const useSesionAyunoActiva = () => useAyunoStore(s => s.sesionActiva);

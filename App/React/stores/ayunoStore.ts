/*
 * stores/ayunoStore.ts
 * Store Zustand para el plugin de ayuno intermitente
 * Persiste sesiones activas e historial en localStorage
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {AyunoState, AyunoActions, SesionAyuno} from '../types/ayuno';

const MAX_HISTORIAL = 60;

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
                set({
                    estado: 'activo',
                    sesionActiva: {
                        id: generarIdSesion(),
                        inicio: ahora,
                        horaUltimaComidaMs,
                        duracionObjetivoMs: duracionHoras * 60 * 60 * 1000
                    }
                });
            },

            terminarAyuno: (): SesionAyuno | null => {
                const {sesionActiva, historial} = get();
                if (!sesionActiva) return null;

                const ahora = Date.now();
                const tiempoEfectivoMs = ahora - sesionActiva.inicio;
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

                return sesionFinalizada;
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

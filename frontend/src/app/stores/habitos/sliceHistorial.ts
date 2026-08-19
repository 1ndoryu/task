/*
 * stores/habitos/sliceHistorial.ts
 * [H-F11-01] Slice de historial retroactivo: marcar/desmarcar días con
 * actualización optimista + rollback, estado de guardado y la actualización
 * de historial compartida (usada también por el slice de toggle).
 */

import {obtenerFechaHoy} from '../../utils/fecha';
import {habitosService} from '../../services/habitosService';
import {invalidarCache} from '../../services/actividadStore';
import {useHabitosHistorialStore} from '../habitosHistorialStore';
import type {HabitosSliceHistorial, CrearSliceHabitos} from './tipos';

export const crearSliceHistorial: CrearSliceHabitos<HabitosSliceHistorial> = (set, get) => ({
        estadoGuardado: 'idle',
        errorGuardado: null,

        marcarDia: async (habitoId, fecha, estado) => {
            const habito = get().habitos.find(h => h.id === habitoId);
            if (!habito) return false;

            /* Capturar estado anterior para posible rollback */
            const estadoAnteriorCompletados = [...(habito.historialCompletados || [])];
            const estadoAnteriorPospuestos = [...(habito.historialPospuestos || [])];

            /* Actualización optimista: actualizar UI inmediatamente */
            const estadoNormalizado = estado === 'omitido' ? null : estado;
            get().actualizarHistorialHabito(habitoId, fecha, estadoNormalizado);

            /* Marcar como guardando */
            set({estadoGuardado: 'guardando'}, false, 'marcarDia/guardando');

            try {
                /* Llamar al servicio */
                await habitosService.marcarDia(habitoId, fecha, estado);

                /* Confirmar guardado exitoso */
                set({estadoGuardado: 'idle', errorGuardado: null}, false, 'marcarDia/exito');

                /* Invalidar cache de actividad */
                invalidarCache();

                return true;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';

                /* Rollback: restaurar estado anterior */
                set(
                    state => {
                        const habitosRestaurados = state.habitos.map(h => {
                            if (h.id !== habitoId) return h;
                            return {
                                ...h,
                                historialCompletados: estadoAnteriorCompletados,
                                historialPospuestos: estadoAnteriorPospuestos
                            };
                        });

                        return {
                            habitos: habitosRestaurados,
                            estadoGuardado: 'error',
                            errorGuardado: mensaje
                        };
                    },
                    false,
                    'marcarDia/rollback'
                );

                return false;
            }
        },

        desmarcarDia: async (habitoId, fecha) => {
            const habito = get().habitos.find(h => h.id === habitoId);
            if (!habito) return false;

            /* Capturar estado anterior para posible rollback */
            const estadoAnteriorCompletados = [...(habito.historialCompletados || [])];
            const estadoAnteriorPospuestos = [...(habito.historialPospuestos || [])];

            /* Actualización optimista: eliminar de UI inmediatamente */
            get().actualizarHistorialHabito(habitoId, fecha, null);

            /* Marcar como guardando */
            set({estadoGuardado: 'guardando'}, false, 'desmarcarDia/guardando');

            try {
                /* Llamar al servicio */
                await habitosService.desmarcarDia(habitoId, fecha);

                /* Confirmar guardado exitoso */
                set({estadoGuardado: 'idle', errorGuardado: null}, false, 'desmarcarDia/exito');

                /* Invalidar cache de actividad */
                invalidarCache();

                return true;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';

                /* Rollback: restaurar estado anterior */
                set(
                    state => {
                        const habitosRestaurados = state.habitos.map(h => {
                            if (h.id !== habitoId) return h;
                            return {
                                ...h,
                                historialCompletados: estadoAnteriorCompletados,
                                historialPospuestos: estadoAnteriorPospuestos
                            };
                        });

                        return {
                            habitos: habitosRestaurados,
                            estadoGuardado: 'error',
                            errorGuardado: mensaje
                        };
                    },
                    false,
                    'desmarcarDia/rollback'
                );

                return false;
            }
        },

        /* Actualización de historial (para sincronización UI) */
        actualizarHistorialHabito: (id, fecha, estado) => {
            set(
                state => {
                    /* Actualizar hábito */
                    const habitosActualizados = state.habitos.map(h => {
                        if (h.id !== id) return h;

                        let historialCompletados = [...(h.historialCompletados || [])];
                        let historialPospuestos = [...(h.historialPospuestos || [])];

                        if (estado === null) {
                            historialCompletados = historialCompletados.filter(f => f !== fecha);
                            historialPospuestos = historialPospuestos.filter(f => f !== fecha);
                        } else if (estado === 'completado') {
                            if (!historialCompletados.includes(fecha)) {
                                historialCompletados = [...historialCompletados, fecha].slice(-365);
                            }
                            historialPospuestos = historialPospuestos.filter(f => f !== fecha);
                        } else if (estado === 'pospuesto') {
                            if (!historialPospuestos.includes(fecha)) {
                                historialPospuestos = [...historialPospuestos, fecha].slice(-90);
                            }
                            historialCompletados = historialCompletados.filter(f => f !== fecha);
                        }

                        /* [024A-35] Recalcular ultimoCompletado respetando horaFinDia.
                         * Si el "hoy" lógico está en el historial, usarlo como ultimoCompletado
                         * aunque existan fechas cronológicamente posteriores (posibles
                         * por cambios en horaFinDia). Esto evita que fueCompletadoHoy falle. */
                        const hoy = obtenerFechaHoy();
                        const fechasOrdenadas = [...historialCompletados].sort();
                        const ultimoCompletadoBase = fechasOrdenadas.length > 0 ? fechasOrdenadas[fechasOrdenadas.length - 1] : undefined;
                        const ultimoCompletado = historialCompletados.includes(hoy) ? hoy : ultimoCompletadoBase;

                        return {
                            ...h,
                            historialCompletados,
                            historialPospuestos,
                            ultimoCompletado
                        };
                    });

                    return {habitos: habitosActualizados};
                },
                false,
                'actualizarHistorialHabito'
            );

            /* Actualizar en store de historial detallado */
            useHabitosHistorialStore.getState().actualizarDiaHistorial(id, fecha, estado);
        }
    });

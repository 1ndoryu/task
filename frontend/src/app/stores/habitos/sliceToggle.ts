/*
 * stores/habitos/sliceToggle.ts
 * [H-F11-01] Slice del día actual: completar/desmarcar, completar hoy,
 * posponer (por día y por tiempo) y pausar/reanudar. Incluye el guard
 * contra double-toggle y el registro de actividad (heatmap) + auto-trackeo.
 */

import type {Habito} from '../../types/dashboard';
import {obtenerFechaHoy, fueCompletadoHoy} from '../../utils/fecha';
import {registrarHabitoCumplido, registrarHabitoDesmarcado, registrarHabitoPospuesto} from '../../services/actividadService';
import {calcularToggleHabito, calcularPosponerHabito, calcularPausarHabito} from '../../utils/habitosLogica';
import {useTimeTrackerStore} from '../timeTrackerStore';
import type {HabitosSliceToggle, CrearSliceHabitos} from './tipos';

/* [024A-33] Guard contra double-toggle: evita que dos llamadas rápidas al mismo
 * hábito generen duplicados en actividad o reviertan el estado por timing. */
const habitosEnProceso = new Set<number>();

export const crearSliceToggle: CrearSliceHabitos<HabitosSliceToggle> = (set, get) => ({
        toggleHabito: id => {
            /* [024A-33] Guard: si ya se está procesando este hábito, ignorar */
            if (habitosEnProceso.has(id)) return null;
            habitosEnProceso.add(id);

            const hoy = obtenerFechaHoy();
            const habito = get().habitos.find(h => h.id === id);
            if (!habito) {
                habitosEnProceso.delete(id);
                return null;
            }

            const estadoAnterior = {...habito, historialCompletados: [...(habito.historialCompletados || [])]};
            const estabaCompletadoHoy = fueCompletadoHoy(habito.ultimoCompletado, habito.historialCompletados);

            const {accion, nuevoHabito} = calcularToggleHabito(habito, hoy, estabaCompletadoHoy);
            /* [014A-19] Timestamp per-entity */
            nuevoHabito.updatedAt = Date.now();

            set(state => ({habitos: state.habitos.map(h => (h.id === id ? nuevoHabito : h))}), false, `toggleHabito/${accion}`);

            /* Actualizar historial detallado si existe */
            get().actualizarHistorialHabito(id, hoy, accion === 'completado' ? 'completado' : null);

            /* Registrar actividad (invalida cache internamente al confirmar éxito) */
            if (accion === 'completado') {
                /* [253A-2] Auto-completar tracking si el hábito estaba siendo trackeado */
                const ts = useTimeTrackerStore.getState();
                if (ts.sesionActiva?.entidadId === id && ts.sesionActiva.tipoEntidad === 'habito') {
                    ts.completarTracking();
                }
                registrarHabitoCumplido(id, habito.nombre).finally(() => habitosEnProceso.delete(id));
            } else {
                registrarHabitoDesmarcado(id, habito.nombre).finally(() => habitosEnProceso.delete(id));
            }

            return {accion, estadoAnterior};
        },

        /* Completar hoy (solo marca completado si aún no lo está) */
        completarHabitoHoy: (id, detallesActividad) => {
            /* [024A-33] Guard contra double-toggle */
            if (habitosEnProceso.has(id)) return false;
            habitosEnProceso.add(id);

            const hoy = obtenerFechaHoy();
            const habito = get().habitos.find(h => h.id === id);
            if (!habito) {
                habitosEnProceso.delete(id);
                return false;
            }

            const yaCompletado = fueCompletadoHoy(habito.ultimoCompletado) || habito.historialCompletados?.includes(hoy);
            if (yaCompletado) {
                habitosEnProceso.delete(id);
                return false;
            }

            const {accion, nuevoHabito} = calcularToggleHabito(habito, hoy, false);
            if (accion !== 'completado') {
                habitosEnProceso.delete(id);
                return false;
            }

            set(state => ({habitos: state.habitos.map(h => (h.id === id ? nuevoHabito : h))}), false, 'completarHabitoHoy');

            get().actualizarHistorialHabito(id, hoy, 'completado');

            /* [253A-2] Auto-completar tracking si el hábito estaba siendo trackeado */
            const ts = useTimeTrackerStore.getState();
            if (ts.sesionActiva?.entidadId === id && ts.sesionActiva.tipoEntidad === 'habito') {
                ts.completarTracking();
            }

            registrarHabitoCumplido(id, habito.nombre, detallesActividad).finally(() => habitosEnProceso.delete(id));
            return true;
        },

        posponerHabito: id => {
            const hoy = obtenerFechaHoy();
            const habito = get().habitos.find(h => h.id === id);
            if (!habito) return null;

            const estadoAnterior = {
                ...habito,
                historialPospuestos: [...(habito.historialPospuestos || [])]
            };
            const estabaPospuestoHoy = habito.historialPospuestos?.includes(hoy) ?? false;

            const {accion, nuevoHabito} = calcularPosponerHabito(habito, hoy, estabaPospuestoHoy);

            set(
                state => ({habitos: state.habitos.map(h => (h.id === id ? nuevoHabito : h))}),
                false,
                `posponerHabito/${accion === 'pospuesto' ? 'agregar' : 'quitar'}`
            );

            /* Actualizar historial detallado */
            get().actualizarHistorialHabito(id, hoy, accion === 'pospuesto' ? 'pospuesto' : null);

            /* Registrar actividad */
            if (accion === 'pospuesto') {
                registrarHabitoPospuesto(id, habito.nombre);
            }

            return {accion, estadoAnterior};
        },

        /* [2303A-41] Posponer hábito por tiempo (hasta fecha ISO). null = quitar posposición temporal */
        posponerHabitoConTiempo: (id, hasta) => {
            const hoy = obtenerFechaHoy();
            const habito = get().habitos.find(h => h.id === id);
            if (!habito) return;

            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== id) return h;
                        if (hasta === null) {
                            /* Quitar posposición temporal y también remover hoy de historialPospuestos */
                            const {pospuestoHasta: _, ...sinPospuesto} = h;
                            return {
                                ...sinPospuesto,
                                historialPospuestos: (h.historialPospuestos || []).filter(f => f !== hoy)
                            } as Habito;
                        }
                        /* Establecer posposición temporal y también marcar hoy en historialPospuestos */
                        const historialHoy = (h.historialPospuestos || []).includes(hoy)
                            ? h.historialPospuestos
                            : [...(h.historialPospuestos || []), hoy];
                        return {...h, pospuestoHasta: hasta, historialPospuestos: historialHoy};
                    })
                }),
                false,
                `posponerHabitoConTiempo/${hasta ? 'establecer' : 'quitar'}`
            );
        },

        pausarHabito: id => {
            const hoy = obtenerFechaHoy();
            const habito = get().habitos.find(h => h.id === id);
            if (!habito) return null;

            const estadoAnterior = {
                ...habito,
                pausado: habito.pausado,
                fechaPausa: habito.fechaPausa
            };
            const estaPausado = habito.pausado ?? false;

            const {accion, nuevoHabito} = calcularPausarHabito(habito, hoy, estaPausado);

            set(
                state => ({habitos: state.habitos.map(h => (h.id === id ? nuevoHabito : h))}),
                false,
                `pausarHabito/${accion === 'pausado' ? 'pausar' : 'reanudar'}`
            );

            return {accion, estadoAnterior};
        }
    });

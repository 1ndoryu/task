/**
 * Store de Habitos (Zustand)
 *
 * [H-F11-01] Compuesto por slices de dominio en stores/habitos/:
 *   - sliceCrud       → estado base + CRUD/restauración
 *   - sliceToggle     → completar/posponer/pausar del día actual
 *   - sliceHistorial  → marcar/desmarcar días (optimista + rollback)
 *   - sliceOrden      → orden de tareas, drag & drop y panel de ejecución
 *   - sliceSubHabitos → CRUD/historial de subhábitos
 * La persistencia, el subscriber de dedup y la fachada habitosActions
 * se mantienen aquí. La API pública no cambia.
 *
 * @package App/React/stores
 */

import {create} from 'zustand';
import {persist, devtools} from 'zustand/middleware';
import type {Habito, DatosNuevoHabito, DatosNuevoSubHabito} from '../types/dashboard';
import type {EstadoHabito, DiaHistorial} from '../types/historialHabitos';
import {generarResumen7Dias} from '../utils/habitosLogica';
import {crearSliceCrud} from './habitos/sliceCrud';
import {crearSliceToggle} from './habitos/sliceToggle';
import {crearSliceHistorial} from './habitos/sliceHistorial';
import {crearSliceOrden} from './habitos/sliceOrden';
import {crearSliceSubHabitos} from './habitos/sliceSubHabitos';
import {sanitizarSubhabitos, limpiarSubhabitosDuplicados} from './habitos/dedupSubhabitos';
import {normalizarHabitos} from './habitos/normalizarHabitos';
import type {HabitosStore} from './habitos/tipos';

export type {HabitosStore} from './habitos/tipos';

/*
 * Store principal
 */
export const useHabitosStore = create<HabitosStore>()(
    devtools(
        persist(
            (set, get, store) => ({
                ...crearSliceCrud(set, get, store),
                ...crearSliceToggle(set, get, store),
                ...crearSliceHistorial(set, get, store),
                ...crearSliceOrden(set, get, store),
                ...crearSliceSubHabitos(set, get, store)
            }),
            {
                name: 'glory-habitos-store',
                partialize: state => ({
                    /* Solo persistir hábitos, no historial detallado ni estado temporal */
                    habitos: state.habitos
                }),
                version: 1,
                /* [044A-25] Limpiar subhábitos al rehidratar desde localStorage
                 * (ver dedupSubhabitos.ts). Fuerza re-persist vía setState para que
                 * localStorage se actualice; sin esto la limpieza era efímera. */
                onRehydrateStorage: () => state => {
                    if (!state) return;
                    const {habitos: habitosLimpiados, eliminados: totalEliminados} = sanitizarSubhabitos(state.habitos);
                    /* [H-F11-01] Curar registros malformados (falta nombre/importancia):
                     * una pestaña con código a medio refactor puede persistir hábitos
                     * parciales que reventaban FilaHabito al rehidratar. */
                    const {habitos: habitosNormalizados, corregidos: totalNormalizados} = normalizarHabitos(habitosLimpiados);
                    if (totalEliminados > 0 || totalNormalizados > 0) {
                        console.warn(
                            `[HabitosStore] onRehydrate: ${totalEliminados} subhábitos eliminados (fantasma/duplicados), ${totalNormalizados} hábitos normalizados (campos faltantes)`
                        );
                        /* Forzar setState para que persist escriba los cambios a localStorage */
                        setTimeout(() => {
                            useHabitosStore.setState({habitos: habitosNormalizados});
                        }, 0);
                    }
                }
            }
        ),
        {name: 'HabitosStore', enabled: typeof window !== 'undefined' && window.location.hostname === 'localhost'}
    )
);

/* [044A-27] Subscriber global: deduplicar subhábitos en CADA cambio de estado.
 * Esto atrapa duplicados que entren por CUALQUIER vía (set directo, restaurar,
 * WebSocket merge, etc.) sin importar si pasan por setHabitos o no.
 * Solo actúa si detecta duplicados — no genera re-renders innecesarios. */
let dedupEnCurso = false;
useHabitosStore.subscribe(state => {
    if (dedupEnCurso) return;
    let necesitaLimpieza = false;

    for (const habito of state.habitos) {
        if (!habito.subhabitos || habito.subhabitos.length <= 1) continue;
        const nombresVistos = new Set<string>();
        for (const sh of habito.subhabitos) {
            if (!sh.nombre || !sh.nombre.trim()) { necesitaLimpieza = true; break; }
            const norm = sh.nombre.trim().toLowerCase();
            if (nombresVistos.has(norm)) { necesitaLimpieza = true; break; }
            nombresVistos.add(norm);
        }
        if (necesitaLimpieza) break;
    }

    if (!necesitaLimpieza) return;

    dedupEnCurso = true;
    useHabitosStore.setState({habitos: limpiarSubhabitosDuplicados(state.habitos)});
    dedupEnCurso = false;
});

/*
 * Selectores optimizados
 */

/* Obtener todos los hábitos */
export const useHabitos = () => useHabitosStore(state => state.habitos);

/* Obtener un hábito por ID */
export const useHabito = (id: number) => useHabitosStore(state => state.habitos.find(h => h.id === id));

/* Obtener estado de inicialización */
export const useHabitosInicializado = () => useHabitosStore(state => state.inicializado);

/* Obtener estado de un día específico para un hábito */
export const useEstadoDia = (habitoId: number, fecha: string): EstadoHabito | null => {
    return useHabitosStore(state => {
        const habito = state.habitos.find(h => h.id === habitoId);
        if (!habito) return null;

        if (habito.historialCompletados?.includes(fecha)) return 'completado';
        if (habito.historialPospuestos?.includes(fecha)) return 'pospuesto';

        return null;
    });
};

/* Obtener resumen de últimos 7 días para un hábito */
export const useResumen7Dias = (habitoId: number): DiaHistorial[] => {
    return useHabitosStore(state => {
        const habito = state.habitos.find(h => h.id === habitoId);
        if (!habito) return [];
        return generarResumen7Dias(habito);
    });
};

/* Obtener estado de guardado */
export const useEstadoGuardado = () => useHabitosStore(state => state.estadoGuardado);

/* Obtener error de guardado */
export const useErrorGuardado = () => useHabitosStore(state => state.errorGuardado);

/*
 * Acciones del store (para uso fuera de componentes React)
 */
export const habitosActions = {
    setHabitos: (habitos: Habito[]) => useHabitosStore.getState().setHabitos(habitos),
    crearHabito: (datos: DatosNuevoHabito) => useHabitosStore.getState().crearHabito(datos),
    editarHabito: (id: number, datos: DatosNuevoHabito) => useHabitosStore.getState().editarHabito(id, datos),
    eliminarHabito: (id: number) => useHabitosStore.getState().eliminarHabito(id),
    toggleHabito: (id: number) => useHabitosStore.getState().toggleHabito(id),
    completarHabitoHoy: (id: number, detallesActividad?: Record<string, unknown>) => useHabitosStore.getState().completarHabitoHoy(id, detallesActividad),
    posponerHabito: (id: number) => useHabitosStore.getState().posponerHabito(id),
    posponerHabitoConTiempo: (id: number, hasta: string | null) => useHabitosStore.getState().posponerHabitoConTiempo(id, hasta),
    pausarHabito: (id: number) => useHabitosStore.getState().pausarHabito(id),
    marcarDia: (habitoId: number, fecha: string, estado: EstadoHabito) => useHabitosStore.getState().marcarDia(habitoId, fecha, estado),
    desmarcarDia: (habitoId: number, fecha: string) => useHabitosStore.getState().desmarcarDia(habitoId, fecha),
    actualizarHistorialHabito: (id: number, fecha: string, estado: 'completado' | 'pospuesto' | null) => useHabitosStore.getState().actualizarHistorialHabito(id, fecha, estado),

    restaurarHabito: (habito: Habito) => useHabitosStore.getState().restaurarHabito(habito),
    getHabitos: () => useHabitosStore.getState().habitos,
    getHabito: (id: number) => useHabitosStore.getState().habitos.find(h => h.id === id),
    actualizarOrdenTareasHabito: (habitoId: number, tareasIds: number[]) => useHabitosStore.getState().actualizarOrdenTareasHabito(habitoId, tareasIds),
    /* [218A-1] Reordenar hábitos (drag & drop manual) */
    reordenarHabitos: (habitosReordenados: Habito[]) => useHabitosStore.getState().reordenarHabitos(habitosReordenados),
    /* [218A-2] Actualizar orden de hábitos desde drag en panel de ejecución */
    actualizarOrdenHabitos: (ordenes: Map<number, number>) => useHabitosStore.getState().actualizarOrdenHabitos(ordenes),
    /* Orden exclusivo para el panel de Ejecución */
    actualizarOrdenEjecucionHabitos: (ordenes: Map<number, number>) => useHabitosStore.getState().actualizarOrdenEjecucionHabitos(ordenes),

    /* SubHabitos */
    crearSubHabito: (habitoId: number, datos: DatosNuevoSubHabito) => useHabitosStore.getState().crearSubHabito(habitoId, datos),
    editarSubHabito: (habitoId: number, subHabitoId: number, datos: Partial<DatosNuevoSubHabito>) => useHabitosStore.getState().editarSubHabito(habitoId, subHabitoId, datos),
    eliminarSubHabito: (habitoId: number, subHabitoId: number) => useHabitosStore.getState().eliminarSubHabito(habitoId, subHabitoId),
    toggleSubHabito: (habitoId: number, subHabitoId: number) => useHabitosStore.getState().toggleSubHabito(habitoId, subHabitoId),
    posponerSubHabitoConTiempo: (habitoId: number, subHabitoId: number, hasta: string | null) => useHabitosStore.getState().posponerSubHabitoConTiempo(habitoId, subHabitoId, hasta),

    /* [217A-3] Historial retroactivo de subhábitos */
    marcarDiaSubHabito: (habitoId: number, subHabitoId: number, fecha: string, estado: EstadoHabito) => useHabitosStore.getState().marcarDiaSubHabito(habitoId, subHabitoId, fecha, estado),
    desmarcarDiaSubHabito: (habitoId: number, subHabitoId: number, fecha: string) => useHabitosStore.getState().desmarcarDiaSubHabito(habitoId, subHabitoId, fecha)
};

/* Exponer store globalmente para debugging/migración */
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.useHabitosStore = useHabitosStore;
}

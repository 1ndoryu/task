/*
 * stores/habitos/tipos.ts
 * [H-F11-01] Tipos del store de hábitos, dividido por slices de dominio.
 * La interfaz pública (HabitosStore) es idéntica a la del store monolítico:
 * los consumidores siguen importando useHabitosStore/habitosActions desde
 * stores/habitosStore.ts.
 */

import type {StateCreator} from 'zustand';
import type {Habito, DatosNuevoHabito, SubHabito, DatosNuevoSubHabito} from '../../types/dashboard';
import type {EstadoHabito} from '../../types/historialHabitos';

/* CRUD de hábitos: estado base + creación/edición/eliminación/restauración */
export interface HabitosSliceCrud {
    habitos: Habito[];
    inicializado: boolean;
    setHabitos: (habitos: Habito[]) => void;
    marcarInicializado: () => void;
    crearHabito: (datos: DatosNuevoHabito) => Habito;
    editarHabito: (id: number, datos: DatosNuevoHabito) => void;
    eliminarHabito: (id: number) => Habito | null;
    restaurarHabito: (habito: Habito) => void;
    restaurarHabitos: (habitos: Habito[]) => void;
}

/* Toggle del día actual: completar/desmarcar, posponer y pausar */
export interface HabitosSliceToggle {
    toggleHabito: (id: number) => {accion: 'completado' | 'desmarcado'; estadoAnterior: Habito} | null;
    /* Completar hoy sin permitir desmarcar (uso: hábitos especiales controlados por plugins) */
    completarHabitoHoy: (id: number, detallesActividad?: Record<string, unknown>) => boolean;
    posponerHabito: (id: number) => {accion: 'pospuesto' | 'despospuesto'; estadoAnterior: Habito} | null;
    /* [2303A-41] Posponer hábito por tiempo (hasta fecha ISO). null = quitar posposición temporal */
    posponerHabitoConTiempo: (id: number, hasta: string | null) => void;
    pausarHabito: (id: number) => {accion: 'pausado' | 'reanudado'; estadoAnterior: Habito} | null;
}

/* Historial retroactivo + estado de guardado (optimista con rollback) */
export interface HabitosSliceHistorial {
    estadoGuardado: 'idle' | 'guardando' | 'error';
    errorGuardado: string | null;
    marcarDia: (habitoId: number, fecha: string, estado: EstadoHabito) => Promise<boolean>;
    desmarcarDia: (habitoId: number, fecha: string) => Promise<boolean>;
    /* Actualización de historial (sincronización UI) */
    actualizarHistorialHabito: (id: number, fecha: string, estado: 'completado' | 'pospuesto' | null) => void;
}

/* Orden: tareas del hábito, drag & drop manual y panel de ejecución */
export interface HabitosSliceOrden {
    actualizarOrdenTareasHabito: (habitoId: number, tareasIds: number[]) => void;
    /* [218A-1] Reordenar hábitos (drag & drop manual). Actualiza campo orden de cada hábito. */
    reordenarHabitos: (habitosReordenados: Habito[]) => void;
    /* [218A-2] Actualizar orden de hábitos desde drag en panel de ejecución. Recibe Map<habitoId, orden>. */
    actualizarOrdenHabitos: (ordenes: Map<number, number>) => void;
    /* Orden específico para el panel de Ejecución (no toca el panel de Hábitos) */
    actualizarOrdenEjecucionHabitos: (ordenes: Map<number, number>) => void;
}

/* Subhábitos: CRUD, toggle, posponer y historial retroactivo */
export interface HabitosSliceSubHabitos {
    crearSubHabito: (habitoId: number, datos: DatosNuevoSubHabito) => SubHabito | null;
    /* [217A-4] Partial: permite actualizar solo importancia, frecuencia, etc. sin requerir nombre */
    editarSubHabito: (habitoId: number, subHabitoId: number, datos: Partial<DatosNuevoSubHabito>) => void;
    eliminarSubHabito: (habitoId: number, subHabitoId: number) => SubHabito | null;
    toggleSubHabito: (habitoId: number, subHabitoId: number) => {accion: 'completado' | 'desmarcado'} | null;
    /* Posponer subhábito por tiempo (independiente del padre). null = quitar */
    posponerSubHabitoConTiempo: (habitoId: number, subHabitoId: number, hasta: string | null) => void;
    /* [217A-3] Historial retroactivo de subhábitos (para mapa de calor) */
    marcarDiaSubHabito: (habitoId: number, subHabitoId: number, fecha: string, estado: EstadoHabito) => boolean;
    desmarcarDiaSubHabito: (habitoId: number, subHabitoId: number, fecha: string) => boolean;
}

export type HabitosStore = HabitosSliceCrud &
    HabitosSliceToggle &
    HabitosSliceHistorial &
    HabitosSliceOrden &
    HabitosSliceSubHabitos;

/* Firma de los creadores de slice: usa el set/get compuesto por la cadena de
 * middlewares del store (devtools outer + persist inner), que expone el
 * set con nombre de acción para devtools. */
export type CrearSliceHabitos<S> = StateCreator<HabitosStore, [['zustand/devtools', never]], [], S>;

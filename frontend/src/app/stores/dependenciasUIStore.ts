/**
 * dependenciasUIStore
 * Gestiona el estado visual de destello para dependencias condicionales.
 * Permite que un elemento (tarea, habito, subhabito) parpadee cuando
 * se intenta completar un elemento bloqueado.
 */

import {create} from 'zustand';

export interface DependenciaDestello {
    tipo: 'tarea' | 'habito' | 'subhabito';
    id: number;
    padreId?: number;
}

interface DependenciasUIState {
    destello: DependenciaDestello | null;
    destelloTick: number;
    /* [19-08-2026] Solicitud de apertura directa del selector de dependencias
     * desde el menú contextual (tarea/hábito/subhábito). El formulario de
     * edición la consume al montar y abre el ModalDependencias automáticamente. */
    abrirDependenciasDe: DependenciaDestello | null;
}

interface DependenciasUIActions {
    activarDestello: (destello: DependenciaDestello) => void;
    limpiarDestello: () => void;
    solicitarAbrirDependencias: (destello: DependenciaDestello) => void;
    consumirSolicitudDependencias: () => void;
}

export type DependenciasUIStore = DependenciasUIState & DependenciasUIActions;

export const useDependenciasUIStore = create<DependenciasUIStore>()(set => ({
    destello: null,
    destelloTick: 0,
    abrirDependenciasDe: null,

    activarDestello: destello =>
        set(state => ({
            destello,
            destelloTick: state.destelloTick + 1
        })),

    limpiarDestello: () =>
        set({
            destello: null,
            destelloTick: 0
        }),

    solicitarAbrirDependencias: destello =>
        set({
            abrirDependenciasDe: destello
        }),

    consumirSolicitudDependencias: () =>
        set({
            abrirDependenciasDe: null
        })
}));

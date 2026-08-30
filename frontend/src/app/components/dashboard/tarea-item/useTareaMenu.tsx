/* [H-F13-01] useTareaMenu quedó como composición: la construcción de opciones
 * vive en opcionesMenuTarea.ts (funciones puras) y el dispatch por entidad en
 * manejarOpcionesMenu.ts (un handler por dominio: hábito, subhábito, tarea). */

import React, {useCallback, useMemo} from 'react';
import type {Tarea, TareaHabito, TareaSubHabito, DatosEdicionTarea, DatosNuevoHabito} from '../../../types/dashboard';
import {esTareaSubHabito} from '../../../types/dashboard';
import type {OpcionMenu} from '../../shared/MenuContextual';
import {useMenuContextualConId} from '../../../hooks/useMenuContextualGlobal';
import {useTimeTrackerStore} from '../../../stores/timeTrackerStore';
import {useShallow} from 'zustand/react/shallow';
import {
    construirOpcionesHabitoMenu,
    construirOpcionesSubHabitoMenu,
    construirOpcionesTareaMenu
} from './opcionesMenuTarea';
import {manejarOpcionHabito, manejarOpcionSubHabito} from './manejarOpcionHabito';
import {manejarOpcionTarea} from './manejarOpcionTarea';

/* UseTareaMenuProps se divide en fragmentos cohesivos compuestos vía extends:
 * base de tarea + acciones de hábito + acciones de subhábito + selección. */
interface UseTareaMenuBase {
    tarea: Tarea;
    esHabito: boolean;
    onEditar?: (datos: DatosEdicionTarea) => void;
    onEliminar?: () => void;
    onConfigurar?: () => void;
    onCrearNueva?: (parentId: number | undefined, tareaActualId: number) => void;
    onMoverProyecto?: () => void;
    onCompartir?: () => void;
}

/* Props para hábitos */
interface UseTareaMenuHabitoProps {
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onToggleHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    onPosponerHabitoConTiempo?: (habitoId: number, hasta: string | null) => void;
    onPausarHabito?: (habitoId: number) => void;
    onActualizarHabito?: (habitoId: number, datos: Partial<DatosNuevoHabito>) => void;
    habitoCompletadoHoy?: boolean;
    habitoPausado?: boolean;
    habitoPospuestoHoy?: boolean;
}

/* [207A-3] Props para subhábitos */
interface UseTareaMenuSubHabitoProps {
    onToggleSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    onEliminarSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    onPosponerSubHabitoConTiempo?: (habitoPadreId: number, subHabitoId: number, hasta: string | null) => void;
    onActualizarSubHabito?: (habitoPadreId: number, subHabitoId: number, datos: Partial<DatosNuevoHabito>) => void;
    onConfigurarSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
}

/* Props para selección múltiple */
interface UseTareaMenuSeleccionProps {
    estaSeleccionada?: boolean;
    cantidadSeleccionadas?: number;
}

interface UseTareaMenuProps extends UseTareaMenuBase, UseTareaMenuHabitoProps, UseTareaMenuSubHabitoProps, UseTareaMenuSeleccionProps {}

export function useTareaMenu({tarea, esHabito, onEditar, onEliminar, onConfigurar, onCrearNueva, onMoverProyecto, onCompartir, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPosponerHabitoConTiempo, onPausarHabito, onActualizarHabito, habitoCompletadoHoy, habitoPausado, habitoPospuestoHoy, onToggleSubHabito, onEliminarSubHabito, onPosponerSubHabitoConTiempo, onActualizarSubHabito, onConfigurarSubHabito, estaSeleccionada = false, cantidadSeleccionadas = 0}: UseTareaMenuProps) {
    /* Menú contextual coordinado globalmente */
    const menuContextual = useMenuContextualConId(`tarea-${tarea.id}`);
    const tracker = useTimeTrackerStore(useShallow(s => ({sesionActiva: s.sesionActiva, estado: s.estado, iniciarTracking: s.iniciarTracking, completarTracking: s.completarTracking})));

    const manejarClickDerecho = useCallback(
        (evento: React.MouseEvent) => {
            /* Si esta tarea es parte de una selección múltiple (>1), dejar que el padre maneje el evento (Menú Masivo) */
            if (estaSeleccionada && cantidadSeleccionadas > 1) {
                return;
            }

            evento.preventDefault();
            evento.stopPropagation();
            menuContextual.toggle(evento.clientX, evento.clientY);
        },
        [menuContextual, estaSeleccionada, cantidadSeleccionadas]
    );

    /* [H-F13-01] Dispatch por dominio: cada tipo de entidad delega en su handler */
    const manejarOpcionMenu = useCallback(
        (opcionId: string) => {
            if (esHabito) {
                manejarOpcionHabito(opcionId, {
                    tarea: tarea as TareaHabito,
                    tracker,
                    onEditarHabito,
                    onEliminarHabito,
                    onToggleHabito,
                    onPosponerHabito,
                    onPosponerHabitoConTiempo,
                    onPausarHabito,
                    onActualizarHabito
                });
                return;
            }

            if (esTareaSubHabito(tarea)) {
                manejarOpcionSubHabito(opcionId, {
                    tarea: tarea as TareaSubHabito,
                    tracker,
                    onToggleSubHabito,
                    onEliminarSubHabito,
                    onPosponerSubHabitoConTiempo,
                    onActualizarSubHabito,
                    onConfigurarSubHabito
                });
                return;
            }

            manejarOpcionTarea(opcionId, {
                tarea,
                tracker,
                onEditar,
                onEliminar,
                onConfigurar,
                onCrearNueva,
                onMoverProyecto,
                onCompartir
            });
        },
        [onEliminar, onEditar, onConfigurar, onMoverProyecto, onCompartir, esHabito, tarea, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPosponerHabitoConTiempo, onPausarHabito, onActualizarHabito, tracker, onPosponerSubHabitoConTiempo, onActualizarSubHabito, onConfigurarSubHabito, onToggleSubHabito, onEliminarSubHabito, onCrearNueva]
    );

    /* Detectar si esta tarea/hábito está siendo trackeada */
    const entidadTrackingId = esHabito ? (tarea as TareaHabito).habitoId : esTareaSubHabito(tarea) ? (tarea as TareaSubHabito).subHabitoId : tarea.id;
    const estaEnTracking = tracker.sesionActiva?.entidadId === entidadTrackingId && tracker.estado !== 'inactivo';

    /* Opciones del menu contextual (construidas por dominio) */
    const opcionesMenu: OpcionMenu[] = useMemo(() => {
        if (esHabito) return []; // Se generan por separado para hábitos

        if (esTareaSubHabito(tarea)) {
            return construirOpcionesSubHabitoMenu(estaEnTracking);
        }

        return construirOpcionesTareaMenu(tarea, estaEnTracking);
    }, [tarea, esHabito, estaEnTracking]);

    /* Opciones para hábitos */
    const opcionesMenuHabito: OpcionMenu[] = useMemo(() => {
        if (!esHabito) {
            return [];
        }

        return construirOpcionesHabitoMenu({
            completadoHoy: habitoCompletadoHoy ?? false,
            estaPausado: habitoPausado ?? false,
            tieneActualizar: !!onActualizarHabito,
            pospuestoHoy: habitoPospuestoHoy ?? false,
            estaEnTracking
        });
    }, [habitoCompletadoHoy, habitoPausado, onActualizarHabito, esHabito, habitoPospuestoHoy, estaEnTracking]);

    return {
        menuContextual,
        manejarClickDerecho,
        manejarOpcionMenu,
        opcionesMenu,
        opcionesMenuHabito
    };
}

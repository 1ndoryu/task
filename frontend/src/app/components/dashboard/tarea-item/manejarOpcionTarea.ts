/* [H-F13-01] Handler del menú contextual para tareas normales, extraído de
 * useTareaMenu. Los handlers de hábitos/subhábitos viven en
 * manejarOpcionHabito.ts. */

import type {DatosEdicionTarea, NivelPrioridad, NivelUrgencia, Tarea} from '../../../types/dashboard';
import {calcularFechaPosponer} from '../../../config/opcionesMenuHabito';
import {useDependenciasUIStore} from '../../../stores/dependenciasUIStore';
import type {TrackerAcciones} from './manejarOpcionHabito';

export interface CtxOpcionTarea {
    tarea: Tarea;
    tracker: TrackerAcciones;
    onEditar?: (datos: DatosEdicionTarea) => void;
    onEliminar?: () => void;
    onConfigurar?: () => void;
    onCrearNueva?: (parentId: number | undefined, tareaActualId: number) => void;
    onMoverProyecto?: () => void;
    onCompartir?: () => void;
}

export function manejarOpcionTarea(opcionId: string, {tarea, tracker, onEditar, onEliminar, onConfigurar, onCrearNueva, onMoverProyecto, onCompartir}: CtxOpcionTarea): void {
    if (opcionId === 'iniciar-tracking') {
        tracker.iniciarTracking(tarea.id, 'tarea', tarea.texto);
        return;
    }
    if (opcionId === 'detener-tracking') {
        tracker.completarTracking();
        return;
    }

    if (opcionId === 'eliminar') {
        onEliminar?.();
    } else if (opcionId === 'dependencias') {
        /* [19-08-2026] Acceso directo: abre el modal de configuración de la
         * tarea con el selector de dependencias ya abierto. */
        useDependenciasUIStore.getState().solicitarAbrirDependencias({tipo: 'tarea', id: tarea.id});
        onConfigurar?.();
    } else if (opcionId === 'configurar') {
        onConfigurar?.();
    } else if (opcionId === 'agregar-subtarea') {
        onCrearNueva?.(tarea.id, tarea.id);
    } else if (opcionId === 'sin-prioridad') {
        onEditar?.({prioridad: null});
    } else if (opcionId === 'mover-proyecto') {
        onMoverProyecto?.();
    } else if (opcionId === 'compartir') {
        onCompartir?.();
    } else if (['muy_alta', 'alta', 'media', 'baja', 'muy_baja'].includes(opcionId)) {
        onEditar?.({
            prioridad: opcionId as NivelPrioridad
        });
    } else if (['bloqueante', 'urgente', 'normal', 'chill'].includes(opcionId)) {
        onEditar?.({
            urgencia: opcionId as NivelUrgencia
        });
    } else if (opcionId.startsWith('posponer-')) {
        /* [2303A-41] Posponer tarea por tiempo */
        onEditar?.({pospuestoHasta: calcularFechaPosponer(opcionId)});
    }
}

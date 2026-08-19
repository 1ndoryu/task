/* [H-F13-01] Handlers del menú contextual para hábitos y subhábitos (dominio
 * de hábitos), extraídos de useTareaMenu. Los handlers de tarea normal viven
 * en manejarOpcionTarea.ts. */

import type {DatosNuevoHabito, NivelImportancia, TareaHabito, TareaSubHabito} from '../../../types/dashboard';
import {
    MENU_HABITO_IDS,
    extraerImportanciaDeOpcion,
    POSPONER_IDS,
    calcularFechaPosponer
} from '../../../config/opcionesMenuHabito';
import {useDependenciasUIStore} from '../../../stores/dependenciasUIStore';
import type {TipoEntidadTracker} from '../../../types/timeTracker';

export interface TrackerAcciones {
    sesionActiva: {entidadId: number} | null;
    estado: string;
    iniciarTracking: (entidadId: number, tipoEntidad: TipoEntidadTracker, nombreEntidad: string, tiempoMinimoMinutos?: number) => void;
    completarTracking: () => void;
}

export interface CtxOpcionHabito {
    tarea: TareaHabito;
    tracker: TrackerAcciones;
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onToggleHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    onPosponerHabitoConTiempo?: (habitoId: number, hasta: string | null) => void;
    onPausarHabito?: (habitoId: number) => void;
    onActualizarHabito?: (habitoId: number, datos: Partial<DatosNuevoHabito>) => void;
}

export function manejarOpcionHabito(opcionId: string, {tarea, tracker, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPosponerHabitoConTiempo, onPausarHabito, onActualizarHabito}: CtxOpcionHabito): void {
    /* Tracking de tiempo para hábitos */
    if (opcionId === 'iniciar-tracking') {
        tracker.iniciarTracking(tarea.habitoId, 'habito', tarea.texto);
        return;
    }
    if (opcionId === 'detener-tracking') {
        tracker.completarTracking();
        return;
    }

    switch (opcionId) {
        case MENU_HABITO_IDS.CONFIGURAR:
        case MENU_HABITO_IDS.EDITAR:
            onEditarHabito?.(tarea.habitoId);
            break;
        case 'dependencias':
            /* [19-08-2026] Acceso directo: abre el modal de edición del
             * hábito con el selector de dependencias ya abierto. */
            useDependenciasUIStore.getState().solicitarAbrirDependencias({tipo: 'habito', id: tarea.habitoId});
            onEditarHabito?.(tarea.habitoId);
            break;
        case MENU_HABITO_IDS.TOGGLE:
            onToggleHabito?.(tarea.habitoId);
            break;
        case MENU_HABITO_IDS.POSPONER:
            onPosponerHabito?.(tarea.habitoId);
            break;
        case POSPONER_IDS.UNA_HORA:
        case POSPONER_IDS.CUATRO_HORAS:
        case POSPONER_IDS.OCHO_HORAS:
        case POSPONER_IDS.MANANA:
        case POSPONER_IDS.DOS_DIAS:
        case POSPONER_IDS.UNA_SEMANA:
        case POSPONER_IDS.QUITAR:
            onPosponerHabitoConTiempo?.(tarea.habitoId, calcularFechaPosponer(opcionId));
            break;
        case MENU_HABITO_IDS.PAUSAR:
            onPausarHabito?.(tarea.habitoId);
            break;
        case MENU_HABITO_IDS.ELIMINAR:
            onEliminarHabito?.(tarea.habitoId);
            break;
    }
    /* Manejar cambio de importancia */
    const nuevaImportancia = extraerImportanciaDeOpcion(opcionId) as NivelImportancia | null;
    if (nuevaImportancia) {
        onActualizarHabito?.(tarea.habitoId, {importancia: nuevaImportancia});
    }
}

export interface CtxOpcionSubHabito {
    tarea: TareaSubHabito;
    tracker: TrackerAcciones;
    onToggleSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    onEliminarSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
    onPosponerSubHabitoConTiempo?: (habitoPadreId: number, subHabitoId: number, hasta: string | null) => void;
    onActualizarSubHabito?: (habitoPadreId: number, subHabitoId: number, datos: Partial<DatosNuevoHabito>) => void;
    onConfigurarSubHabito?: (habitoPadreId: number, subHabitoId: number) => void;
}

export function manejarOpcionSubHabito(opcionId: string, {tarea, tracker, onToggleSubHabito, onEliminarSubHabito, onPosponerSubHabitoConTiempo, onActualizarSubHabito, onConfigurarSubHabito}: CtxOpcionSubHabito): void {
    if (opcionId === 'iniciar-tracking') {
        tracker.iniciarTracking(tarea.subHabitoId, 'tarea', tarea.texto);
        return;
    }
    if (opcionId === 'detener-tracking') {
        tracker.completarTracking();
        return;
    }

    switch (opcionId) {
        case 'dependencias':
            useDependenciasUIStore.getState().solicitarAbrirDependencias({tipo: 'subhabito', id: tarea.subHabitoId, padreId: tarea.habitoPadreId});
            onConfigurarSubHabito?.(tarea.habitoPadreId, tarea.subHabitoId);
            break;
        case MENU_HABITO_IDS.TOGGLE:
            onToggleSubHabito?.(tarea.habitoPadreId, tarea.subHabitoId);
            break;
        case MENU_HABITO_IDS.ELIMINAR:
            onEliminarSubHabito?.(tarea.habitoPadreId, tarea.subHabitoId);
            break;
        case MENU_HABITO_IDS.CONFIGURAR:
        case MENU_HABITO_IDS.EDITAR:
            onConfigurarSubHabito?.(tarea.habitoPadreId, tarea.subHabitoId);
            break;
        case MENU_HABITO_IDS.POSPONER:
            onPosponerSubHabitoConTiempo?.(tarea.habitoPadreId, tarea.subHabitoId, calcularFechaPosponer(POSPONER_IDS.MANANA));
            break;
        case POSPONER_IDS.UNA_HORA:
        case POSPONER_IDS.CUATRO_HORAS:
        case POSPONER_IDS.OCHO_HORAS:
        case POSPONER_IDS.MANANA:
        case POSPONER_IDS.DOS_DIAS:
        case POSPONER_IDS.UNA_SEMANA:
        case POSPONER_IDS.QUITAR:
            onPosponerSubHabitoConTiempo?.(tarea.habitoPadreId, tarea.subHabitoId, calcularFechaPosponer(opcionId));
            break;
    }
    const nuevaImportancia = extraerImportanciaDeOpcion(opcionId) as NivelImportancia | null;
    if (nuevaImportancia) {
        onActualizarSubHabito?.(tarea.habitoPadreId, tarea.subHabitoId, {importancia: nuevaImportancia});
    }
}

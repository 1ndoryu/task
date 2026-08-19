/* [H-F13-01] Constructores de opciones del menú contextual de TareaItem,
 * extraídos de useTareaMenu: lógica pura de composición (sin hooks). */

import {Settings, Plus, Folder, Flag, X, Zap, Trash2, Play, Square, Clock, Link2} from 'lucide-react';
import type {OpcionMenu} from '../../shared/MenuContextual';
import {opcionesMenuPrioridad, opcionesMenuUrgencia} from '../../../utils/nivelesConfig';
import {
    MENU_HABITO_IDS,
    generarOpcionesMenuHabito,
    opcionesMenuPosponerTiempo
} from '../../../config/opcionesMenuHabito';
import type {Tarea} from '../../../types/dashboard';

/* Opción de tracking dinámica (iniciar/detener) compartida por los 3 menús */
export function construirOpcionTracking(estaEnTracking: boolean): OpcionMenu {
    return estaEnTracking
        ? {id: 'detener-tracking', etiqueta: 'Detener tracking', icono: <Square size={12} />, separadorDespues: true}
        : {id: 'iniciar-tracking', etiqueta: 'Iniciar tracking', icono: <Play size={12} />, separadorDespues: true};
}

/* [207A-3] Subhábitos: menú simplificado (sin agregar subtarea, sin mover a proyecto) */
export function construirOpcionesSubHabitoMenu(estaEnTracking: boolean): OpcionMenu[] {
    return [
        {
            id: 'configurar',
            etiqueta: 'Configurar subhábito',
            icono: <Settings size={12} />,
            separadorDespues: false
        },
        construirOpcionTracking(estaEnTracking),
        {
            id: 'dependencias',
            etiqueta: 'Dependencias',
            icono: <Link2 size={12} />,
            separadorDespues: true
        },
        {
            id: 'posponer-menu',
            etiqueta: 'Posponer',
            icono: <Clock size={12} />,
            subOpciones: opcionesMenuPosponerTiempo(false),
            separadorDespues: true
        },
        {
            id: 'eliminar',
            etiqueta: 'Eliminar subhábito',
            icono: <Trash2 size={12} />
        }
    ];
}

export function construirOpcionesTareaMenu(tarea: Tarea, estaEnTracking: boolean): OpcionMenu[] {
    const opciones: OpcionMenu[] = [
        {
            id: 'configurar',
            etiqueta: 'Configurar tarea',
            icono: <Settings size={12} />,
            separadorDespues: false
        },
        {
            id: 'agregar-subtarea',
            etiqueta: 'Agregar subtarea',
            icono: <Plus size={12} />
        },
        construirOpcionTracking(estaEnTracking),
        /* TO-DO: Habilitar cuando sistema de compartir esté listo
        {
            id: 'compartir',
            etiqueta: 'Compartir tarea',
            icono: <Share2 size={12} />
        },
        */
        {
            id: 'mover-proyecto',
            etiqueta: 'Mover a proyecto',
            icono: <Folder size={12} />,
            separadorDespues: false
        },
        {
            id: 'dependencias',
            etiqueta: 'Dependencias',
            icono: <Link2 size={12} />,
            separadorDespues: true
        },
        {
            id: 'prioridad-menu',
            etiqueta: 'Prioridad',
            icono: <Flag size={12} />,
            subOpciones: [
                ...opcionesMenuPrioridad(12),
                ...(tarea.prioridad
                    ? [
                          {
                              id: 'sin-prioridad',
                              etiqueta: 'Sin prioridad',
                              icono: <X size={12} />,
                              separadorDespues: false
                          }
                      ]
                    : [])
            ]
        },
        {
            id: 'urgencia-menu',
            etiqueta: 'Urgencia',
            icono: <Zap size={12} />,
            separadorDespues: true,
            subOpciones: opcionesMenuUrgencia(12)
        },
        {
            id: 'posponer-menu',
            etiqueta: 'Posponer',
            icono: <Clock size={12} />,
            separadorDespues: true,
            subOpciones: opcionesMenuPosponerTiempo(!!tarea.pospuestoHasta)
        },
        {
            id: 'eliminar',
            etiqueta: 'Eliminar tarea',
            icono: <Trash2 size={12} />,
            peligroso: true
        }
    ];
    return opciones;
}

export function construirOpcionesHabitoMenu(params: {
    completadoHoy: boolean;
    estaPausado: boolean;
    tieneActualizar: boolean;
    pospuestoHoy: boolean;
    estaEnTracking: boolean;
}): OpcionMenu[] {
    const opcionesBase = generarOpcionesMenuHabito({
        completadoHoy: params.completadoHoy,
        estaPausado: params.estaPausado,
        tieneActualizar: params.tieneActualizar,
        pospuestoHoy: params.pospuestoHoy
    });

    const opcionTracking = construirOpcionTracking(params.estaEnTracking);

    const indiceInsercion = Math.max(
        0,
        opcionesBase.findIndex(opcion => opcion.id === MENU_HABITO_IDS.ELIMINAR)
    );

    return [...opcionesBase.slice(0, indiceInsercion), opcionTracking, ...opcionesBase.slice(indiceInsercion)];
}

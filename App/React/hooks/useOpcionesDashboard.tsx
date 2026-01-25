/*
 * useOpcionesDashboard
 * Hook para generar las opciones de los selectores del dashboard
 * Responsabilidad única: construir arrays de opciones para badges y filtros
 */

import {useMemo} from 'react';
import {Folder, CheckSquare, LayoutList, User, GripVertical, Sparkles, Calendar, Flag, SortAsc} from 'lucide-react';
import type {Proyecto} from '../types/dashboard';
import {MODOS_ORDEN_TAREAS} from './useOrdenarTareas';
import type {ModoOrdenTareas} from './useOrdenarTareas';
import type {ModoOrdenHabitos} from './useOrdenarHabitos';
import type {OrdenamientoProyectos} from './useConfiguracionProyectos';

interface UseOpcionesDashboardProps {
    proyectos: Proyecto[];
    modosOrdenHabitos: Array<{id: ModoOrdenHabitos; etiqueta: string; descripcion: string}>;
    contarAsignadas: number;
}

interface UseOpcionesDashboardReturn {
    opcionesOrdenHabitos: Array<{id: ModoOrdenHabitos; etiqueta: string; descripcion: string; icono?: JSX.Element}>;
    opcionesOrdenProyectos: Array<{id: OrdenamientoProyectos; etiqueta: string; descripcion: string; icono?: JSX.Element}>;
    opcionesOrdenTareas: Array<{id: ModoOrdenTareas; etiqueta: string; descripcion: string; icono?: JSX.Element}>;
    opcionesFiltro: Array<{id: string; etiqueta: string; icono?: JSX.Element; descripcion: string}>;
}

/* Iconos para modos de ordenamiento */
const ICONOS_ORDEN: Record<string, JSX.Element> = {
    manual: <GripVertical size={14} />,
    inteligente: <Sparkles size={14} />,
    fecha: <Calendar size={14} />,
    prioridad: <Flag size={14} />,
    nombre: <SortAsc size={14} />
};

export function useOpcionesDashboard({proyectos, modosOrdenHabitos, contarAsignadas}: UseOpcionesDashboardProps): UseOpcionesDashboardReturn {
    /* Opciones para SelectorBadge de hábitos - Con iconos */
    const opcionesOrdenHabitos = useMemo(
        () =>
            modosOrdenHabitos.map(m => ({
                id: m.id,
                etiqueta: m.etiqueta,
                descripcion: m.descripcion,
                icono: ICONOS_ORDEN[m.id] || <SortAsc size={14} />
            })),
        [modosOrdenHabitos]
    );

    /* Opciones para SelectorBadge de proyectos - Con iconos */
    const opcionesOrdenProyectos = useMemo<UseOpcionesDashboardReturn['opcionesOrdenProyectos']>(
        () => [
            {id: 'nombre', etiqueta: 'Nombre', descripcion: 'Alfabético', icono: ICONOS_ORDEN.nombre},
            {id: 'fecha', etiqueta: 'Fecha Límite', descripcion: 'Vencimiento', icono: ICONOS_ORDEN.fecha},
            {id: 'prioridad', etiqueta: 'Prioridad', descripcion: 'Importancia', icono: ICONOS_ORDEN.prioridad}
        ],
        []
    );

    /* Opciones para SelectorBadge de tareas - Con iconos */
    const opcionesOrdenTareas = useMemo(
        () =>
            MODOS_ORDEN_TAREAS.map(m => ({
                id: m.id,
                etiqueta: m.etiqueta,
                descripcion: m.descripcion,
                icono: ICONOS_ORDEN[m.id]
            })),
        []
    );

    /* Opciones para el filtro de tareas */
    const opcionesFiltro = useMemo(
        () => [
            {
                id: 'sueltas',
                etiqueta: 'Tareas sueltas',
                icono: <CheckSquare size={12} />,
                descripcion: 'Sin proyecto'
            },
            {
                id: 'asignadas',
                etiqueta: 'Mis asignadas',
                icono: <User size={12} />,
                descripcion: contarAsignadas > 0 ? `${contarAsignadas} pendientes` : 'Ninguna'
            },
            {
                id: 'todas',
                etiqueta: 'Todas las tareas',
                icono: <LayoutList size={12} />,
                descripcion: 'Todas'
            },
            ...proyectos.map(p => ({
                id: `proyecto-${p.id}`,
                etiqueta: p.nombre,
                icono: <Folder size={12} />,
                descripcion: (p.descripcion || '').length > 25 ? (p.descripcion || '').substring(0, 25) + '...' : p.descripcion || ''
            }))
        ],
        [proyectos, contarAsignadas]
    );

    return {
        opcionesOrdenHabitos,
        opcionesOrdenProyectos,
        opcionesOrdenTareas,
        opcionesFiltro
    };
}

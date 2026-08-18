/*
 * useListaProyectos
 * Hook que encapsula la lógica del menú contextual de proyectos.
 * Maneja toggle de proyecto seleccionado, apertura/cierre del menú contextual,
 * construcción de opciones y ejecución de acciones.
 */

import {useState, useCallback} from 'react';
import {Edit, Trash2, PlayCircle, PauseCircle, CheckCircle} from 'lucide-react';
import type {Proyecto} from '../../types/dashboard';
import type {OpcionMenu} from '../../components/shared/MenuContextual';

interface MenuContextoProyecto {
    visible: boolean;
    x: number;
    y: number;
    proyectoId: number | null;
}

interface UseListaProyectosParams {
    proyectos: Proyecto[];
    proyectoSeleccionadoId?: number | null;
    onSeleccionarProyecto?: (id: number | null) => void;
    onEditarProyecto?: (proyecto: Proyecto) => void;
    onEliminarProyecto?: (id: number) => void;
    onCambiarEstadoProyecto?: (id: number, estado: 'activo' | 'completado' | 'pausado') => void;
    onCompartirProyecto?: (proyecto: Proyecto) => void;
}

export function useListaProyectos({proyectos, proyectoSeleccionadoId, onSeleccionarProyecto, onEditarProyecto, onEliminarProyecto, onCambiarEstadoProyecto, onCompartirProyecto}: UseListaProyectosParams) {
    const [menuContexto, setMenuContexto] = useState<MenuContextoProyecto>({visible: false, x: 0, y: 0, proyectoId: null});

    /* Toggle: si ya está seleccionado, deseleccionar */
    const toggleProyecto = useCallback(
        (id: number) => {
            if (proyectoSeleccionadoId === id) {
                onSeleccionarProyecto?.(null);
            } else {
                onSeleccionarProyecto?.(id);
            }
        },
        [proyectoSeleccionadoId, onSeleccionarProyecto]
    );

    /* Manejar click derecho en proyecto */
    const manejarContextMenu = useCallback((e: React.MouseEvent, proyectoId: number) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuContexto({visible: true, x: e.clientX, y: e.clientY, proyectoId});
    }, []);

    /* Cerrar menu contextual */
    const cerrarMenuContexto = useCallback(() => {
        setMenuContexto(prev => ({...prev, visible: false, proyectoId: null}));
    }, []);

    /* Construir opciones del menu contextual según el proyecto */
    const obtenerOpcionesMenu = useCallback((): OpcionMenu[] => {
        if (!menuContexto.proyectoId) return [];
        const proyecto = proyectos.find(p => p.id === menuContexto.proyectoId);
        if (!proyecto) return [];

        const opciones: OpcionMenu[] = [
            {id: 'editar', etiqueta: 'Editar proyecto', icono: <Edit size={14} />, separadorDespues: true}
        ];

        /* Opciones de estado según el estado actual */
        if (proyecto.estado !== 'activo') {
            opciones.push({id: 'estado-activo', etiqueta: 'Marcar como activo', icono: <PlayCircle size={14} />});
        }
        if (proyecto.estado !== 'pausado') {
            opciones.push({id: 'estado-pausado', etiqueta: 'Pausar proyecto', icono: <PauseCircle size={14} />});
        }
        if (proyecto.estado !== 'completado') {
            opciones.push({id: 'estado-completado', etiqueta: 'Marcar como completado', icono: <CheckCircle size={14} />, separadorDespues: true});
        } else {
            opciones[opciones.length - 1].separadorDespues = true;
        }

        opciones.push({id: 'eliminar', etiqueta: 'Eliminar proyecto', icono: <Trash2 size={14} />, peligroso: true});

        return opciones;
    }, [menuContexto.proyectoId, proyectos]);

    /* Manejar selección de una opción del menu contextual */
    const manejarSeleccionMenu = useCallback(
        (opcionId: string) => {
            if (!menuContexto.proyectoId) return;
            const proyecto = proyectos.find(p => p.id === menuContexto.proyectoId);
            if (!proyecto) return;

            switch (opcionId) {
                case 'editar':
                    onEditarProyecto?.(proyecto);
                    break;
                case 'compartir':
                    onCompartirProyecto?.(proyecto);
                    break;
                case 'eliminar':
                    onEliminarProyecto?.(proyecto.id);
                    break;
                case 'estado-activo':
                    onCambiarEstadoProyecto?.(proyecto.id, 'activo');
                    break;
                case 'estado-pausado':
                    onCambiarEstadoProyecto?.(proyecto.id, 'pausado');
                    break;
                case 'estado-completado':
                    onCambiarEstadoProyecto?.(proyecto.id, 'completado');
                    break;
            }
            cerrarMenuContexto();
        },
        [menuContexto.proyectoId, proyectos, onEditarProyecto, onEliminarProyecto, onCambiarEstadoProyecto, onCompartirProyecto, cerrarMenuContexto]
    );

    return {
        menuContexto,
        toggleProyecto,
        manejarContextMenu,
        cerrarMenuContexto,
        obtenerOpcionesMenu,
        manejarSeleccionMenu
    };
}

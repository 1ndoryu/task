/*
 * MenuAccionesMasivas
 * Menú contextual para acciones masivas sobre tareas seleccionadas
 * Aparece al hacer click derecho cuando hay tareas seleccionadas con Ctrl+Click
 */

import React, {useMemo} from 'react';
import {Trash2, Flag, Folder, AlertTriangle, ChevronDown, ChevronUp, X} from 'lucide-react';
import {MenuContextual, type OpcionMenu} from '../../shared/MenuContextual';
import type {Proyecto, NivelPrioridad} from '../../../types/dashboard';
import {useSeleccionMultipleStore, useCantidadSeleccionadas} from '../../../stores/seleccionMultipleStore';

interface MenuAccionesMasivasProps {
    posicionX: number;
    posicionY: number;
    onCerrar: () => void;
    onEliminarTareas: (ids: number[]) => void;
    onCambiarPrioridad: (ids: number[], prioridad: NivelPrioridad) => void;
    onMoverProyecto: (ids: number[], proyectoId: number | undefined) => void;
    proyectos?: Proyecto[];
}

export function MenuAccionesMasivas({posicionX, posicionY, onCerrar, onEliminarTareas, onCambiarPrioridad, onMoverProyecto, proyectos = []}: MenuAccionesMasivasProps): JSX.Element {
    const {obtenerIdsSeleccionados, limpiarSeleccion} = useSeleccionMultipleStore();
    const cantidadSeleccionadas = useCantidadSeleccionadas();

    const opciones: OpcionMenu[] = useMemo(() => {
        const ops: OpcionMenu[] = [
            {
                id: 'header',
                etiqueta: `${cantidadSeleccionadas} tarea${cantidadSeleccionadas !== 1 ? 's' : ''} seleccionada${cantidadSeleccionadas !== 1 ? 's' : ''}`,
                icono: <Flag size={14} />,
                deshabilitado: true,
                separadorDespues: true
            },
            /* Prioridades */
            {
                id: 'prioridad-muy_alta',
                etiqueta: 'Prioridad Muy Alta',
                icono: <AlertTriangle size={14} style={{color: 'var(--dashboard-colorMuyAlta)'}} />
            },
            {
                id: 'prioridad-alta',
                etiqueta: 'Prioridad Alta',
                icono: <ChevronUp size={14} style={{color: 'var(--dashboard-colorAlta)'}} />
            },
            {
                id: 'prioridad-media',
                etiqueta: 'Prioridad Media',
                icono: <Flag size={14} style={{color: 'var(--dashboard-colorMedia)'}} />
            },
            {
                id: 'prioridad-baja',
                etiqueta: 'Prioridad Baja',
                icono: <ChevronDown size={14} style={{color: 'var(--dashboard-colorBaja)'}} />,
                separadorDespues: true
            }
        ];

        /* Opción de mover a proyecto si hay proyectos */
        if (proyectos.length > 0) {
            ops.push({
                id: 'mover-sin-proyecto',
                etiqueta: 'Sin proyecto',
                icono: <X size={14} />
            });
            proyectos.forEach((p, index) => {
                ops.push({
                    id: `mover-${p.id}`,
                    etiqueta: p.nombre,
                    icono: <Folder size={14} />,
                    separadorDespues: index === proyectos.length - 1
                });
            });
        }

        /* Eliminar */
        ops.push({
            id: 'eliminar',
            etiqueta: 'Eliminar seleccionadas',
            icono: <Trash2 size={14} />,
            peligroso: true
        });

        /* Limpiar selección */
        ops.push({
            id: 'limpiar',
            etiqueta: 'Limpiar selección',
            icono: <X size={14} />
        });

        return ops;
    }, [cantidadSeleccionadas, proyectos]);

    const manejarSeleccion = (opcionId: string) => {
        const ids = obtenerIdsSeleccionados();

        if (opcionId.startsWith('prioridad-')) {
            const prioridad = opcionId.replace('prioridad-', '') as NivelPrioridad;
            onCambiarPrioridad(ids, prioridad);
        } else if (opcionId.startsWith('mover-')) {
            const proyectoId = opcionId === 'mover-sin-proyecto' ? undefined : parseInt(opcionId.replace('mover-', ''), 10);
            onMoverProyecto(ids, proyectoId);
        } else if (opcionId === 'eliminar') {
            onEliminarTareas(ids);
        } else if (opcionId === 'limpiar') {
            limpiarSeleccion();
        }

        onCerrar();
    };

    return <MenuContextual opciones={opciones} posicionX={posicionX} posicionY={posicionY} onSeleccionar={manejarSeleccion} onCerrar={onCerrar} />;
}

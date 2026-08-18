/*
 * MenuAccionesMasivas
 * Menú contextual para acciones masivas sobre tareas seleccionadas
 * Aparece al hacer click derecho cuando hay tareas seleccionadas con Ctrl+Click
 */

import {useMemo} from 'react';
import {Trash2, Flag, Folder, X, Layers, Zap} from 'lucide-react';
import {MenuContextual, type OpcionMenu} from '../../shared/MenuContextual';
import type {Proyecto, NivelPrioridad, NivelUrgencia} from '../../../types/dashboard';
import {opcionesMenuPrioridad, opcionesMenuUrgencia} from '../../../utils/nivelesConfig';
import {useSeleccionMultipleStore, useCantidadSeleccionadas} from '../../../stores/seleccionMultipleStore';
import {useSeccionesActivas} from '../../../stores/gruposTareasStore';

interface MenuAccionesMasivasProps {
    posicionX: number;
    posicionY: number;
    onCerrar: () => void;
    onEliminarTareas: (ids: number[]) => void;

    onCambiarPrioridad: (ids: number[], prioridad: NivelPrioridad | null) => void;
    onCambiarUrgencia: (ids: number[], urgencia: NivelUrgencia) => void;
    onMoverProyecto: (ids: number[], proyectoId: number | undefined) => void;
    onAgrupar?: (ids: number[]) => void;
    proyectos?: Proyecto[];
}

export function MenuAccionesMasivas({posicionX, posicionY, onCerrar, onEliminarTareas, onCambiarPrioridad, onCambiarUrgencia, onMoverProyecto, onAgrupar, proyectos = []}: MenuAccionesMasivasProps): JSX.Element {
    const obtenerIdsSeleccionados = useSeleccionMultipleStore(s => s.obtenerIdsSeleccionados);
    const limpiarSeleccion = useSeleccionMultipleStore(s => s.limpiarSeleccion);
    const obtenerTareasSeleccionadas = useSeleccionMultipleStore(s => s.obtenerTareasSeleccionadas);
    const cantidadSeleccionadas = useCantidadSeleccionadas();
    const seccionesActivas = useSeccionesActivas();

    const opciones: OpcionMenu[] = useMemo(() => {
        const tareasSeleccionadas = obtenerTareasSeleccionadas();
        const hayHabitos = tareasSeleccionadas.some(t => t.esHabito);

        const ops: OpcionMenu[] = [
            {
                id: 'header',
                etiqueta: `${cantidadSeleccionadas} tarea${cantidadSeleccionadas !== 1 ? 's' : ''} seleccionada${cantidadSeleccionadas !== 1 ? 's' : ''}`,
                icono: <Flag size={14} />,
                deshabilitado: true,
                separadorDespues: true
            }
        ];

        /* Opción de agrupar si secciones están activas (no disponible para hábitos) */
        if (seccionesActivas && onAgrupar && !hayHabitos) {
            ops.push({
                id: 'agrupar',
                etiqueta: 'Agrupar seleccionadas',
                icono: <Layers size={14} />,
                separadorDespues: true
            });
        }

        /* Prioridades (no disponible si hay hábitos seleccionados, o si la lógica no está unificada) */
        if (!hayHabitos) {
            ops.push({
                id: 'prioridad-menu',
                etiqueta: 'Prioridad',
                icono: <Flag size={14} />,
                subOpciones: [
                    ...opcionesMenuPrioridad(12).map(op => ({...op, id: `prioridad-${op.id}`})),
                    {
                        id: 'prioridad-null',
                        etiqueta: 'Sin prioridad',
                        icono: <X size={12} />
                    }
                ]
            });

            ops.push({
                id: 'urgencia-menu',
                etiqueta: 'Urgencia',
                icono: <Zap size={14} />,
                separadorDespues: true,
                subOpciones: opcionesMenuUrgencia(12).map(op => ({...op, id: `urgencia-${op.id}`}))
            });
        }

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
    }, [cantidadSeleccionadas, proyectos, seccionesActivas, onAgrupar, obtenerTareasSeleccionadas]);

    const manejarSeleccion = (opcionId: string) => {
        const ids = obtenerIdsSeleccionados();

        if (opcionId === 'agrupar') {
            onAgrupar?.(ids);
        } else if (opcionId.startsWith('prioridad-')) {
            const prioridadStr = opcionId.replace('prioridad-', '');
            const prioridad = prioridadStr === 'null' ? null : (prioridadStr as NivelPrioridad);
            onCambiarPrioridad(ids, prioridad);
        } else if (opcionId.startsWith('urgencia-')) {
            const urgenciaStr = opcionId.replace('urgencia-', '');
            onCambiarUrgencia(ids, urgenciaStr as NivelUrgencia);
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

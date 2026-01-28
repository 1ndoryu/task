import {useState, useRef, useCallback} from 'react';
import {Tarea} from '../../types/dashboard';
import {obtenerSubtareas, puedeSerSubtareaDe} from '../../utils/jerarquiaTareas';

interface UseTareaOrdenamientoProps {
    tareas: Tarea[];
    pendientes: Tarea[];
    completadas: Tarea[];
    onReordenarTareas?: (tareas: Tarea[]) => void;
    onEditarTarea?: (id: number, datos: any) => void;
    setTareasExpandidas: React.Dispatch<React.SetStateAction<Set<number>>>;
}

export function useTareaOrdenamiento({tareas, pendientes, completadas, onReordenarTareas, onEditarTarea, setTareasExpandidas}: UseTareaOrdenamientoProps) {
    const [tareaArrastrandoId, setTareaArrastrandoId] = useState<number | null>(null);
    const [esGestoSubtarea, setEsGestoSubtarea] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragCurrentXRef = useRef<number>(0);
    const UMBRAL_INDENT = 40;

    const handleDragStart = useCallback((tareaId: number, evento: React.PointerEvent) => {
        setTareaArrastrandoId(tareaId);
        dragStartXRef.current = evento.clientX;
        dragCurrentXRef.current = evento.clientX;
    }, []);

    const handleDragEnd = useCallback(() => {
        setTareaArrastrandoId(null);
        setEsGestoSubtarea(false);
    }, []);

    const handleReorder = useCallback(
        (nuevoOrdenPrincipales: Tarea[]) => {
            if (!onReordenarTareas || !onEditarTarea) return;

            /* Calcular offset X del gesto horizontal */
            const offsetX = dragCurrentXRef.current - dragStartXRef.current;

            /* Si hay una tarea siendo arrastrada y hay offset significativo hacia la derecha */
            if (tareaArrastrandoId !== null && offsetX > UMBRAL_INDENT) {
                /* Encontrar la nueva posición de la tarea arrastrada */
                const nuevaPosicion = nuevoOrdenPrincipales.findIndex(t => t.id === tareaArrastrandoId);

                if (nuevaPosicion > 0) {
                    /* La tarea de arriba será el nuevo padre */
                    const posiblePadre = nuevoOrdenPrincipales[nuevaPosicion - 1];

                    /* Validar que puede ser subtarea */
                    if (puedeSerSubtareaDe(tareas, tareaArrastrandoId, posiblePadre.id)) {
                        /* Convertir en subtarea */
                        onEditarTarea(tareaArrastrandoId, {parentId: posiblePadre.id});

                        /* Expandir el nuevo padre automáticamente */
                        setTareasExpandidas(prev => {
                            const nuevo = new Set(prev);
                            nuevo.add(posiblePadre.id);
                            return nuevo;
                        });

                        /* Reconstruir lista sin la tarea convertida (ahora es subtarea) */
                        const nuevaListaSinConvertida = nuevoOrdenPrincipales.filter(t => t.id !== tareaArrastrandoId);

                        const nuevaListaPendientes: Tarea[] = [];
                        for (const padre of nuevaListaSinConvertida) {
                            nuevaListaPendientes.push(padre);
                            const subtareas = obtenerSubtareas(pendientes, padre.id);
                            nuevaListaPendientes.push(...subtareas);
                        }

                        onReordenarTareas([...nuevaListaPendientes, ...completadas]);
                        return;
                    }
                }
            }

            /* Comportamiento normal: reconstruir lista con jerarquía */
            const nuevaListaPendientes: Tarea[] = [];

            for (const padre of nuevoOrdenPrincipales) {
                nuevaListaPendientes.push(padre);
                /* Añadir subtareas de este padre en su orden original */
                const subtareas = obtenerSubtareas(pendientes, padre.id);
                nuevaListaPendientes.push(...subtareas);
            }

            /* Combinar con completadas al final */
            onReordenarTareas([...nuevaListaPendientes, ...completadas]);
        },
        [pendientes, completadas, onReordenarTareas, onEditarTarea, tareaArrastrandoId, tareas, setTareasExpandidas]
    );

    return {
        tareaArrastrandoId,
        esGestoSubtarea,
        setEsGestoSubtarea,
        dragStartXRef,
        dragCurrentXRef,
        handleDragStart,
        handleDragEnd,
        handleReorder,
        UMBRAL_INDENT
    };
}

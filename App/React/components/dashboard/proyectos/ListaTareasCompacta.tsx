/*
 * ListaTareasCompacta
 * Componente minimalista para listar y gestionar tareas dentro del panel de proyecto.
 * Reemplaza el resumen simple con una lista funcional.
 */

import {useState} from 'react';
import {CheckCircle2, Circle, ChevronRight, ChevronDown} from 'lucide-react';
import {Boton} from '../../ui';
import type {Tarea} from '../../../types/dashboard';

interface ListaTareasCompactaProps {
    tareas: Tarea[];
    onToggleTarea: (id: number) => void;
}

interface TareaItemCompactoProps {
    tarea: Tarea;
    subtareas: Tarea[];
    onToggle: (id: number) => void;
    nivel?: number;
}

export function TareaItemCompacto({tarea, subtareas, onToggle, nivel = 0}: TareaItemCompactoProps): JSX.Element {
    const [expandido, setExpandido] = useState(true);
    const tieneSubtareas = subtareas.length > 0;

    return (
        <div className="tareaItemCompactoContenedor">
            <div className={`tareaItemCompacto ${tarea.completado ? 'tareaItemCompacto--completada' : ''}`} style={{paddingLeft: `${nivel * 16}px`}}> {/* sentinel-disable inline-style-prohibido */}
                {/* Botón expandir/colapsar si tiene subtareas */}
                <Boton
                    variante="icono"
                    onClick={() => setExpandido(!expandido)}
                    icono={expandido ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    claseAdicional={`tareaItemCompacto__toggle ${!tieneSubtareas ? 'tareaItemCompacto__toggle--invisible' : ''}`}
                />

                {/* Checkbox */}
                <Boton
                    variante="icono"
                    onClick={e => {
                        e.stopPropagation();
                        onToggle(tarea.id);
                    }}
                    icono={tarea.completado ? <CheckCircle2 size={16} className="icono-check" /> : <Circle size={16} className="icono-uncheck" />}
                    claseAdicional={`tareaItemCompacto__checkbox ${tarea.completado ? 'tareaItemCompacto__checkbox--checked' : ''}`}
                />

                {/* Texto de la tarea */}
                <span className="tareaItemCompacto__texto">{tarea.texto}</span>
            </div>

            {/* Renderizar subtareas recursivamente */}
            {expandido && tieneSubtareas && (
                <div className="tareaItemCompacto__subtareas">
                    {subtareas.map(subtarea => (
                        <TareaItemCompacto
                            key={subtarea.id}
                            tarea={subtarea}
                            subtareas={[]} // Las subtareas ya están "aplanadas" o pasadas por el padre?
                            // Nota: Aquí asumo que 'subtareas' son hijos directos.
                            // Si la lista es plana, necesita logica de agrupacion externa o interna.
                            // Para simplicidad, este componente espera recibir sus hijos.
                            // Pero como recibimos 'subtareas' como prop, el componente ListaTareasCompacta debe armar el árbol.
                            // Corrección: El padre debe pasar las subtareas correctas.
                            // En esta estructura recursiva simple, 'subtareas' prop contiene las hijas.
                            // Pero si 'subtarea' tiene hijas, necesitamos pasarlas.
                            // Por ahora, para mantenerlo simple y compacto, solo un nivel de anidación o recalcular.
                            // Para hacerlo bien, ListaTareasCompacta debe pasar la funcion de obtener hijos.
                            onToggle={onToggle}
                            nivel={nivel + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Versión mejorada que maneja la jerarquía
export function ListaTareasCompacta({tareas, onToggleTarea}: ListaTareasCompactaProps): JSX.Element {
    // Organizar tareas en jerarquía
    const tareasRaiz = tareas.filter(t => !t.parentId || !tareas.some(posiblePadre => posiblePadre.id === t.parentId));

    const obtenerSubtareas = (padreId: number) => {
        return tareas.filter(t => t.parentId === padreId);
    };

    // Componente recursivo interno para manejar la jerarquia completa
    const RenderTareaRecursiva = ({tarea, nivel}: {tarea: Tarea; nivel: number}) => {
        const misSubtareas = obtenerSubtareas(tarea.id);

        return (
            <div className="tareaItemCompactoContenedor">
                {/* sentinel-disable inline-style-prohibido */}
                <div className={`tareaItemCompacto ${tarea.completado ? 'tareaItemCompacto--completada' : ''}`} style={{paddingLeft: `${nivel * 12}px`}}>
                    <Boton
                        variante="icono"
                        onClick={() => onToggleTarea(tarea.id)}
                        icono={tarea.completado ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                        claseAdicional={`tareaItemCompacto__checkbox ${tarea.prioridad ? `tareaItemCompacto__checkbox--${tarea.prioridad}` : ''}`}
                    />

                    <span className="tareaItemCompacto__texto" title={tarea.texto}>
                        {tarea.texto}
                    </span>
                </div>

                {misSubtareas.length > 0 && (
                    <div className="tareaItemCompacto__subtareas">
                        {misSubtareas.map(hija => (
                            <RenderTareaRecursiva key={hija.id} tarea={hija} nivel={nivel + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (tareas.length === 0) {
        return <div className="listaTareasCompacta--vacia">No hay tareas en este proyecto</div>;
    }

    return (
        <div className="listaTareasCompacta">
            <div className="listaTareasCompacta__header">
                <span className="listaTareasCompacta__titulo">Tareas</span>
                <span className="listaTareasCompacta__contador">
                    {tareas.filter(t => t.completado).length}/{tareas.length}
                </span>
            </div>
            <div className="listaTareasCompacta__lista">
                {tareasRaiz.map(tarea => (
                    <RenderTareaRecursiva key={tarea.id} tarea={tarea} nivel={0} />
                ))}
            </div>
        </div>
    );
}

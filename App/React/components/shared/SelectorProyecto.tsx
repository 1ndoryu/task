/*
 * SelectorProyecto
 * Selector colapsable para mover una tarea a otro proyecto
 * Estilo similar a SelectorFrecuencia
 */

import {useState, useCallback} from 'react';
import {Folder, Ban} from 'lucide-react';
import type {Proyecto} from '../../types/dashboard';
import {Boton} from '../ui';

interface SelectorProyectoProps {
    proyectos: Proyecto[];
    proyectoActualId?: number;
    onChange: (proyectoId: number | undefined) => void;
    deshabilitado?: boolean;
}

export function SelectorProyecto({proyectos, proyectoActualId, onChange, deshabilitado = false}: SelectorProyectoProps): JSX.Element {
    const [expandido, setExpandido] = useState(false);

    const proyectoActual = proyectoActualId ? proyectos.find(p => p.id === proyectoActualId) : null;

    const obtenerNombreProyecto = (): string => {
        if (!proyectoActual) return 'Sin proyecto';
        return proyectoActual.nombre.length > 25 ? proyectoActual.nombre.substring(0, 25) + '...' : proyectoActual.nombre;
    };

    const manejarSeleccion = useCallback(
        (id: number | undefined) => {
            onChange(id);
            setExpandido(false);
        },
        [onChange]
    );

    return (
        <div className="selectorProyecto">
            {/* Cabecera colapsable */}
            <Boton type="button" variante="ghost" claseAdicional="selectorProyectoCabecera" onClick={() => setExpandido(!expandido)} disabled={deshabilitado}>
                <span className="selectorProyectoEtiqueta">Proyecto</span>
                <span className="selectorProyectoValor">
                    {proyectoActual ? <Folder size={12} className="selectorProyectoIcono" /> : <Ban size={12} className="selectorProyectoIcono" />}
                    {obtenerNombreProyecto()}
                </span>
                <span className="selectorProyectoFlecha">{expandido ? '▲' : '▼'}</span>
            </Boton>

            {/* Panel expandido */}
            {expandido && (
                <div className="selectorProyectoPanel">
                    {/* Opcion: Sin proyecto */}
                    <Boton type="button" variante="ghost" claseAdicional={`selectorProyectoOpcion ${!proyectoActualId ? 'selectorProyectoOpcionActivo' : ''}`} onClick={() => manejarSeleccion(undefined)} disabled={deshabilitado}>
                        <Ban size={14} className="selectorProyectoOpcionIcono" />
                        <span>Sin proyecto</span>
                    </Boton>

                    {proyectos.length > 0 && <div className="selectorProyectoSeparador" />}

                    {/* Lista de proyectos */}
                    {proyectos.map(proyecto => {
                        const esActual = proyecto.id === proyectoActualId;
                        return (
                            <Boton key={proyecto.id} type="button" variante="ghost" claseAdicional={`selectorProyectoOpcion ${esActual ? 'selectorProyectoOpcionActivo' : ''}`} onClick={() => manejarSeleccion(proyecto.id)} disabled={deshabilitado}>
                                <Folder size={14} className="selectorProyectoOpcionIcono" />
                                <span>{proyecto.nombre}</span>
                            </Boton>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export type {SelectorProyectoProps};

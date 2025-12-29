/*
 * SelectorEstadoTarea
 * Selector inline para cambiar el estado de una tarea (pendiente/completada)
 * Estilo similar a SelectorFrecuencia
 */

import {useState, useCallback} from 'react';
import {Circle, CheckCircle2} from 'lucide-react';

type EstadoTarea = 'pendiente' | 'completada';

interface SelectorEstadoTareaProps {
    completada: boolean;
    onChange: (completada: boolean) => void;
    deshabilitado?: boolean;
}

const ESTADOS: {estado: EstadoTarea; etiqueta: string; completada: boolean}[] = [
    {estado: 'pendiente', etiqueta: 'Pendiente', completada: false},
    {estado: 'completada', etiqueta: 'Completada', completada: true}
];

export function SelectorEstadoTarea({completada, onChange, deshabilitado = false}: SelectorEstadoTareaProps): JSX.Element {
    const [expandido, setExpandido] = useState(false);

    const estadoActual = completada ? 'Completada' : 'Pendiente';

    const manejarSeleccion = useCallback(
        (nuevoCompletada: boolean) => {
            onChange(nuevoCompletada);
            setExpandido(false);
        },
        [onChange]
    );

    return (
        <div className="selectorEstadoTarea">
            {/* Cabecera colapsable */}
            <button type="button" className="selectorEstadoTareaCabecera" onClick={() => setExpandido(!expandido)} disabled={deshabilitado}>
                <span className="selectorEstadoTareaEtiqueta">Estado</span>
                <span className={`selectorEstadoTareaValor ${completada ? 'selectorEstadoTareaValor--completada' : ''}`}>
                    {completada ? <CheckCircle2 size={12} className="selectorEstadoTareaIcono" /> : <Circle size={12} className="selectorEstadoTareaIcono" />}
                    {estadoActual}
                </span>
                <span className="selectorEstadoTareaFlecha">{expandido ? '▲' : '▼'}</span>
            </button>

            {/* Panel expandido */}
            {expandido && (
                <div className="selectorEstadoTareaPanel">
                    {ESTADOS.map(({estado, etiqueta, completada: esCompletada}) => {
                        const esActual = completada === esCompletada;
                        return (
                            <button key={estado} type="button" className={`selectorEstadoTareaOpcion ${esActual ? 'selectorEstadoTareaOpcionActivo' : ''} ${esCompletada ? 'selectorEstadoTareaOpcion--completada' : ''}`} onClick={() => manejarSeleccion(esCompletada)} disabled={deshabilitado}>
                                {esCompletada ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                <span>{etiqueta}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export type {SelectorEstadoTareaProps};

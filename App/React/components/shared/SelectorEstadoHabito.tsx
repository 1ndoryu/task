/*
 * SelectorEstadoHabito
 * Selector inline para cambiar el estado de un habito (completado/pospuesto/omitido)
 * Estilo similar a SelectorFrecuencia
 */

import {useState, useCallback} from 'react';
import {Check, Clock, X} from 'lucide-react';
import {Boton} from '../ui';

type EstadoHabito = 'completado' | 'pospuesto' | 'omitido' | 'pendiente';

interface SelectorEstadoHabitoProps {
    estado: EstadoHabito;
    onChange: (estado: EstadoHabito) => void;
    deshabilitado?: boolean;
}

const ESTADOS: {estado: EstadoHabito; etiqueta: string; icono: 'check' | 'clock' | 'circle'}[] = [
    {estado: 'pendiente', etiqueta: 'Pendiente', icono: 'circle'},
    {estado: 'completado', etiqueta: 'Completado', icono: 'check'},
    {estado: 'pospuesto', etiqueta: 'Pospuesto', icono: 'clock'}
];

const obtenerIcono = (icono: string, size: number) => {
    switch (icono) {
        case 'check':
            return <Check size={size} />;
        case 'clock':
            return <Clock size={size} />;
        case 'x':
            return <X size={size} />;
        default:
            return <Check size={size} className="botonIcono--deshabilitado" />;
    }
};

export function SelectorEstadoHabito({estado, onChange, deshabilitado = false}: SelectorEstadoHabitoProps): JSX.Element {
    const [expandido, setExpandido] = useState(false);

    const estadoConfig = ESTADOS.find(e => e.estado === estado) || ESTADOS[0];

    const manejarSeleccion = useCallback(
        (nuevoEstado: EstadoHabito) => {
            onChange(nuevoEstado);
            setExpandido(false);
        },
        [onChange]
    );

    return (
        <div className="selectorEstadoHabito">
            {/* Cabecera colapsable */}
            <Boton type="button" variante="ghost" claseAdicional="selectorEstadoHabitoCabecera" onClick={() => setExpandido(!expandido)} disabled={deshabilitado}>
                <span className="selectorEstadoHabitoEtiqueta">Estado de hoy</span>
                <span className={`selectorEstadoHabitoValor selectorEstadoHabitoValor--${estado}`}>
                    {obtenerIcono(estadoConfig.icono, 12)}
                    {estadoConfig.etiqueta}
                </span>
                <span className="selectorEstadoHabitoFlecha">{expandido ? '▲' : '▼'}</span>
            </Boton>

            {/* Panel expandido */}
            {expandido && (
                <div className="selectorEstadoHabitoPanel">
                    {ESTADOS.map(({estado: estadoOpcion, etiqueta, icono}) => {
                        const esActual = estado === estadoOpcion;
                        return (
                            <Boton key={estadoOpcion} type="button" variante="ghost" claseAdicional={`selectorEstadoHabitoOpcion ${esActual ? 'selectorEstadoHabitoOpcionActivo' : ''} selectorEstadoHabitoOpcion--${estadoOpcion}`} onClick={() => manejarSeleccion(estadoOpcion)} disabled={deshabilitado}>
                                {obtenerIcono(icono, 14)}
                                <span>{etiqueta}</span>
                            </Boton>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export type {SelectorEstadoHabitoProps, EstadoHabito};

/*
 * SelectorEstadoHabitoPill
 * Selector de estado de habito estilo pill con menu contextual
 * Fase 9.5: Adapta SelectorEstadoHabito al patron de PropiedadesCompactas
 */

import {useState, useRef} from 'react';
import {Check, Clock, Circle} from 'lucide-react';
import {MenuContextual} from './MenuContextual';
import type {EstadoHabito} from './SelectorEstadoHabito';
import {Boton} from '../ui';

interface SelectorEstadoHabitoPillProps {
    estado: EstadoHabito;
    onChange: (estado: EstadoHabito) => void;
    deshabilitado?: boolean;
}

const OPCIONES_ESTADO: {id: EstadoHabito; etiqueta: string; color: string}[] = [
    {id: 'pendiente', etiqueta: 'Pendiente', color: 'var(--dashboard-textoApagado)'},
    {id: 'completado', etiqueta: 'Completado', color: 'var(--dashboard-estadoExito)'},
    {id: 'pospuesto', etiqueta: 'Pospuesto', color: 'var(--dashboard-estadoMedia)'}
];

const obtenerIcono = (estado: EstadoHabito, size: number) => {
    switch (estado) {
        case 'completado':
            return <Check size={size} />;
        case 'pospuesto':
            return <Clock size={size} />;
        default:
            return <Circle size={size} />;
    }
};

export function SelectorEstadoHabitoPill({estado, onChange, deshabilitado = false}: SelectorEstadoHabitoPillProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);

    const estadoActual = OPCIONES_ESTADO.find(op => op.id === estado) || OPCIONES_ESTADO[0];

    const abrirMenu = () => {
        if (deshabilitado) return;
        if (botonRef.current) {
            const rect = botonRef.current.getBoundingClientRect();
            setPosicionMenu({x: rect.left, y: rect.bottom + 4});
        }
        setMenuAbierto(true);
    };

    const cerrarMenu = () => setMenuAbierto(false);

    const opcionesMenu = OPCIONES_ESTADO.map(op => ({
        id: op.id,
        etiqueta: op.etiqueta,
        icono: obtenerIcono(op.id, 12)
    }));

    return (
        <div className="propiedadesCompactas__item">
            <Boton ref={botonRef} type="button" variante="ghost" claseAdicional={`pillOpcion ${estado === 'pendiente' ? 'pillOpcion--vacio' : ''} ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirMenu} title="Estado de hoy" style={{ /* sentinel-disable inline-style-prohibido */ color: estadoActual.color}}>
                {obtenerIcono(estado, 14)}
                <span>{estadoActual.etiqueta}</span>
            </Boton>

            {menuAbierto && (
                <MenuContextual
                    opciones={opcionesMenu}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        onChange(id as EstadoHabito);
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}
        </div>
    );
}

export type {SelectorEstadoHabitoPillProps};

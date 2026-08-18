/*
 * SelectorEstadoPill
 * Selector de estado de tarea estilo pill con menu contextual
 * Fase 9.4: Adapta SelectorEstadoTarea al patron de PropiedadesCompactas
 */

import {useState, useRef} from 'react';
import {Circle, CheckCircle2} from 'lucide-react';
import {MenuContextual} from './MenuContextual';
import {Boton} from '../ui';

interface SelectorEstadoPillProps {
    completada: boolean;
    onChange: (completada: boolean) => void;
    deshabilitado?: boolean;
}

const OPCIONES_ESTADO = [
    {id: 'pendiente', etiqueta: 'Pendiente', completada: false},
    {id: 'completada', etiqueta: 'Completada', completada: true}
];

export function SelectorEstadoPill({completada, onChange, deshabilitado = false}: SelectorEstadoPillProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);

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
        icono: op.completada ? <CheckCircle2 size={12} /> : <Circle size={12} />
    }));

    return (
        <div className="propiedadesCompactas__item">
            <Boton ref={botonRef} type="button" variante="ghost" claseAdicional={`pillOpcion ${completada ? '' : 'pillOpcion--vacio'} ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirMenu} title="Estado" style={completada ? {color: 'var(--dashboard-estadoExito)'} : undefined}>
                {completada ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                <span>{completada ? 'Completada' : 'Pendiente'}</span>
            </Boton>

            {menuAbierto && (
                <MenuContextual
                    opciones={opcionesMenu}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        const opcion = OPCIONES_ESTADO.find(op => op.id === id);
                        if (opcion) onChange(opcion.completada);
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}
        </div>
    );
}

export type {SelectorEstadoPillProps};

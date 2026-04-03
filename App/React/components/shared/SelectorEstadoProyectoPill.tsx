/*
 * SelectorEstadoProyectoPill
 * Selector de estado de proyecto estilo pill con menu contextual
 * Fase 9.6: Estado de Proyectos (Activo, Pausado, Completado)
 */

import {useState, useRef} from 'react';
import {Play, Pause, CheckCircle2} from 'lucide-react';
import {MenuContextual} from './MenuContextual';
import {Boton} from '../ui';

type EstadoProyecto = 'activo' | 'pausado' | 'completado';

interface SelectorEstadoProyectoPillProps {
    estado: EstadoProyecto;
    onChange: (estado: EstadoProyecto) => void;
    deshabilitado?: boolean;
}

const OPCIONES_ESTADO: {id: EstadoProyecto; etiqueta: string; color: string}[] = [
    {id: 'activo', etiqueta: 'Activo', color: 'var(--dashboard-estadoExito)'},
    {id: 'pausado', etiqueta: 'Pausado', color: 'var(--dashboard-estadoMedia)'},
    {id: 'completado', etiqueta: 'Completado', color: 'var(--dashboard-textoApagado)'}
];

const obtenerIcono = (estado: EstadoProyecto, size: number) => {
    switch (estado) {
        case 'activo':
            return <Play size={size} />;
        case 'pausado':
            return <Pause size={size} />;
        case 'completado':
            return <CheckCircle2 size={size} />;
    }
};

export function SelectorEstadoProyectoPill({estado, onChange, deshabilitado = false}: SelectorEstadoProyectoPillProps): JSX.Element {
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
            <Boton ref={botonRef} type="button" variante="ghost" claseAdicional={`pillOpcion ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirMenu} title="Estado del proyecto" style={{ /* sentinel-disable inline-style-prohibido */ color: estadoActual.color}}>
                {obtenerIcono(estado, 14)}
                <span>{estadoActual.etiqueta}</span>
            </Boton>

            {menuAbierto && (
                <MenuContextual
                    opciones={opcionesMenu}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        onChange(id as EstadoProyecto);
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}
        </div>
    );
}

export type {SelectorEstadoProyectoPillProps, EstadoProyecto};

/*
 * SelectorProyectoPill
 * Selector de proyecto estilo pill con menu contextual
 * Fase 9.4: Adapta SelectorProyecto al patron de PropiedadesCompactas
 */

import {useState, useRef} from 'react';
import {Folder, Ban} from 'lucide-react';
import type {Proyecto} from '../../types/dashboard';
import {MenuContextual} from './MenuContextual';
import {Boton} from '../ui';

interface SelectorProyectoPillProps {
    proyectos: Proyecto[];
    proyectoActualId?: number;
    onChange: (proyectoId: number | undefined) => void;
    deshabilitado?: boolean;
}

export function SelectorProyectoPill({proyectos, proyectoActualId, onChange, deshabilitado = false}: SelectorProyectoPillProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);

    const proyectoActual = proyectoActualId ? proyectos.find(p => p.id === proyectoActualId) : null;

    const obtenerNombreProyecto = (): string => {
        if (!proyectoActual) return 'Proyecto';
        return proyectoActual.nombre.length > 20 ? proyectoActual.nombre.substring(0, 20) + '...' : proyectoActual.nombre;
    };

    const abrirMenu = () => {
        if (deshabilitado) return;
        if (botonRef.current) {
            const rect = botonRef.current.getBoundingClientRect();
            setPosicionMenu({x: rect.left, y: rect.bottom + 4});
        }
        setMenuAbierto(true);
    };

    const cerrarMenu = () => setMenuAbierto(false);

    const opcionesMenu = [
        {id: 'sin-proyecto', etiqueta: 'Sin proyecto', icono: <Ban size={12} />},
        ...proyectos.map(p => ({
            id: String(p.id),
            etiqueta: p.nombre.length > 25 ? p.nombre.substring(0, 25) + '...' : p.nombre,
            icono: <Folder size={12} />
        }))
    ];

    return (
        <div className="propiedadesCompactas__item">
            <Boton ref={botonRef} type="button" variante="ghost" claseAdicional={`pillOpcion ${!proyectoActual ? 'pillOpcion--vacio' : ''} ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirMenu} title="Proyecto">
                {proyectoActual ? <Folder size={14} /> : <Ban size={14} />}
                <span>{obtenerNombreProyecto()}</span>
            </Boton>

            {menuAbierto && (
                <MenuContextual
                    opciones={opcionesMenu}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={id => {
                        if (id === 'sin-proyecto') {
                            onChange(undefined);
                        } else {
                            onChange(Number(id));
                        }
                        cerrarMenu();
                    }}
                    onCerrar={cerrarMenu}
                />
            )}
        </div>
    );
}

export type {SelectorProyectoPillProps};

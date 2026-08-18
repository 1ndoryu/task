/*
 * BotonOpcionCompacta
 * Componente base reutilizable para selectores compactos tipo pill
 * Usa el MenuContextual existente para consistencia visual
 *
 * Fase 9.2.3: Componente reutilizable para propiedades compactas
 *
 * Caracteristicas:
 * - Pill clickeable con icono + texto
 * - Soporte para menu contextual con opciones
 * - Estados: normal, vacio
 */

import {useState, useRef, type ReactNode} from 'react';
import {MenuContextual} from './MenuContextual';
import {Boton} from '../ui';

export interface OpcionCompacta {
    id: string;
    etiqueta: string;
    icono?: ReactNode;
}

interface BotonOpcionCompactaProps {
    /* Icono a mostrar en el boton */
    icono: ReactNode;
    /* Texto a mostrar */
    texto: string;
    /* Lista de opciones para el menu */
    opciones: OpcionCompacta[];
    /* Callback cuando se selecciona una opcion */
    onSeleccionar: (id: string) => void;
    /* Si el boton esta en estado vacio (sin seleccion) */
    vacio?: boolean;
    /* Titulo/tooltip del boton */
    titulo?: string;
    /* Clase CSS adicional */
    className?: string;
}

export function BotonOpcionCompacta({icono, texto, opciones, onSeleccionar, vacio = false, titulo, className = ''}: BotonOpcionCompactaProps): JSX.Element {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);

    const manejarClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (botonRef.current) {
            const rect = botonRef.current.getBoundingClientRect();
            setPosicionMenu({x: rect.left, y: rect.bottom + 4});
        }

        setMenuAbierto(!menuAbierto);
    };

    const manejarSeleccion = (id: string) => {
        onSeleccionar(id);
        setMenuAbierto(false);
    };

    /* Construir clases CSS */
    const clasesPill = ['pillOpcion', vacio ? 'pillOpcion--vacio' : '', className].filter(Boolean).join(' ');

    return (
        <div className="propiedadesCompactas__item">
            <Boton ref={botonRef} type="button" claseAdicional={clasesPill} onClick={manejarClick} title={titulo}>
                {icono}
                <span>{texto}</span>
            </Boton>

            {menuAbierto && (
                <MenuContextual
                    opciones={opciones.map(op => ({
                        id: op.id,
                        etiqueta: op.etiqueta,
                        icono: op.icono
                    }))}
                    posicionX={posicionMenu.x}
                    posicionY={posicionMenu.y}
                    onSeleccionar={manejarSeleccion}
                    onCerrar={() => setMenuAbierto(false)}
                />
            )}
        </div>
    );
}

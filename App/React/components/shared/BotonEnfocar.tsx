/*
 * BotonEnfocar
 * Boton reutilizable para activar el modo enfoque en cualquier panel
 */

import {Maximize2} from 'lucide-react';

interface BotonEnfocarProps {
    onClick: () => void;
    titulo?: string;
}

export function BotonEnfocar({onClick, titulo = 'Modo enfoque'}: BotonEnfocarProps): JSX.Element {
    return (
        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onClick} title={titulo}>
            <span className="selectorBadgeIcono">
                <Maximize2 size={12} />
            </span>
        </button>
    );
}

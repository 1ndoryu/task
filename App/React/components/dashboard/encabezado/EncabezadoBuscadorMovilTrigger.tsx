import {useState} from 'react';
import {Search} from 'lucide-react';

interface EncabezadoBuscadorMovilTriggerProps {
    onClick: () => void;
    esTablet: boolean;
}

export function EncabezadoBuscadorMovilTrigger({onClick, esTablet}: EncabezadoBuscadorMovilTriggerProps) {
    if (!esTablet) return null;
    return (
        <button type="button" className="botonIconoEncabezado botonBuscadorMovil" onClick={onClick} title="Buscar">
            <Search size={18} />
        </button>
    );
}

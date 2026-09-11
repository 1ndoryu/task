import {Search} from 'lucide-react';
import {Boton} from '../../ui/Boton';

interface EncabezadoBuscadorMovilTriggerProps {
    onClick: () => void;
    esTablet: boolean;
    /* Nuevas props para selección múltiple */
    mostrarBotonSeleccion?: boolean;
    modoSeleccionActivo?: boolean;
    onToggleSeleccion?: () => void;
}

export function EncabezadoBuscadorMovilTrigger({onClick, esTablet, mostrarBotonSeleccion: _mostrarBotonSeleccion, modoSeleccionActivo: _modoSeleccionActivo, onToggleSeleccion: _onToggleSeleccion}: EncabezadoBuscadorMovilTriggerProps) {
    if (!esTablet) return null;

    /* Versión normal (buscador) */
    return (
        <Boton type="button" claseAdicional="botonIconoEncabezado botonBuscadorMovil" onClick={onClick} title="Buscar">
            <Search size={18} />
        </Boton>
    );
}

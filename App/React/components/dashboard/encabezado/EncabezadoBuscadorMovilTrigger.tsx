import {ListChecks, Search} from 'lucide-react';
import {Boton} from '../../ui/Boton';

interface EncabezadoBuscadorMovilTriggerProps {
    onClick: () => void;
    esTablet: boolean;
    /* Nuevas props para selección múltiple */
    mostrarBotonSeleccion?: boolean;
    modoSeleccionActivo?: boolean;
    onToggleSeleccion?: () => void;
}

export function EncabezadoBuscadorMovilTrigger({onClick, esTablet, mostrarBotonSeleccion, modoSeleccionActivo, onToggleSeleccion}: EncabezadoBuscadorMovilTriggerProps) {
    if (!esTablet) return null;

    /* Si estamos en modo selección (tareas), mostrar botón de toggle en vez de buscar 
    if (mostrarBotonSeleccion && onToggleSeleccion) {
        return (
           
            <button type="button" className={`botonIconoEncabezado botonBuscadorMovil ${modoSeleccionActivo ? 'botonIconoEncabezado--activo' : ''}`} onClick={onToggleSeleccion} title={modoSeleccionActivo ? 'Desactivar selección múltiple' : 'Activar selección múltiple'} style={modoSeleccionActivo ? {color: 'var(--color-primario)'} : {}}>
                <ListChecks size={18} />
            </button>
          
        );
    }
    */
   
    /* Versión normal (buscador) */
    return (
        <Boton type="button" claseAdicional="botonIconoEncabezado botonBuscadorMovil" onClick={onClick} title="Buscar">
            <Search size={18} />
        </Boton>
    );
}

/*
 * SelectorOrden
 * Componente para seleccionar el modo de ordenamiento de habitos
 * Responsabilidad unica: UI para cambiar entre modos de orden
 */

import {ArrowUpDown} from 'lucide-react';
import {Select} from '../ui';
import type {ModoOrdenHabitos} from '../../hooks/useOrdenarHabitos';
import {MODOS_ORDEN} from '../../hooks/useOrdenarHabitos';

interface SelectorOrdenProps {
    modoActual: ModoOrdenHabitos;
    onCambiarModo: (modo: ModoOrdenHabitos) => void;
}

export function SelectorOrden({modoActual, onCambiarModo}: SelectorOrdenProps): JSX.Element {
    const modoInfo = MODOS_ORDEN.find(m => m.id === modoActual);

    return (
        <div id="selector-orden" className="selectorOrdenContenedor">
            <ArrowUpDown size={10} className="selectorOrdenIcono" />
            <Select claseAdicional="selectorOrdenSelect" value={modoActual} onChange={e => onCambiarModo(e.target.value as ModoOrdenHabitos)} title={modoInfo?.descripcion} opciones={MODOS_ORDEN.map(modo => ({valor: modo.id, etiqueta: modo.etiqueta}))} />
        </div>
    );
}

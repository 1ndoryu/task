/*
 * SelectorNivel
 * Componente reutilizable para seleccionar niveles (prioridad, importancia, etc.)
 * [233A-45] Soporta decoracion (icono + color) desde nivelesConfig centralizado.
 * claseSufijo genera clases CSS validas para niveles multi-palabra.
 */

import {Boton} from '../ui';

interface DecoracionItem {
    icono: JSX.Element;
    color: string;
}

interface SelectorNivelProps<T extends string> {
    niveles: T[];
    seleccionado: T | null;
    onSeleccionar: (nivel: T) => void;
    disabled?: boolean;
    decoracion?: Record<string, DecoracionItem>;
}

/* 'muy_alta' → 'MuyAlta', 'Muy Alta' → 'MuyAlta', 'alta' → 'Alta' */
function generarClaseSufijo(nivel: string): string {
    return nivel
        .split(/[\s_]+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('');
}

export function SelectorNivel<T extends string>({niveles, seleccionado, onSeleccionar, disabled = false, decoracion}: SelectorNivelProps<T>): JSX.Element {
    return (
        <div className="selectorNivelContenedor">
            {niveles.map(nivel => {
                const claseSufijo = generarClaseSufijo(nivel);
                const activo = seleccionado === nivel;
                const deco = decoracion?.[nivel];
                return (
                    <Boton key={nivel} type="button" variante="ghost" claseAdicional={`selectorNivelBoton ${activo ? `selectorNivelBotonActivo selectorNivelBoton${claseSufijo}` : ''}`} onClick={() => onSeleccionar(nivel)} disabled={disabled} style={{textTransform: 'capitalize'}}>
                        {deco && <span className="selectorNivelIcono" style={activo ? {color: deco.color} : undefined}>{deco.icono}</span>}
                        {nivel}
                    </Boton>
                );
            })}
        </div>
    );
}

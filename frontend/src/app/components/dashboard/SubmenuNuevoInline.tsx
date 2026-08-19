/*
 * SubmenuNuevoInline
 * [20-08-2026] Submenu compartido "Tarea / Hábito" extraído de InputNuevaTarea
 * para reutilizarlo también en el botón "+" del header del panel de ejecución.
 * Mismas opciones y mismo lenguaje visual que el "+ Añadir" del área inline.
 */

import {useEffect, useRef} from 'react';
import {ListTodo, Repeat} from 'lucide-react';

interface SubmenuNuevoInlineProps {
    onSeleccionar: (tipo: 'tarea' | 'habito') => void;
    onCerrar: () => void;
    /* [20-08-2026] En el header del panel el submenu se abre hacia abajo
     * (--debajo); en el área inline se abre hacia arriba (comportamiento
     * original). La posición la controla el CSS según la clase del contenedor. */
    direccion?: 'arriba' | 'abajo';
}

export function SubmenuNuevoInline({onSeleccionar, onCerrar, direccion = 'arriba'}: SubmenuNuevoInlineProps): JSX.Element {
    const submenuRef = useRef<HTMLDivElement>(null);

    /* Cerrar al hacer click fuera (mismo patrón que el submenu original) */
    useEffect(() => {
        const manejarClickFuera = (e: MouseEvent) => {
            if (submenuRef.current && !submenuRef.current.contains(e.target as Node)) {
                onCerrar();
            }
        };
        document.addEventListener('mousedown', manejarClickFuera);
        return () => document.removeEventListener('mousedown', manejarClickFuera);
    }, [onCerrar]);

    return (
        <div
            ref={submenuRef}
            className={`submenuNuevoInline ${direccion === 'abajo' ? 'submenuNuevoInline--abajo' : ''}`}
        >
            <button
                type="button"
                className="submenuNuevoInline__opcion"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onSeleccionar('tarea'); }}>
                <ListTodo size={14} />
                <span>Tarea</span>
            </button>
            <button
                type="button"
                className="submenuNuevoInline__opcion"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onSeleccionar('habito'); }}>
                <Repeat size={14} />
                <span>Hábito</span>
            </button>
        </div>
    );
}

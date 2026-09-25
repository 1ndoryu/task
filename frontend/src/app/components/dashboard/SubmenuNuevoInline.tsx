/*
 * SubmenuNuevoInline
 * [20-08-2026] Submenu compartido "Tarea / Hábito" extraído de InputNuevaTarea
 * para reutilizarlo también en el botón "+" del header del panel de ejecución.
 * [25-09-2026] Adaptador fino sobre <MenuContextual> del DS: misma API
 * (onSeleccionar/onCerrar/direccion/anclaje), el menú real, su posicionamiento
 * con anti-desbordamiento, cierre fuera/Escape y portal los aporta el DS.
 */

import {useRef, useState, useLayoutEffect, type CSSProperties} from 'react';
import {ListTodo, Repeat} from 'lucide-react';
import {MenuContextual, type OpcionMenu} from '../shared/MenuContextual';

interface SubmenuNuevoInlineProps {
    onSeleccionar: (tipo: 'tarea' | 'habito') => void;
    onCerrar: () => void;
    /* En el header del panel el submenu se abre hacia abajo; en el área
     * inline se abre hacia arriba (comportamiento original). */
    direccion?: 'arriba' | 'abajo';
    /* Anclaje a coordenadas dinámicas (p. ej. el botón del estado vacío de
     * tareas): posiciona el menú en ese punto del viewport. */
    claseAdicional?: string;
    estiloPosicion?: CSSProperties;
    /* Aceptado por compatibilidad: <MenuContextual> siempre se portalea a
     * body, así que el flag ya no cambia nada. */
    usarPortal?: boolean;
}

const OPCIONES_SUBMENU: OpcionMenu[] = [
    {id: 'tarea', etiqueta: 'Tarea', icono: <ListTodo size={14} />},
    {id: 'habito', etiqueta: 'Hábito', icono: <Repeat size={14} />}
];

/* Alto estimado del menú (2 opciones): para abrir hacia arriba se resta del
 * borde superior del ancla; si se sale por arriba, el DS lo reajusta. */
const ALTO_ESTIMADO_MENU = 110;

export function SubmenuNuevoInline({onSeleccionar, onCerrar, direccion = 'arriba', estiloPosicion}: SubmenuNuevoInlineProps): JSX.Element {
    const anclaRef = useRef<HTMLSpanElement>(null);
    const [posicion, setPosicion] = useState<{x: number; y: number} | null>(() => {
        const left = estiloPosicion?.left;
        const top = estiloPosicion?.top;
        return typeof left === 'number' && typeof top === 'number' ? {x: left, y: top} : null;
    });

    /* Sin coordenadas explícitas: medir el ancla inline tras montar. */
    useLayoutEffect(() => {
        if (posicion || !anclaRef.current) return;
        const rect = anclaRef.current.getBoundingClientRect();
        setPosicion({
            x: rect.left,
            y: direccion === 'abajo' ? rect.bottom + 4 : rect.top - ALTO_ESTIMADO_MENU
        });
    }, [posicion, direccion]);

    if (!posicion) {
        /* Ancla invisible para medir: ocupa el sitio del submenu inline. */
        return <span ref={anclaRef} className="submenuNuevoInline__ancla" />;
    }

    return (
        <MenuContextual
            opciones={OPCIONES_SUBMENU}
            posicionX={posicion.x}
            posicionY={posicion.y}
            onSeleccionar={id => onSeleccionar(id as 'tarea' | 'habito')}
            onCerrar={onCerrar}
        />
    );
}

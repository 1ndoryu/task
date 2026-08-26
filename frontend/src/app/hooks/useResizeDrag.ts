/* [H-F13-09] Hook genérico de drag-resize de dos proporciones (ej.: columna
 * izquierda/derecha o fila superior/inferior). Unifica `ResizeHandleSidebar`
 * (eje X) y `ResizeHandleRow` (eje Y), que antes duplicaban esta lógica.
 * Devuelve el estado de arrastre + handlers para el handle y la ref del contenedor.
 * `valorActual` es la proporción que crece con el drag (ancho de la 1.ª columna
 * o altura de la 1.ª fila); permite solo rangos 25–75 en ambas partes. */

import {useCallback, useRef, useState} from 'react';
import type {MouseEvent as ReactMouseEvent} from 'react';

export function useResizeDrag(
    axis: 'x' | 'y',
    valorActual: number,
    onAjustar: (nuevo: [number, number]) => void,
) {
    const [arrastrando, setArrastrando] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback(
        (e: ReactMouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setArrastrando(true);

            const start = axis === 'x' ? e.clientX : e.clientY;
            const contenedor = contenedorRef.current?.parentElement;
            if (!contenedor) return;

            const rect = contenedor.getBoundingClientRect();
            const total = axis === 'x' ? rect.width : rect.height;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const delta = (axis === 'x' ? moveEvent.clientX : moveEvent.clientY) - start;
                const deltaPorcentaje = (delta / total) * 100;

                const nuevo1 = Math.min(75, Math.max(25, valorActual + deltaPorcentaje));
                const nuevo2 = 100 - nuevo1;

                if (nuevo2 >= 25 && nuevo2 <= 75) {
                    onAjustar([Math.round(nuevo1 * 10) / 10, Math.round(nuevo2 * 10) / 10]);
                }
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                setArrastrando(false);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
        },
        [axis, valorActual, onAjustar],
    );

    const resetear = useCallback(() => onAjustar([50, 50]), [onAjustar]);

    return {
        arrastrando,
        contenedorRef,
        handleMouseDown,
        resetear,
    };
}
/* [H-F13-09] Hook genérico de drag-resize de dos proporciones (ej.: columna
 * izquierda/derecha o fila superior/inferior). Unifica `ResizeHandleSidebar`
 * (eje X) y `ResizeHandleRow` (eje Y), que antes duplicaban esta lógica.
 * Devuelve el estado de arrastre + handlers para el handle y la ref del contenedor.
 * `valorActual` es la proporción que crece con el drag (ancho de la 1.ª columna
 * o altura de la 1.ª fila); permite solo rangos 25–75 en ambas partes. */

import {useCallback, useRef, useState} from 'react';
import type {MouseEvent as ReactMouseEvent} from 'react';

interface OpcionesResizeDrag {
    /* [318A-2 fb] Distancia (px) de arrastre necesaria antes de activar el
     * redimensionado. Evita que un clic o una selección de texto que empieza
     * cerca del borde disparen el resize. Por defecto 5px. */
    umbral?: number;
}

export function useResizeDrag(
    axis: 'x' | 'y',
    valorActual: number,
    onAjustar: (nuevo: [number, number]) => void,
    opciones: OpcionesResizeDrag = {},
) {
    const [arrastrando, setArrastrando] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const umbral = opciones.umbral ?? 5;

    const handleMouseDown = useCallback(
        (e: ReactMouseEvent) => {
            /* [318A-2 fb] NO preventDefault en mousedown: así una selección de
             * texto que empieza en el borde funciona. El resize solo se activa
             * tras superar el umbral de arrastre y si el eje dominante del
             * movimiento coincide con el del handle (no roba el scrollbar del
             * panel, que se arrastra en el otro eje). */
            e.stopPropagation();

            const startX = e.clientX;
            const startY = e.clientY;
            let activo = false;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                if (!activo) {
                    const distancia = Math.hypot(dx, dy);
                    if (distancia < umbral) return;
                    /* Solo activar si el movimiento domina en el eje del handle */
                    const dominaEje = axis === 'x'
                        ? Math.abs(dx) >= Math.abs(dy)
                        : Math.abs(dy) >= Math.abs(dx);
                    if (!dominaEje) return;

                    activo = true;
                    setArrastrando(true);
                    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
                    document.body.style.userSelect = 'none';
                    window.getSelection()?.removeAllRanges();
                }

                const contenedor = contenedorRef.current?.parentElement;
                if (!contenedor) return;

                const rect = contenedor.getBoundingClientRect();
                const total = axis === 'x' ? rect.width : rect.height;
                const start = axis === 'x' ? startX : startY;
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
        },
        [axis, valorActual, onAjustar, umbral],
    );

    const resetear = useCallback(() => onAjustar([50, 50]), [onAjustar]);

    return {
        arrastrando,
        contenedorRef,
        handleMouseDown,
        resetear,
    };
}
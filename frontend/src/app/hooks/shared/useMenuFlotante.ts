/*
 * useMenuFlotante
 * Hook con la lógica del componente MenuFlotante
 * Maneja posicionamiento, cierre al click fuera y Escape
 */

import {useEffect, useRef, useCallback} from 'react';

interface UseMenuFlotanteParams {
    posicionX: number;
    posicionY: number;
    onCerrar: () => void;
}

interface UseMenuFlotanteResult {
    menuRef: React.RefObject<HTMLDivElement | null>;
}

export function useMenuFlotante({posicionX, posicionY, onCerrar}: UseMenuFlotanteParams): UseMenuFlotanteResult {
    const menuRef = useRef<HTMLDivElement>(null);

    /* Ajustar posición si el menú se sale de la pantalla */
    const calcularPosicion = useCallback(() => {
        if (!menuRef.current) return {x: posicionX, y: posicionY};

        const menu = menuRef.current;
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let ajusteX = posicionX;
        let ajusteY = posicionY;

        /* Ajustar si se sale por la derecha */
        if (posicionX + menuRect.width > viewportWidth - 10) {
            ajusteX = viewportWidth - menuRect.width - 10;
        }

        /* Ajustar si se sale por abajo */
        if (posicionY + menuRect.height > viewportHeight - 10) {
            const espacioArriba = posicionY - menuRect.height;
            if (espacioArriba > 10) {
                ajusteY = espacioArriba - 10;
            } else {
                ajusteY = viewportHeight - menuRect.height - 10;
            }
        }

        return {x: Math.max(10, ajusteX), y: Math.max(10, ajusteY)};
    }, [posicionX, posicionY]);

    /* Cerrar al hacer click fuera */
    useEffect(() => {
        const manejarClickFuera = (evento: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
                onCerrar();
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        };

        /* Usar timeout para evitar cerrar inmediatamente si el evento click se propaga */
        const timeout = setTimeout(() => {
            document.addEventListener('mousedown', manejarClickFuera);
            document.addEventListener('keydown', manejarEscape);
        }, 10);

        return () => {
            clearTimeout(timeout);
            document.removeEventListener('mousedown', manejarClickFuera);
            document.removeEventListener('keydown', manejarEscape);
        };
    }, [onCerrar]);

    /* Posicionar el menú después de renderizar */
    useEffect(() => {
        if (menuRef.current) {
            const {x, y} = calcularPosicion();
            menuRef.current.style.left = `${x}px`;
            menuRef.current.style.top = `${y}px`;
        }
    }, [calcularPosicion]);

    return {menuRef};
}

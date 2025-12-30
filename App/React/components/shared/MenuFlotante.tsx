/*
 * MenuFlotante
 * Componente contenedor para menús flotantes personalizados
 * Maneja posicionamiento, portal (opcional si es necesario) y cierre al hacer click fuera
 */

import {useEffect, useRef, useCallback, type ReactNode} from 'react';

interface MenuFlotanteProps {
    children: ReactNode;
    posicionX: number;
    posicionY: number;
    onCerrar: () => void;
    anchoMinimo?: number;
    claseAdicional?: string;
}

export function MenuFlotante({children, posicionX, posicionY, onCerrar, anchoMinimo = 200, claseAdicional = ''}: MenuFlotanteProps): JSX.Element {
    const menuRef = useRef<HTMLDivElement>(null);

    /* Ajustar posicion si el menu se sale de la pantalla */
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
            // Intentar mostrar arriba del cursor si no cabe abajo
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

    /* Posicionar el menu despues de renderizar */
    useEffect(() => {
        if (menuRef.current) {
            const {x, y} = calcularPosicion();
            menuRef.current.style.left = `${x}px`;
            menuRef.current.style.top = `${y}px`;
        }
    }, [calcularPosicion]);

    return (
        <div
            ref={menuRef}
            className={`menuContextual ${claseAdicional}`} // Reutilizamos estilos base de menuContextual
            style={{
                position: 'fixed',
                minWidth: `${anchoMinimo}px`,
                zIndex: 9999, // Asegurar que este por encima de todo
                // Inicialmente fuera de pantalla para calcular dimensiones
                left: '-9999px',
                top: '-9999px'
            }}>
            {children}
        </div>
    );
}

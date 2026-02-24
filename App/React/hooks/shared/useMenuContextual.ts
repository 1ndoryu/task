/*
 * useMenuContextual
 * Hook con la lógica del componente MenuContextual
 * Maneja posicionamiento, submenús, click fuera, Escape y body class
 */

import {useEffect, useRef, useCallback, useState} from 'react';
import type {OpcionMenu} from '../../components/shared/MenuContextual';

interface UseMenuContextualParams {
    posicionX: number;
    posicionY: number;
    onSeleccionar: (opcionId: string) => void;
    onCerrar: () => void;
    esSubmenu: boolean;
}

interface UseMenuContextualResult {
    menuRef: React.RefObject<HTMLDivElement | null>;
    opcionActivaId: string | null;
    estiloSubmenu: React.CSSProperties;
    manejarClick: (opcion: OpcionMenu) => void;
    manejarMouseEnterOpcion: (opcionId: string) => void;
}

export function useMenuContextual({posicionX, posicionY, onSeleccionar, onCerrar, esSubmenu}: UseMenuContextualParams): UseMenuContextualResult {
    const menuRef = useRef<HTMLDivElement>(null);
    const [opcionActivaId, setOpcionActivaId] = useState<string | null>(null);
    const [estiloSubmenu, setEstiloSubmenu] = useState<React.CSSProperties>({
        left: '100%',
        top: 0,
        marginLeft: '4px'
    });

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
            ajusteY = viewportHeight - menuRect.height - 10;
        }

        return {x: Math.max(10, ajusteX), y: Math.max(10, ajusteY)};
    }, [posicionX, posicionY]);

    /* Cerrar al hacer click fuera */
    useEffect(() => {
        const manejarClickFuera = (evento: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
                if (!esSubmenu) {
                    onCerrar();
                }
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        };

        const timeout = setTimeout(() => {
            document.addEventListener('click', manejarClickFuera);
            document.addEventListener('contextmenu', manejarClickFuera);
        }, 0);

        document.addEventListener('keydown', manejarEscape);

        return () => {
            clearTimeout(timeout);
            document.removeEventListener('click', manejarClickFuera);
            document.removeEventListener('contextmenu', manejarClickFuera);
            document.removeEventListener('keydown', manejarEscape);
        };
    }, [onCerrar, esSubmenu]);

    /* Posicionar el menú después de renderizar */
    useEffect(() => {
        if (menuRef.current && !esSubmenu) {
            const {x, y} = calcularPosicion();
            menuRef.current.style.left = `${x}px`;
            menuRef.current.style.top = `${y}px`;
        }
    }, [calcularPosicion, esSubmenu]);

    /* Si es submenú, ajustar posición para no salirse de la pantalla */
    useEffect(() => {
        if (!esSubmenu || !menuRef.current) return;

        const menu = menuRef.current;
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left: string | number = '100%';
        let right: string | number = 'auto';
        let top: number = 0;
        let marginLeft = '4px';

        /* Ajustar si se sale por la derecha - mostrar a la izquierda */
        if (rect.right > viewportWidth - 10) {
            left = 'auto';
            right = '100%';
            marginLeft = '-4px';
        }

        /* Ajustar si se sale por abajo - mover hacia arriba */
        if (rect.bottom > viewportHeight - 10) {
            const overflow = rect.bottom - (viewportHeight - 10);
            top = -overflow;
        }

        setEstiloSubmenu({left, right, top, marginLeft});
    }, [esSubmenu]);

    /* Agregar clase al body para ocultar tooltips */
    useEffect(() => {
        document.body.classList.add('menu-contextual-abierto');
        return () => {
            document.body.classList.remove('menu-contextual-abierto');
        };
    }, []);

    const manejarClick = useCallback(
        (opcion: OpcionMenu) => {
            if (opcion.deshabilitado) return;
            if (opcion.subOpciones && opcion.subOpciones.length > 0) return;

            onSeleccionar(opcion.id);
            onCerrar();
        },
        [onSeleccionar, onCerrar]
    );

    const manejarMouseEnterOpcion = useCallback((opcionId: string) => {
        setOpcionActivaId(opcionId);
    }, []);

    return {menuRef, opcionActivaId, estiloSubmenu, manejarClick, manejarMouseEnterOpcion};
}

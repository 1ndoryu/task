/*
 * MenuFlotante
 * Componente contenedor para menús flotantes personalizados
 * Maneja posicionamiento, portal (opcional si es necesario) y cierre al hacer click fuera
 */

import {type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useMenuFlotante} from '../../hooks/shared/useMenuFlotante';

interface MenuFlotanteProps {
    children: ReactNode;
    posicionX: number;
    posicionY: number;
    onCerrar: () => void;
    anchoMinimo?: number;
    claseAdicional?: string;
}

export function MenuFlotante({children, posicionX, posicionY, onCerrar, anchoMinimo = 200, claseAdicional = ''}: MenuFlotanteProps): JSX.Element {
    const {menuRef} = useMenuFlotante({posicionX, posicionY, onCerrar});

    /* [318A-9] Mismo fix que MenuContextual: portal a body para que
     * position:fixed no se rompa por un ancestro con transform. */
    const menu = (
        <div
            ref={menuRef as React.RefObject<HTMLDivElement>}
            className={`menuContextual ${claseAdicional}`} // Reutilizamos estilos base de menuContextual
            style={{ /* sentinel-disable inline-style-prohibido */
                position: 'fixed',
                minWidth: `${anchoMinimo}px`,
                zIndex: 9999 // Asegurar que este por encima de todo
                // [039A-1/FASE-FINAL] left/top fuera de pantalla viven en
                // .menuContextual (fallback de --menuX/--menuY); el hook publica
                // las coordenadas reales por custom properties
            }}>
            {children}
        </div>
    );

    return createPortal(menu, document.body);
}

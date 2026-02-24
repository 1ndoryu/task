/*
 * MenuFlotante
 * Componente contenedor para menús flotantes personalizados
 * Maneja posicionamiento, portal (opcional si es necesario) y cierre al hacer click fuera
 */

import {type ReactNode} from 'react';
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

    return (
        <div
            ref={menuRef as React.RefObject<HTMLDivElement>}
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

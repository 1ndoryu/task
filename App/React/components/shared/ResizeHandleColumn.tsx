/*
 * ResizeHandleColumn
 * Componente para redimensionar ancho de columnas del dashboard
 * Incluye handles internos (entre columnas) y handle externo (ancho total)
 */

import type {ModoColumnas, AnchoColumnas} from '../../hooks/useConfiguracionLayout';
import {useResizeHandleColumn} from '../../hooks/shared/useResizeHandleColumn';

interface ResizeHandleColumnProps {
    tipo: 'interno' | 'externo';
    posicion?: 1 | 2;
    modoColumnas: ModoColumnas;
    anchos: AnchoColumnas;
    anchoTotal: number;
    onCambiarAnchos: (anchos: Partial<AnchoColumnas>) => void;
    onCambiarAnchoTotal: (ancho: number) => void;
}

export function ResizeHandleColumn({tipo, posicion = 1, modoColumnas, anchos, anchoTotal, onCambiarAnchos, onCambiarAnchoTotal}: ResizeHandleColumnProps): JSX.Element | null {
    const {visible, handleMouseDown, handleDoubleClick, claseBase, clasePosicion, claseArrastrando, titulo} = useResizeHandleColumn({tipo, posicion, modoColumnas, anchos, anchoTotal, onCambiarAnchos, onCambiarAnchoTotal});

    if (!visible) return null;

    return (
        <div className={`resizeHandleColumna ${claseBase} ${clasePosicion} ${claseArrastrando}`} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} title={titulo}>
            <div className="resizeHandleColumnaLinea" />
        </div>
    );
}

/*
 * ResizeHandlePanel
 * Componente reutilizable para redimensionar altura de paneles
 * Lógica inteligente: anclaje a 'auto' cuando se alcanza la altura del contenido
 */

import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {useResizeHandlePanel} from '../../hooks/shared/useResizeHandlePanel';

interface ResizeHandlePanelProps {
    panelId: PanelId;
    alturaInicial: string;
    onCambiarAltura: (panelId: PanelId, altura: string) => void;
    children: (props: {altura: string; isResizing: boolean; contenedorRef: React.RefObject<HTMLDivElement | null>; esAuto: boolean}) => JSX.Element;
}

export function ResizeHandlePanel({panelId, alturaInicial, onCambiarAltura, children}: ResizeHandlePanelProps): JSX.Element {
    const {contenedorRef, isResizing, alturaLocal, esAuto, handleMouseDown, handleDoubleClick} = useResizeHandlePanel({panelId, alturaInicial, onCambiarAltura});

    return (
        <div className={`panelConResize ${isResizing ? 'panelRedimensionando' : ''} ${esAuto ? 'panelAlturaAuto' : 'panelAlturaFija'}`}>
            {children({
                altura: alturaLocal,
                isResizing,
                contenedorRef,
                esAuto
            })}

            <div className="panelResizeHandle" onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} title={esAuto ? 'Modo Auto: crece con el contenido. Arrastra arriba para fijar.' : 'Altura fija. Arrastra abajo al límite para modo Auto.'}>
                <div className={`panelResizeLine ${esAuto ? 'panelResizeLineAuto' : ''}`}></div>
            </div>
        </div>
    );
}

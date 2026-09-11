/*
 * HandleArrastre
 * Botón de arrastre para mover paneles del dashboard
 * Se coloca en el SeccionEncabezado de cada panel
 */

import {GripVertical} from 'lucide-react';
import {Boton} from '../ui';
import type {PanelId} from '../../hooks/useConfiguracionLayout';

interface HandleArrastreProps {
    panelId: PanelId;
    onMouseDown: (panelId: PanelId, evento: React.MouseEvent) => void;
    estaArrastrando: boolean;
    titulo?: string;
}

export function HandleArrastre({panelId, onMouseDown, estaArrastrando, titulo}: HandleArrastreProps): JSX.Element {
    const manejarMouseDown = (evento: React.MouseEvent) => {
        onMouseDown(panelId, evento);
    };

    return (
        <Boton claseAdicional={`selectorBadgeBoton handleArrastre${titulo ? ' handleArrastre--conTitulo' : ''} ${estaArrastrando ? 'activo' : ''}`} onMouseDown={manejarMouseDown} title="Arrastrar para mover panel" type="button">
            <span className="selectorBadgeIcono">
                <GripVertical size={10} />
            </span>
            {titulo && <span className="handleArrastre__titulo">{titulo}</span>}
        </Boton>
    );
}

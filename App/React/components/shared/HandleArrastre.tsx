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

    const estiloConTitulo: React.CSSProperties = titulo
        ? {
              width: 'auto',
              padding: 0,
              gap: '6px',
              justifyContent: 'flex-start',
              background: 'transparent',
              border: 'none',
              height: 'auto' /* Permitir altura natural */,
              minHeight: 'unset'
          }
        : {};

    return (
        <Boton claseAdicional={`selectorBadgeBoton handleArrastre ${estaArrastrando ? 'activo' : ''}`} onMouseDown={manejarMouseDown} title="Arrastrar para mover panel" type="button" style={estiloConTitulo}>
            <span className="selectorBadgeIcono">
                <GripVertical size={10} />
            </span>
            {titulo && <span className="handleArrastre__titulo">{titulo}</span>}
        </Boton>
    );
}

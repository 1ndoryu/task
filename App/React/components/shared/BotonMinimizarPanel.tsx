/*
 * BotonMinimizarPanel
 * Botón para minimizar/ocultar un panel del dashboard
 * Responsabilidad única: ocultar panel usando el sistema de layout existente
 */

import {Minus} from 'lucide-react';
import {Boton} from '../ui';
import type {PanelId} from '../../hooks/useConfiguracionLayout';

interface BotonMinimizarPanelProps {
    panelId: PanelId;
    onMinimizar: (panelId: PanelId) => void;
}

export function BotonMinimizarPanel({panelId, onMinimizar}: BotonMinimizarPanelProps): JSX.Element {
    return (
        <Boton claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono botonMinimizarPanel" onClick={() => onMinimizar(panelId)} title="Minimizar panel">
            <span className="selectorBadgeIcono">
                <Minus size={12} />
            </span>
        </Boton>
    );
}

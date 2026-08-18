/*
 * PanelesOcultosEncabezado
 * [18-08-2026] Chips de paneles minimizados en el ENCABEZADO (junto al botón de
 * Layout), reemplazando la barra fija de la esquina inferior izquierda
 * (BarraPanelesOcultos). Click en un chip vuelve a mostrar el panel.
 */

import {LayoutGrid} from 'lucide-react';
import {Boton} from '../ui';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {panelPuedeMostrarse} from '../../config/registroPaneles';
import {obtenerPluginsVisibles, obtenerTodosPlugins} from '../../config/registroPlugins';
import {usePluginsStore} from '../../stores/pluginsStore';
import {obtenerInfoPanel} from './BarraPanelesOcultos';

interface PanelesOcultosEncabezadoProps {
    panelesOcultos: PanelId[];
    onMostrarPanel: (panel: PanelId) => void;
}

export function PanelesOcultosEncabezado({panelesOcultos, onMostrarPanel}: PanelesOcultosEncabezadoProps): JSX.Element | null {
    const pluginsActivos = usePluginsStore(s => s.pluginsActivos);

    const panelesPluginActivos = new Set(
        obtenerPluginsVisibles()
            .filter(plugin => pluginsActivos.includes(plugin.id))
            .flatMap(plugin => plugin.panelesIds)
    );
    const panelesPluginRegistrados = new Set(obtenerTodosPlugins().flatMap(plugin => plugin.panelesIds));

    const visibles = panelesOcultos.filter(panelId => {
        if (!panelPuedeMostrarse(panelId)) return false;
        if (!panelesPluginRegistrados.has(panelId)) return true;
        return panelesPluginActivos.has(panelId);
    });

    if (visibles.length === 0) return null;

    return (
        <div className="panelesOcultosEncabezado">
            {visibles.map(panelId => {
                const info = obtenerInfoPanel(panelId);
                return (
                    <Boton
                        key={panelId}
                        claseAdicional="botonPanelOculto botonPanelOculto--encabezado"
                        onClick={() => onMostrarPanel(panelId)}
                        title={`Mostrar ${info.nombre}`}
                    >
                        {info.icono || <LayoutGrid size={14} />}
                    </Boton>
                );
            })}
        </div>
    );
}

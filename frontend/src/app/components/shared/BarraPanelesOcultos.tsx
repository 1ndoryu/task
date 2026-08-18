/*
 * BarraPanelesOcultos
 * Barra lateral minimalista que muestra iconos de paneles ocultos
 * Click en un icono vuelve a mostrar el panel
 */

import {Target, Folder, Terminal, FileText, Activity, LayoutGrid, Bot} from 'lucide-react';
import {Boton} from '../ui';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {obtenerPanel, panelPuedeMostrarse} from '../../config/registroPaneles';
import {obtenerPluginsVisibles, obtenerTodosPlugins} from '../../config/registroPlugins';
import {usePluginsStore} from '../../stores/pluginsStore';

interface BarraPanelesOcultosProps {
    panelesOcultos: PanelId[];
    onMostrarPanel: (panel: PanelId) => void;
}

/* Fallback de iconos/nombres para paneles core (si el registro no trae icono) */
const PANELES_INFO_FALLBACK: Record<PanelId, {icono: JSX.Element; nombre: string}> = {
    focoPrioritario: {
        icono: <Target size={14} />,
        nombre: 'Foco Prioritario'
    },
    proyectos: {
        icono: <Folder size={14} />,
        nombre: 'Proyectos'
    },
    ejecucion: {
        icono: <Terminal size={14} />,
        nombre: 'Ejecución'
    },
    scratchpad: {
        icono: <FileText size={14} />,
        nombre: 'Scratchpad'
    },
    actividad: {
        icono: <Activity size={14} />,
        nombre: 'Actividad'
    },
    ia: {
        icono: <Bot size={14} />,
        nombre: 'IA'
    }
};

function obtenerInfoPanel(panelId: PanelId): {icono: JSX.Element; nombre: string} {
    const definicion = obtenerPanel(panelId);

    const nombre = definicion?.titulo || PANELES_INFO_FALLBACK[panelId]?.nombre || panelId;

    const iconoRegistro = definicion?.icono;
    const icono = (iconoRegistro && typeof iconoRegistro === 'object' ? (iconoRegistro as JSX.Element) : null) || PANELES_INFO_FALLBACK[panelId]?.icono || <LayoutGrid size={14} />;

    return {icono, nombre};
}

export function BarraPanelesOcultos({panelesOcultos, onMostrarPanel}: BarraPanelesOcultosProps): JSX.Element | null {
    const pluginsActivos = usePluginsStore(s => s.pluginsActivos);

    const panelesPluginActivos = new Set(
        obtenerPluginsVisibles()
            .filter(plugin => pluginsActivos.includes(plugin.id))
            .flatMap(plugin => plugin.panelesIds)
    );

    const panelesPluginRegistrados = new Set(obtenerTodosPlugins().flatMap(plugin => plugin.panelesIds));

    const panelesOcultosVisibles = panelesOcultos.filter(panelId => {
        if (!panelPuedeMostrarse(panelId)) return false;

        if (!panelesPluginRegistrados.has(panelId)) {
            return true;
        }

        return panelesPluginActivos.has(panelId);
    });

    if (panelesOcultosVisibles.length === 0) return null;

    return (
        <div className="barraPanelesOcultos">
            <div className="barraPanelesOcultosContenido">
                {panelesOcultosVisibles.map(panelId => {
                    const info = obtenerInfoPanel(panelId);

                    return (
                        <Boton key={panelId} claseAdicional="botonPanelOculto" onClick={() => onMostrarPanel(panelId)} title={`Mostrar ${info.nombre}`}>
                            {info.icono}
                        </Boton>
                    );
                })}
            </div>
        </div>
    );
}

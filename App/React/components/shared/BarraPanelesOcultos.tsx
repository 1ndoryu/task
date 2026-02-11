/*
 * BarraPanelesOcultos
 * Barra lateral minimalista que muestra iconos de paneles ocultos
 * Click en un icono vuelve a mostrar el panel
 */

import {Target, Folder, Terminal, FileText, Activity, LayoutGrid} from 'lucide-react';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {obtenerPanel} from '../../config/registroPaneles';

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
    if (panelesOcultos.length === 0) return null;

    return (
        <div className="barraPanelesOcultos">
            <div className="barraPanelesOcultosContenido">
                {panelesOcultos.map(panelId => {
                    const info = obtenerInfoPanel(panelId);

                    return (
                        <button key={panelId} className="botonPanelOculto" onClick={() => onMostrarPanel(panelId)} title={`Mostrar ${info.nombre}`}>
                            {info.icono}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

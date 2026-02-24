/*
 * IndicadorArrastre
 * Indicador visual que se muestra durante el arrastre de paneles
 * Incluye:
 * - Preview flotante siguiendo el cursor
 * - Indicador de zona de drop (linea brillante arriba/abajo del panel destino)
 */

import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {Target, Folder, Terminal, FileText, Activity, LayoutGrid} from 'lucide-react';
import {obtenerPanel} from '../../config/registroPaneles';

/* Fallback de nombres e iconos para paneles core */
const INFO_PANELES_FALLBACK: Record<PanelId, {nombre: string; icono: JSX.Element}> = {
    focoPrioritario: {
        nombre: 'Foco Prioritario',
        icono: <Target size={14} />
    },
    proyectos: {
        nombre: 'Proyectos',
        icono: <Folder size={14} />
    },
    ejecucion: {
        nombre: 'Ejecucion',
        icono: <Terminal size={14} />
    },
    scratchpad: {
        nombre: 'Scratchpad',
        icono: <FileText size={14} />
    },
    actividad: {
        nombre: 'Actividad',
        icono: <Activity size={14} />
    }
};

function obtenerInfoPanel(panelId: PanelId): {nombre: string; icono: JSX.Element} {
    const definicion = obtenerPanel(panelId);
    const nombre = definicion?.titulo || INFO_PANELES_FALLBACK[panelId]?.nombre || panelId;

    const iconoRegistro = definicion?.icono;
    const icono = (iconoRegistro && typeof iconoRegistro === 'object' ? (iconoRegistro as JSX.Element) : null) || INFO_PANELES_FALLBACK[panelId]?.icono || <LayoutGrid size={14} />;

    return {nombre, icono};
}

interface IndicadorArrastreProps {
    panelArrastrando: PanelId | null;
    posicionMouse: {x: number; y: number} | null;
}

export function IndicadorArrastre({panelArrastrando, posicionMouse}: IndicadorArrastreProps): JSX.Element | null {
    if (!panelArrastrando || !posicionMouse) return null;

    const info = obtenerInfoPanel(panelArrastrando);

    return (
        <div
            className="indicadorArrastreFlotante"
            style={{
                left: posicionMouse.x + 15,
                top: posicionMouse.y - 10
            }}>
            <span className="indicadorArrastreIcono">{info.icono}</span>
            <span className="indicadorArrastreNombre">{info.nombre}</span>
        </div>
    );
}

/*
 * Componente para el indicador de zona de drop
 * Se renderiza dentro de cada panel
 */
interface IndicadorZonaDropProps {
    activo: boolean;
    posicion: 'antes' | 'despues';
}

export function IndicadorZonaDrop({activo, posicion: _posicion}: IndicadorZonaDropProps): JSX.Element | null {
    if (!activo) return null;

    /* Ahora usamos un placeholder (caja fantasma) en lugar de una linea */
    return <div className="indicadorPlaceholder" />;
}

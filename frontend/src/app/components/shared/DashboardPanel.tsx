/*
 * DashboardPanel
 * Contenedor principal para módulos grandes del dashboard
 */

import {ReactNode} from 'react';
import {AccionesPanelResponsivas} from './AccionesPanelResponsivas';

interface DashboardPanelProps {
    titulo?: string;
    icono?: ReactNode;
    acciones?: ReactNode;
    children: ReactNode;
    className?: string;
    conPadding?: boolean; // Si true, agrega padding al contenido
    id?: string;
    onContextMenu?: (e: React.MouseEvent) => void;
}

export function DashboardPanel({titulo, icono, acciones, children, className = '', conPadding = false, id, onContextMenu}: DashboardPanelProps): JSX.Element {
    return (
        <section id={id} className={`dashboardPanel ${className}`} onContextMenu={onContextMenu}>
            {titulo && (
                <div className="seccionEncabezado dashboardPanel__encabezado">
                    <h2 className="seccionTitulo">
                        {icono} {titulo}
                    </h2>
                    {acciones && <AccionesPanelResponsivas>{acciones}</AccionesPanelResponsivas>}
                </div>
            )}
            <div className={`dashboardPanelContent ${conPadding ? 'conPadding' : ''}`}>{children}</div>
        </section>
    );
}

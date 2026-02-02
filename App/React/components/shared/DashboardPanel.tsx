/*
 * DashboardPanel
 * Contenedor principal para módulos grandes del dashboard
 */

import {ReactNode} from 'react';

interface DashboardPanelProps {
    titulo?: string;
    icono?: ReactNode;
    acciones?: ReactNode;
    children: ReactNode;
    className?: string;
    conPadding?: boolean; // Si true, agrega padding al contenido
    id?: string;
    onContextMenu?: (e: React.MouseEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
}

export function DashboardPanel({titulo, icono, acciones, children, className = '', conPadding = false, id, onContextMenu, onClick}: DashboardPanelProps): JSX.Element {
    return (
        <section id={id} className={`dashboardPanel ${className}`} onContextMenu={onContextMenu} onClick={onClick}>
            {titulo && (
                <div className="seccionEncabezado" style={{padding: 'var(--dashboard-espacioMd) var(--dashboard-espacioLg)', marginBottom: 0}}>
                    <h2 className="seccionTitulo">
                        {icono} {titulo}
                    </h2>
                    {acciones && <div className="seccionAcciones">{acciones}</div>}
                </div>
            )}
            <div className={`dashboardPanelContent ${conPadding ? 'conPadding' : ''}`}>{children}</div>
        </section>
    );
}

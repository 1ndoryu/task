/* [024A-27] ThOrdenable — Header de tabla clickable para ordenar.
 * Muestra flecha ArrowUp/ArrowDown si es la columna activa. */

import {ArrowUp, ArrowDown} from 'lucide-react';
import type {CampoOrden} from '../../hooks/paneles/usePanelGruposFb';

interface ThOrdenableProps {
    campo: CampoOrden;
    etiqueta: string;
    orden: {campo: CampoOrden; direccion: 'asc' | 'desc'};
    onClick: (campo: CampoOrden) => void;
    className?: string;
}

export function ThOrdenable({campo, etiqueta, orden, onClick, className}: ThOrdenableProps): JSX.Element {
    const activo = orden.campo === campo;
    return (
        <th className={`${className || ''} panelGruposFb__thOrdenable`} onClick={() => onClick(campo)}>
            <span className="panelGruposFb__thContenido">
                {etiqueta}
                {activo && (orden.direccion === 'asc'
                    ? <ArrowUp size={10} className="panelGruposFb__thFlecha" />
                    : <ArrowDown size={10} className="panelGruposFb__thFlecha" />
                )}
            </span>
        </th>
    );
}

/*
 * SeccionEncabezado
 * Componente reutilizable para encabezados de sección
 * Responsabilidad única: mostrar título y acciones de una sección
 */

import type {ReactNode} from 'react';

interface SeccionEncabezadoProps {
    icono: ReactNode;
    titulo: string;
    subtitulo?: string;
    acciones?: ReactNode;
    variante?: 'default' | 'panelHeader';
}

export function SeccionEncabezado({icono, titulo, subtitulo, acciones, variante = 'default'}: SeccionEncabezadoProps): JSX.Element {
    const claseVariante = variante === 'panelHeader' ? 'seccionEncabezado--panelHeader' : '';

    return (
        <div className={`seccionEncabezado ${claseVariante}`}>
            <h2 className="seccionTitulo">
                {icono} {titulo}
            </h2>
            {subtitulo && <span className="seccionSubtitulo">{subtitulo}</span>}
            {acciones && <div className="seccionAcciones">{acciones}</div>}
        </div>
    );
}

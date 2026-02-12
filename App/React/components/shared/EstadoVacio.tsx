/*
 * EstadoVacio
 * Componente reutilizable para estados vacíos en paneles
 * Unifica el estilo de "No hay X" con botón de acción opcional
 */

import type {ReactNode} from 'react';
import {Boton} from '../ui';

interface EstadoVacioProps {
    /** Icono opcional a mostrar (componente React) */
    icono?: ReactNode;
    /** Mensaje principal */
    mensaje: string;
    /** Descripción secundaria opcional */
    descripcion?: string;
    /** Texto del botón de acción */
    textoBoton?: string;
    /** Callback al hacer clic en el botón */
    onAccion?: () => void;
    /** Variante de estilo: normal o compacto */
    variante?: 'normal' | 'compacto';
}

export function EstadoVacio({
    icono,
    mensaje,
    descripcion,
    textoBoton,
    onAccion,
    variante = 'normal'
}: EstadoVacioProps): JSX.Element {
    return (
        <div className={`estadoVacioUnificado ${variante === 'compacto' ? 'estadoVacioUnificado--compacto' : ''}`}>
            {icono && <div className="estadoVacioUnificadoIcono">{icono}</div>}
            <span className="estadoVacioUnificadoMensaje">{mensaje}</span>
            {descripcion && <p className="estadoVacioUnificadoDescripcion">{descripcion}</p>}
            {textoBoton && onAccion && (
                <Boton variante="primario" onClick={onAccion} claseAdicional="estadoVacioUnificadoBoton">
                    {textoBoton}
                </Boton>
            )}
        </div>
    );
}

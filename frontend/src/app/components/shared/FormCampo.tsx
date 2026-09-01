/*
 * FormCampo — campo de formulario del sistema centralizado de configuraciones.
 * [318A-3] Reemplaza los 3 patrones inconsistentes (itemOpcionConfig,
 * modalConfigAgenteCampo, configExp/configDeficit) con UNA estructura.
 * Reutiliza las clases existentes (itemOpcionConfig/detallesOpcionConfig/
 * tituloOpcionConfig/descripcionOpcionConfig/separadorOpcionesConfig de
 * configuracionTareas.css) para ser visual-neutral: cero cambio de diseño.
 */

import type {ReactNode} from 'react';

export interface PropsFormCampo {
    /* Título del campo (opcional: filas de acciones sin título; acepta icono). */
    titulo?: ReactNode;
    /* Texto o contenido bajo el título. */
    descripcion?: ReactNode;
    /* Contenido extra dentro de .detallesOpcionConfig (ej: botones de acción). */
    accionesDetalles?: ReactNode;
    /* Control del sistema (Input/Select/Checkbox/Range/Textarea/ToggleSwitch). */
    control?: ReactNode;
    /* Texto de ayuda bajo el control. */
    ayuda?: ReactNode;
    /* horizontal = título a la izquierda, control a la derecha (el actual). */
    orientacion?: 'horizontal' | 'vertical';
    /* Aplica detallesOpcionConfig--compacto (variante existente). */
    compacto?: boolean;
    /* Clase extra para la descripción (variantes --error). */
    claseDescripcion?: string;
}

export function FormCampo({
    titulo,
    descripcion,
    accionesDetalles,
    control,
    ayuda,
    orientacion = 'horizontal',
    compacto = false,
    claseDescripcion,
}: PropsFormCampo): JSX.Element {
    const clasesDetalles = [
        'detallesOpcionConfig',
        compacto && 'detallesOpcionConfig--compacto',
    ].filter(Boolean).join(' ');
    const clasesDescripcion = [
        'descripcionOpcionConfig',
        claseDescripcion,
    ].filter(Boolean).join(' ');

    return (
        <div className={`itemOpcionConfig${orientacion === 'vertical' ? ' itemOpcionConfig--vertical' : ''}`}>
            <div className={clasesDetalles}>
                {titulo && <span className="tituloOpcionConfig">{titulo}</span>}
                {descripcion && <span className={clasesDescripcion}>{descripcion}</span>}
                {accionesDetalles}
            </div>
            {control}
            {ayuda && <span className="formCampoAyuda">{ayuda}</span>}
        </div>
    );
}
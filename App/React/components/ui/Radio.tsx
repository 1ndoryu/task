import React, {type InputHTMLAttributes, forwardRef} from 'react';

/*
 * Componente Radio - Botón de radio reutilizable
 */

export interface OpcionRadio {
    valor: string | number;
    etiqueta: string;
    descripcion?: string;
    deshabilitado?: boolean;
}

export interface PropsRadio extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
    opciones: OpcionRadio[];
    etiquetaGrupo?: string;
    error?: string;
    claseAdicional?: string;
    claseContenedor?: string;
    orientacion?: 'vertical' | 'horizontal';
}

export const Radio = forwardRef<HTMLInputElement, PropsRadio>(({opciones, etiquetaGrupo, error, name, value, onChange, disabled, claseAdicional = '', claseContenedor = '', orientacion = 'vertical', ...props}, ref) => {
    const clases = ['radio', error && 'radio--error', disabled && 'radio--deshabilitado', claseAdicional].filter(Boolean).join(' ');

    return (
        <div className={`radioContenedor ${claseContenedor}`}>
            {etiquetaGrupo && <div className="radioEtiquetaGrupo">{etiquetaGrupo}</div>}

            <div className={`radioGrupo radioGrupo--${orientacion}`}>
                {opciones.map(opcion => {
                    const estaSeleccionado = value === opcion.valor;
                    const estaDeshabilitado = disabled || opcion.deshabilitado;

                    return (
                        <label key={opcion.valor} className={`radioLabel ${estaDeshabilitado ? 'radioLabel--deshabilitado' : ''} ${estaSeleccionado ? 'radioLabel--seleccionado' : ''}`}>
                            <input ref={estaSeleccionado ? ref : undefined} type="radio" name={name} value={opcion.valor} checked={estaSeleccionado} onChange={onChange} disabled={estaDeshabilitado} className={clases} {...props} />

                            <span className="radioMarca" />

                            <span className="radioTexto">
                                <span className="radioEtiqueta">{opcion.etiqueta}</span>
                                {opcion.descripcion && <span className="radioDescripcion">{opcion.descripcion}</span>}
                            </span>
                        </label>
                    );
                })}
            </div>

            {error && <span className="radioError">{error}</span>}
        </div>
    );
});

Radio.displayName = 'Radio';

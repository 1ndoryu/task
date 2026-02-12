import React, {type SelectHTMLAttributes, type ReactNode, forwardRef} from 'react';

/*
 * Componente Select - Selector dropdown reutilizable
 */

export interface OpcionSelect {
    valor: string | number;
    etiqueta: string;
    deshabilitado?: boolean;
}

export interface PropsSelect extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
    etiqueta?: string;
    error?: string;
    opciones: OpcionSelect[];
    placeholder?: string;
    icono?: ReactNode;
    claseAdicional?: string;
    claseContenedor?: string;
}

export const Select = forwardRef<HTMLSelectElement, PropsSelect>(({etiqueta, error, opciones, placeholder, icono, disabled, claseAdicional = '', claseContenedor = '', ...props}, ref) => {
    const clases = ['select', error && 'select--error', disabled && 'select--deshabilitado', icono && 'select--conIcono', claseAdicional].filter(Boolean).join(' ');

    return (
        <div className={`selectContenedor ${claseContenedor}`}>
            {etiqueta && (
                <label className="selectEtiqueta">
                    {etiqueta}
                    {props.required && <span className="selectRequerido">*</span>}
                </label>
            )}

            <div className="selectWrapper">
                {icono && <span className="selectIcono">{icono}</span>}

                <select ref={ref} className={clases} disabled={disabled} {...props}>
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {opciones.map(opcion => (
                        <option key={opcion.valor} value={opcion.valor} disabled={opcion.deshabilitado}>
                            {opcion.etiqueta}
                        </option>
                    ))}
                </select>
            </div>

            {error && <span className="selectError">{error}</span>}
        </div>
    );
});

Select.displayName = 'Select';

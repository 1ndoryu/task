import React, {type InputHTMLAttributes, forwardRef} from 'react';

/*
 * Componente Checkbox - Casilla de verificación reutilizable
 */

export interface PropsCheckbox extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
    etiqueta?: string;
    descripcion?: string;
    error?: string;
    claseAdicional?: string;
    claseContenedor?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, PropsCheckbox>(({etiqueta, descripcion, error, disabled, claseAdicional = '', claseContenedor = '', ...props}, ref) => {
    const clases = ['checkbox', error && 'checkbox--error', disabled && 'checkbox--deshabilitado', claseAdicional].filter(Boolean).join(' ');

    return (
        <div className={`checkboxContenedor ${claseContenedor}`}>
            <label className="checkboxLabel">
                <input ref={ref} type="checkbox" className={clases} disabled={disabled} {...props} />

                <span className="checkboxMarca" />

                {(etiqueta || descripcion) && (
                    <span className="checkboxTexto">
                        {etiqueta && <span className="checkboxEtiqueta">{etiqueta}</span>}
                        {descripcion && <span className="checkboxDescripcion">{descripcion}</span>}
                    </span>
                )}
            </label>

            {error && <span className="checkboxError">{error}</span>}
        </div>
    );
});

Checkbox.displayName = 'Checkbox';

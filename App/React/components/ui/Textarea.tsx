import React, {type TextareaHTMLAttributes, forwardRef} from 'react';

/*
 * Componente Textarea - Área de texto reutilizable con auto-ajuste de altura opcional
 */

export interface PropsTextarea extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
    etiqueta?: string;
    error?: string;
    claseAdicional?: string;
    claseContenedor?: string;
    mostrarContador?: boolean;
    maxLength?: number;
    filas?: number;
    autoAjustar?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, PropsTextarea>(
    (
        {
            etiqueta,
            error,
            disabled,
            placeholder,
            claseAdicional = '',
            claseContenedor = '',
            mostrarContador = false,
            maxLength,
            value,
            filas = 3,
            autoAjustar = false,
            onChange,
            ...props
        },
        ref
    ) => {
        const clases = ['textarea', error && 'textarea--error', disabled && 'textarea--deshabilitado', autoAjustar && 'textarea--autoAjustar', claseAdicional].filter(Boolean).join(' ');

        const longitudActual = typeof value === 'string' ? value.length : 0;

        const manejarCambio = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            if (autoAjustar) {
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
            }
            onChange?.(e);
        };

        return (
            <div className={`textareaContenedor ${claseContenedor}`}>
                {etiqueta && (
                    <label className="textareaEtiqueta">
                        {etiqueta}
                        {props.required && <span className="textareaRequerido">*</span>}
                    </label>
                )}

                <textarea ref={ref} className={clases} disabled={disabled} placeholder={placeholder} maxLength={maxLength} value={value} rows={filas} onChange={manejarCambio} {...props} />

                {mostrarContador && maxLength && (
                    <div className="textareaContador">
                        {longitudActual} / {maxLength}
                    </div>
                )}

                {error && <span className="textareaError">{error}</span>}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

import React, {type InputHTMLAttributes, type ReactNode, forwardRef} from 'react';

/*
 * Componente Input - Campo de entrada reutilizable
 * Tipos soportados: text, password, email, number, date, file, tel, url, search
 * Incluye soporte para iconos, etiquetas y mensajes de error
 */

export type TipoInput = 'text' | 'password' | 'email' | 'number' | 'date' | 'file' | 'tel' | 'url' | 'search';

export interface PropsInput extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
    tipo?: TipoInput;
    etiqueta?: string;
    error?: string;
    icono?: ReactNode;
    iconoDerecha?: ReactNode;
    claseAdicional?: string;
    claseContenedor?: string;
    mostrarContador?: boolean;
    maxLength?: number;
}

export const Input = forwardRef<HTMLInputElement, PropsInput>(
    (
        {
            tipo = 'text',
            etiqueta,
            error,
            icono,
            iconoDerecha,
            disabled,
            placeholder,
            claseAdicional = '',
            claseContenedor = '',
            mostrarContador = false,
            maxLength,
            value,
            ...props
        },
        ref
    ) => {
        const clases = [
            'input',
            `input--${tipo}`,
            error && 'input--error',
            disabled && 'input--deshabilitado',
            icono && 'input--conIcono',
            iconoDerecha && 'input--conIconoDerecha',
            claseAdicional
        ]
            .filter(Boolean)
            .join(' ');

        const longitudActual = typeof value === 'string' ? value.length : 0;

        return (
            <div className={`inputContenedor ${claseContenedor}`}>
                {etiqueta && (
                    <label className="inputEtiqueta">
                        {etiqueta}
                        {props.required && <span className="inputRequerido">*</span>}
                    </label>
                )}

                <div className="inputWrapper">
                    {icono && <span className="inputIcono inputIcono--izquierda">{icono}</span>}

                    <input
                        ref={ref}
                        type={tipo}
                        className={clases}
                        disabled={disabled}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        value={value}
                        {...props}
                    />

                    {iconoDerecha && <span className="inputIcono inputIcono--derecha">{iconoDerecha}</span>}
                </div>

                {mostrarContador && maxLength && (
                    <div className="inputContador">
                        {longitudActual} / {maxLength}
                    </div>
                )}

                {error && <span className="inputError">{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';

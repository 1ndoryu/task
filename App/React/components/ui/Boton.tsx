import React, {type ButtonHTMLAttributes, type ReactNode} from 'react';

/*
 * Componente Boton - Botón reutilizable con variantes de estilo
 * Variantes: primario, secundario, peligro, icono, ghost
 * Tamaños: pequeño, mediano, grande
 */

export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'icono' | 'ghost' | 'link';
export type TamanoBoton = 'pequeño' | 'mediano' | 'grande';

export interface PropsBoton extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
    variante?: VarianteBoton;
    tamano?: TamanoBoton;
    cargando?: boolean;
    icono?: ReactNode;
    iconoDerecha?: boolean;
    soloIcono?: boolean;
    children?: ReactNode;
    claseAdicional?: string;
}

export const Boton: React.FC<PropsBoton> = ({
    variante = 'primario',
    tamano = 'mediano',
    cargando = false,
    icono,
    iconoDerecha = false,
    soloIcono = false,
    children,
    disabled,
    type = 'button',
    claseAdicional = '',
    ...props
}) => {
    const clases = [
        'boton',
        `boton--${variante}`,
        `boton--${tamano}`,
        soloIcono && 'boton--soloIcono',
        cargando && 'boton--cargando',
        disabled && 'boton--deshabilitado',
        claseAdicional
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} className={clases} disabled={disabled || cargando} {...props}>
            {cargando ? (
                <span className="botonCargando">⏳</span>
            ) : (
                <>
                    {icono && !iconoDerecha && <span className="botonIcono">{icono}</span>}
                    {!soloIcono && children && <span className="botonTexto">{children}</span>}
                    {icono && iconoDerecha && <span className="botonIcono">{icono}</span>}
                </>
            )}
        </button>
    );
};

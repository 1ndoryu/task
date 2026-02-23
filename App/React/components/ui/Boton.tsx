import React, {type ButtonHTMLAttributes, type ReactNode} from 'react';

/*
 * Componente Boton - Botón reutilizable con variantes de estilo
 * Variantes: primario, secundario, peligro, icono, ghost, link, pestaña, navegacion, badge, opcion
 * Tamaños: pequeño, mediano, grande
 * Props adicionales: activo, anchoCompleto, compacto, destacado
 * Soporta refs con React.forwardRef
 */

export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'icono' | 'ghost' | 'link' | 'pestaña' | 'navegacion' | 'badge' | 'opcion';
export type TamanoBoton = 'pequeño' | 'mediano' | 'grande';

export interface PropsBoton extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
    variante?: VarianteBoton;
    tamano?: TamanoBoton;
    cargando?: boolean;
    icono?: ReactNode;
    iconoDerecha?: boolean;
    soloIcono?: boolean;
    activo?: boolean;
    anchoCompleto?: boolean;
    compacto?: boolean;
    destacado?: boolean;
    children?: ReactNode;
    claseAdicional?: string;
}

export const Boton = React.forwardRef<HTMLButtonElement, PropsBoton>((
    {
        variante = 'primario',
        tamano = 'mediano',
        cargando = false,
        icono,
        iconoDerecha = false,
        soloIcono = false,
        activo = false,
        anchoCompleto = false,
        compacto = false,
        destacado = false,
        children,
        disabled,
        type = 'button',
        claseAdicional = '',
        ...props
    },
    ref
) => {
    const clases = [
        'boton',
        `boton--${variante}`,
        `boton--${tamano}`,
        soloIcono && 'boton--soloIcono',
        cargando && 'boton--cargando',
        disabled && 'boton--deshabilitado',
        activo && 'boton--activo',
        anchoCompleto && 'boton--anchoCompleto',
        compacto && 'boton--compacto',
        destacado && 'boton--destacado',
        claseAdicional
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button ref={ref} type={type} className={clases} disabled={disabled || cargando} {...props}>
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
});

Boton.displayName = 'Boton';

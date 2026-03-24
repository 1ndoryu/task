/*
 * BadgeInfo
 * Componente reutilizable para mostrar badges de informacion
 * Usado en tareas, habitos y proyectos para indicar metadatos
 */

import type {ReactNode} from 'react';
import {Boton} from '../ui';

export type TipoBadge = 'adjunto' | 'descripcion' | 'repeticion' | 'fecha' | 'prioridad' | 'frecuencia' | 'racha' | 'destacado' | 'personalizado';

export type VarianteBadge = 'normal' | 'urgente' | 'exito' | 'advertencia' | 'prioridadMuyAlta' | 'prioridadAlta' | 'prioridadMedia' | 'prioridadBaja' | 'urgenciaBloqueante' | 'urgenciaUrgente' | 'urgenciaChill' | 'destacado' | 'racha' | 'rachaPeligro' | 'rachaActiva' | 'rachaCompletada' | 'frecuencia' | 'habito' | 'mensajeNoLeido' | 'pospuesto';

export interface BadgeInfoProps {
    tipo: TipoBadge;
    /* Icono a mostrar */
    icono?: ReactNode;
    /* Texto opcional (mostrar junto al icono) */
    texto?: string;
    /* Titulo del tooltip */
    titulo?: string;
    /* Variante de color */
    variante?: VarianteBadge;
    /* Accion al hacer click */
    onClick?: () => void;
    /* Clases adicionales */
    className?: string;
}

export function BadgeInfo({tipo: _tipo, icono, texto, titulo, variante = 'normal', onClick, className = ''}: BadgeInfoProps): JSX.Element {
    const clases = `badgeInfo badgeInfo--${variante}${onClick ? ' badgeInfoClickable' : ''} ${className}`.trim();

    const contenido = (
        <>
            {icono && <span className="badgeInfoIcono">{icono}</span>}
            {texto && <span className="badgeInfoTexto">{texto}</span>}
        </>
    );

    if (onClick) {
        /* [243A-12] variante="icono" para que Boton no aplique boton--primario/mediano
         * que sobreescribia el padding/height del badge y lo hacia mas alto que los span badge */
        return (
            <Boton type="button" variante="icono" claseAdicional={clases} title={titulo} onClick={onClick}>
                {contenido}
            </Boton>
        );
    }

    return (
        <span className={clases} title={titulo}>
            {contenido}
        </span>
    );
}

/*
 * Contenedor de badges
 * Agrupa multiples badges con orden visual consistente
 */
export interface BadgeGroupProps {
    children: ReactNode;
}

export function BadgeGroup({children}: BadgeGroupProps): JSX.Element {
    return <div className="badgeGroup">{children}</div>;
}

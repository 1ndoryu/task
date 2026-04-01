/*
 * BadgeInfo
 * Componente reutilizable para mostrar badges de informacion
 * Usado en tareas, habitos y proyectos para indicar metadatos
 */

import type {ReactNode, KeyboardEvent} from 'react';

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

/* [014A-3] Todos los badges se renderizan como <span>, independientemente de si son clickables.
 * Antes, los clickables usaban <Boton> que inyectaba clases boton/boton--icono/boton--mediano
 * y causaba inconsistencia visual (alturas, padding, bordes diferentes).
 * Ahora: span + role="button" + tabIndex + onKeyDown para accesibilidad. */
export function BadgeInfo({tipo: _tipo, icono, texto, titulo, variante = 'normal', onClick, className = ''}: BadgeInfoProps): JSX.Element {
    const clases = `badgeInfo badgeInfo--${variante}${onClick ? ' badgeInfoClickable' : ''} ${className}`.trim();

    const contenido = (
        <>
            {icono && <span className="badgeInfoIcono">{icono}</span>}
            {texto && <span className="badgeInfoTexto">{texto}</span>}
        </>
    );

    const handleKeyDown = onClick
        ? (e: KeyboardEvent<HTMLSpanElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }
        : undefined;

    return (
        <span
            className={clases}
            title={titulo}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={handleKeyDown}
        >
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

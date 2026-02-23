/*
 * BadgesPropiedad
 * Componente para mostrar badges de propiedades seleccionadas
 * Se muestra debajo del input en BottomSheets
 * Diseño: Fila horizontal con wrap, estilo pill, permite eliminar con X
 */

import type {ReactNode} from 'react';
import {X} from 'lucide-react';
import {Boton} from '../ui';

interface BadgePropiedad {
    id: string;
    etiqueta: string;
    icono?: ReactNode;
    variante?: 'proyecto' | 'prioridad' | 'urgencia' | 'fecha' | 'frecuencia' | 'importancia';
}

interface BadgesPropiedadProps {
    badges: BadgePropiedad[];
    onEliminar: (id: string) => void;
}

export function BadgesPropiedad({badges, onEliminar}: BadgesPropiedadProps): JSX.Element | null {
    if (badges.length === 0) return null;

    return (
        <div className="badgesPropiedad">
            {badges.map(badge => (
                <div key={badge.id} className={`badgesPropiedad__badge badgesPropiedad__badge--${badge.variante || 'normal'}`}>
                    {badge.icono && <span className="badgesPropiedad__badgeIcono">{badge.icono}</span>}
                    <span className="badgesPropiedad__badgeTexto">{badge.etiqueta}</span>
                    <Boton type="button" variante="icono" onClick={() => onEliminar(badge.id)} aria-label={`Quitar ${badge.etiqueta}`}>
                        <X size={10} />
                    </Boton>
                </div>
            ))}
        </div>
    );
}

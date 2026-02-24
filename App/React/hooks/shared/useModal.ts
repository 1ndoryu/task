/*
 * useModal
 * Hook con la lógica del componente Modal genérico
 * Maneja detección móvil, cierre con Escape y click en overlay
 */

import {useEffect, useCallback} from 'react';
import {useEsMovil} from '../useEsMovil';

interface UseModalParams {
    estaAbierto: boolean;
    onCerrar: () => void;
}

interface UseModalResult {
    esMovil: boolean;
    manejarClickOverlay: (evento: React.MouseEvent<HTMLDivElement>) => void;
}

export function useModal({estaAbierto, onCerrar}: UseModalParams): UseModalResult {
    const {esMovil} = useEsMovil();

    /* Cierra el modal al presionar Escape */
    const manejarTecla = useCallback(
        (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        },
        [onCerrar]
    );

    useEffect(() => {
        if (estaAbierto) {
            document.addEventListener('keydown', manejarTecla);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', manejarTecla);
            document.body.style.overflow = '';
        };
    }, [estaAbierto, manejarTecla]);

    const manejarClickOverlay = useCallback(
        (evento: React.MouseEvent<HTMLDivElement>) => {
            if (evento.target === evento.currentTarget) {
                onCerrar();
            }
        },
        [onCerrar]
    );

    return {esMovil, manejarClickOverlay};
}

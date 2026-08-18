/*
 * useOverlayEnfoque
 * Hook con la lógica del overlay de modo enfoque
 * Maneja bloqueo, cierre con Escape y click fuera
 */

import {useEffect, useCallback, useState} from 'react';

interface UseOverlayEnfoqueParams {
    estaActivo: boolean;
    onCerrar: () => void;
}

interface UseOverlayEnfoqueResult {
    bloqueado: boolean;
    manejarClickOverlay: (evento: React.MouseEvent<HTMLDivElement>) => void;
    toggleBloqueo: () => void;
}

export function useOverlayEnfoque({estaActivo, onCerrar}: UseOverlayEnfoqueParams): UseOverlayEnfoqueResult {
    /* Estado de bloqueo: si está bloqueado, click fuera no cierra */
    const [bloqueado, setBloqueado] = useState(false);

    /* Resetear bloqueo cuando se cierra el overlay */
    useEffect(() => {
        if (!estaActivo) {
            setBloqueado(false);
        }
    }, [estaActivo]);

    /* Cerrar con Escape (siempre funciona, incluso bloqueado) */
    const manejarTecla = useCallback(
        (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        },
        [onCerrar]
    );

    useEffect(() => {
        if (estaActivo) {
            document.addEventListener('keydown', manejarTecla);
        }

        return () => {
            document.removeEventListener('keydown', manejarTecla);
        };
    }, [estaActivo, manejarTecla]);

    const manejarClickOverlay = useCallback(
        (evento: React.MouseEvent<HTMLDivElement>) => {
            /* Si está bloqueado, no cerrar al hacer click fuera */
            if (bloqueado) return;

            if (evento.target === evento.currentTarget) {
                onCerrar();
            }
        },
        [bloqueado, onCerrar]
    );

    const toggleBloqueo = useCallback(() => {
        setBloqueado(prev => !prev);
    }, []);

    return {bloqueado, manejarClickOverlay, toggleBloqueo};
}

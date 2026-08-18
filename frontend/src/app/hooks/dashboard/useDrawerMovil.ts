/*
 * useDrawerMovil
 * Hook que encapsula la lógica del componente DrawerMovil.
 * Maneja interacciones de teclado, swipe, bloqueo de scroll y handlers de navegación.
 */

import {useEffect, useCallback, useRef} from 'react';

export interface UseDrawerMovilParams {
    estaAbierto: boolean;
    onCerrar: () => void;
    onSeleccionar: (opcionId: string) => void;
    onClickPerfil?: () => void;
    onClickPlan?: () => void;
}

export interface UseDrawerMovilReturn {
    drawerRef: React.RefObject<HTMLDivElement | null>;
    manejarTouchStart: (evento: React.TouchEvent) => void;
    manejarTouchEnd: (evento: React.TouchEvent) => void;
    manejarClickOverlay: (evento: React.MouseEvent<HTMLDivElement>) => void;
    manejarClickOpcion: (opcionId: string) => void;
    manejarClickPerfil: () => void;
    manejarClickPlan: () => void;
}

export function useDrawerMovil({estaAbierto, onCerrar, onSeleccionar, onClickPerfil, onClickPlan}: UseDrawerMovilParams): UseDrawerMovilReturn {
    const drawerRef = useRef<HTMLDivElement>(null);
    const inicioToqueRef = useRef<number>(0);

    /* Cerrar con Escape */
    const manejarTecla = useCallback(
        (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        },
        [onCerrar]
    );

    /* Bloquear scroll del body cuando está abierto y agregar clase para ocultar nav */
    useEffect(() => {
        if (estaAbierto) {
            document.addEventListener('keydown', manejarTecla);
            document.body.style.overflow = 'hidden';
            document.body.classList.add('drawerAbierto');
        }

        return () => {
            document.removeEventListener('keydown', manejarTecla);
            document.body.style.overflow = '';
            document.body.classList.remove('drawerAbierto');
        };
    }, [estaAbierto, manejarTecla]);

    /* Swipe para cerrar */
    const manejarTouchStart = (evento: React.TouchEvent) => {
        inicioToqueRef.current = evento.touches[0].clientX;
    };

    const manejarTouchEnd = (evento: React.TouchEvent) => {
        const finToque = evento.changedTouches[0].clientX;
        const diferencia = inicioToqueRef.current - finToque;

        /* Si deslizó más de 100px hacia la izquierda, cerrar */
        if (diferencia > 100) {
            onCerrar();
        }
    };

    const manejarClickOverlay = (evento: React.MouseEvent<HTMLDivElement>) => {
        if (evento.target === evento.currentTarget) {
            onCerrar();
        }
    };

    const manejarClickOpcion = (opcionId: string) => {
        onSeleccionar(opcionId);
        onCerrar();
    };

    /* Click en foto/nombre abre perfil */
    const manejarClickPerfil = () => {
        if (onClickPerfil) {
            onClickPerfil();
            onCerrar();
        }
    };

    /* Click en badge de plan abre modal suscripción */
    const manejarClickPlan = () => {
        if (onClickPlan) {
            onClickPlan();
            onCerrar();
        }
    };

    return {
        drawerRef,
        manejarTouchStart,
        manejarTouchEnd,
        manejarClickOverlay,
        manejarClickOpcion,
        manejarClickPerfil,
        manejarClickPlan
    };
}

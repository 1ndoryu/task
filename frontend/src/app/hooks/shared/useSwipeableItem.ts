/*
 * useSwipeableItem
 * Hook que gestiona la lógica de gestos de deslizamiento.
 * Incluye: tracking de inicio/movimiento/fin, detección de dirección,
 * cálculo de velocidad y activación de acciones.
 */

import {useRef, useState, useCallback, type ReactNode} from 'react';

interface AccionSwipe {
    color: string;
    icono: ReactNode;
    etiqueta?: string;
}

/* Constantes de configuración */
const UMBRAL_DEFECTO = 0.3;
const RESISTENCIA = 0.7;
const VELOCIDAD_MINIMA = 0.3;

interface UseSwipeableItemParams {
    onSwipeRight?: () => void;
    onSwipeLeft?: () => void;
    accionDerecha?: AccionSwipe;
    accionIzquierda?: AccionSwipe;
    umbralActivacion?: number;
    deshabilitado?: boolean;
}

export function useSwipeableItem({
    onSwipeRight,
    onSwipeLeft,
    accionDerecha,
    accionIzquierda,
    umbralActivacion = UMBRAL_DEFECTO,
    deshabilitado = false
}: UseSwipeableItemParams) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const [desplazamiento, setDesplazamiento] = useState(0);
    const [arrastrando, setArrastrando] = useState(false);

    /* Referencias para tracking del gesto */
    const inicioRef = useRef<{x: number; y: number; tiempo: number} | null>(null);
    const esGestoHorizontalRef = useRef<boolean | null>(null);

    const iniciarArrastre = useCallback(
        (clientX: number, clientY: number) => {
            if (deshabilitado) return;
            inicioRef.current = {x: clientX, y: clientY, tiempo: Date.now()};
            esGestoHorizontalRef.current = null;
            setArrastrando(true);
        },
        [deshabilitado]
    );

    const manejarArrastre = useCallback(
        (clientX: number, clientY: number) => {
            if (!inicioRef.current || deshabilitado) return;

            const deltaX = clientX - inicioRef.current.x;
            const deltaY = clientY - inicioRef.current.y;

            /* Determinar dirección del gesto (solo la primera vez) */
            if (esGestoHorizontalRef.current === null) {
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);
                if (absX > 10 || absY > 10) {
                    esGestoHorizontalRef.current = absX > absY;
                }
            }

            if (!esGestoHorizontalRef.current) return;

            const tieneAccionDerecha = onSwipeRight && accionDerecha;
            const tieneAccionIzquierda = onSwipeLeft && accionIzquierda;

            let nuevoDesplazamiento = deltaX * RESISTENCIA;

            if (nuevoDesplazamiento > 0 && !tieneAccionDerecha) nuevoDesplazamiento = 0;
            if (nuevoDesplazamiento < 0 && !tieneAccionIzquierda) nuevoDesplazamiento = 0;

            setDesplazamiento(nuevoDesplazamiento);
        },
        [deshabilitado, onSwipeRight, onSwipeLeft, accionDerecha, accionIzquierda]
    );

    /* [024A-1] Fix: solo disparar acción si el gesto fue detectado como horizontal.
     * Antes no se verificaba esGestoHorizontalRef, causando que un scroll vertical
     * con componente horizontal mínimo activara completar/omitir tareas. */
    const finalizarArrastre = useCallback(
        (clientX: number) => {
            if (!inicioRef.current || !contenedorRef.current || deshabilitado) {
                setArrastrando(false);
                setDesplazamiento(0);
                inicioRef.current = null;
                esGestoHorizontalRef.current = null;
                return;
            }

            /* Si el gesto no fue horizontal, no evaluar acciones */
            if (!esGestoHorizontalRef.current) {
                setArrastrando(false);
                setDesplazamiento(0);
                inicioRef.current = null;
                esGestoHorizontalRef.current = null;
                return;
            }

            const ancho = contenedorRef.current.offsetWidth;
            const deltaX = clientX - inicioRef.current.x;
            const duracion = Date.now() - inicioRef.current.tiempo;
            const velocidad = Math.abs(deltaX) / duracion;

            const porcentaje = Math.abs(deltaX) / ancho;
            const superaUmbral = porcentaje > umbralActivacion || velocidad > VELOCIDAD_MINIMA;

            if (superaUmbral) {
                if (deltaX > 0 && onSwipeRight) onSwipeRight();
                else if (deltaX < 0 && onSwipeLeft) onSwipeLeft();
            }

            setArrastrando(false);
            setDesplazamiento(0);
            inicioRef.current = null;
            esGestoHorizontalRef.current = null;
        },
        [deshabilitado, umbralActivacion, onSwipeRight, onSwipeLeft]
    );

    /* Manejadores táctiles */
    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => iniciarArrastre(e.touches[0].clientX, e.touches[0].clientY),
        [iniciarArrastre]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => manejarArrastre(e.touches[0].clientX, e.touches[0].clientY),
        [manejarArrastre]
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => finalizarArrastre(e.changedTouches[0].clientX),
        [finalizarArrastre]
    );

    /* Calcular opacidad de acciones según desplazamiento */
    const calcularOpacidad = (esIzquierda: boolean): number => {
        const umbralPixeles = contenedorRef.current ? contenedorRef.current.offsetWidth * umbralActivacion : 80;
        const desplazamientoAbs = Math.abs(desplazamiento);
        const direccionCorrecta = esIzquierda ? desplazamiento < 0 : desplazamiento > 0;
        if (!direccionCorrecta) return 0;
        return Math.min(desplazamientoAbs / umbralPixeles, 1);
    };

    const claseContenedor = `swipeableItem ${arrastrando ? 'swipeableItem--arrastrando' : ''}`;

    return {
        contenedorRef,
        desplazamiento,
        arrastrando,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        calcularOpacidad,
        claseContenedor
    };
}

export type {AccionSwipe};

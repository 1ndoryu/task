/*
 * SwipeableItem
 * Componente wrapper para gestos de deslizamiento en móvil
 * Tarea 0.1: Implementar swipe para completar/eliminar tareas
 *
 * Uso:
 * <SwipeableItem
 *   onSwipeRight={() => completarTarea()}
 *   onSwipeLeft={() => eliminarTarea()}
 *   accionDerecha={{ color: 'var(--dashboard-estadoExito)', icono: <Check /> }}
 *   accionIzquierda={{ color: 'var(--dashboard-estadoError)', icono: <Trash2 /> }}
 * >
 *   <TareaItem ... />
 * </SwipeableItem>
 */

import {useRef, useState, useCallback, type ReactNode} from 'react';

interface AccionSwipe {
    color: string;
    icono: ReactNode;
    etiqueta?: string;
}

interface SwipeableItemProps {
    children: ReactNode;
    onSwipeRight?: () => void;
    onSwipeLeft?: () => void;
    accionDerecha?: AccionSwipe;
    accionIzquierda?: AccionSwipe;
    umbralActivacion?: number; /* Porcentaje del ancho para activar (default 0.3 = 30%) */
    deshabilitado?: boolean;
}

/* Constantes de configuración */
const UMBRAL_DEFECTO = 0.3;
const RESISTENCIA = 0.7; /* Factor de resistencia al arrastre */
const VELOCIDAD_MINIMA = 0.3; /* px/ms para activación rápida */

export function SwipeableItem({children, onSwipeRight, onSwipeLeft, accionDerecha, accionIzquierda, umbralActivacion = UMBRAL_DEFECTO, deshabilitado = false}: SwipeableItemProps): JSX.Element {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const [desplazamiento, setDesplazamiento] = useState(0);
    const [arrastrando, setArrastrando] = useState(false);

    /* Referencias para el tracking del gesto */
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

            /* Determinar si es gesto horizontal o vertical (solo la primera vez) */
            if (esGestoHorizontalRef.current === null) {
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);

                /* Umbral mínimo de movimiento para decidir dirección */
                if (absX > 10 || absY > 10) {
                    esGestoHorizontalRef.current = absX > absY;
                }
            }

            /* Solo procesar si es gesto horizontal confirmado */
            if (!esGestoHorizontalRef.current) return;

            /* Verificar si la dirección tiene acción asignada */
            const tieneAccionDerecha = onSwipeRight && accionDerecha;
            const tieneAccionIzquierda = onSwipeLeft && accionIzquierda;

            /* Aplicar resistencia y limitar dirección según acciones disponibles */
            let nuevoDesplazamiento = deltaX * RESISTENCIA;

            /* Limitar direcciones según acciones configuradas */
            if (nuevoDesplazamiento > 0 && !tieneAccionDerecha) {
                nuevoDesplazamiento = 0;
            }
            if (nuevoDesplazamiento < 0 && !tieneAccionIzquierda) {
                nuevoDesplazamiento = 0;
            }

            setDesplazamiento(nuevoDesplazamiento);
        },
        [deshabilitado, onSwipeRight, onSwipeLeft, accionDerecha, accionIzquierda]
    );

    const finalizarArrastre = useCallback(
        (clientX: number) => {
            if (!inicioRef.current || !contenedorRef.current || deshabilitado) {
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

            /* Calcular si se supera el umbral */
            const porcentaje = Math.abs(deltaX) / ancho;
            const superaUmbral = porcentaje > umbralActivacion || velocidad > VELOCIDAD_MINIMA;

            if (superaUmbral) {
                if (deltaX > 0 && onSwipeRight) {
                    onSwipeRight();
                } else if (deltaX < 0 && onSwipeLeft) {
                    onSwipeLeft();
                }
            }

            /* Reset del estado */
            setArrastrando(false);
            setDesplazamiento(0);
            inicioRef.current = null;
            esGestoHorizontalRef.current = null;
        },
        [deshabilitado, umbralActivacion, onSwipeRight, onSwipeLeft]
    );

    /* Manejadores táctiles */
    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            iniciarArrastre(e.touches[0].clientX, e.touches[0].clientY);
        },
        [iniciarArrastre]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            manejarArrastre(e.touches[0].clientX, e.touches[0].clientY);
        },
        [manejarArrastre]
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            finalizarArrastre(e.changedTouches[0].clientX);
        },
        [finalizarArrastre]
    );

    /* Calcular opacidad de las acciones basada en el desplazamiento */
    const calcularOpacidad = (esIzquierda: boolean): number => {
        const umbralPixeles = contenedorRef.current ? contenedorRef.current.offsetWidth * umbralActivacion : 80;
        const desplazamientoAbs = Math.abs(desplazamiento);
        const direccionCorrecta = esIzquierda ? desplazamiento < 0 : desplazamiento > 0;

        if (!direccionCorrecta) return 0;
        return Math.min(desplazamientoAbs / umbralPixeles, 1);
    };

    /* Clases CSS dinámicas */
    const claseContenedor = `swipeableItem ${arrastrando ? 'swipeableItem--arrastrando' : ''}`;

    return (
        <div ref={contenedorRef} className={claseContenedor} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            {/* Acción derecha (al deslizar a la derecha, se revela a la izquierda) */}
            {accionDerecha && onSwipeRight && (
                <div className="swipeableItem__accion swipeableItem__accion--izquierda" style={{opacity: calcularOpacidad(false)}}>
                    <span className="swipeableItem__accionIcono">{accionDerecha.icono}</span>
                    {accionDerecha.etiqueta && <span className="swipeableItem__accionEtiqueta">{accionDerecha.etiqueta}</span>}
                </div>
            )}

            {/* Acción izquierda (al deslizar a la izquierda, se revela a la derecha) */}
            {accionIzquierda && onSwipeLeft && (
                <div className="swipeableItem__accion swipeableItem__accion--derecha" style={{opacity: calcularOpacidad(true)}}>
                    {accionIzquierda.etiqueta && <span className="swipeableItem__accionEtiqueta">{accionIzquierda.etiqueta}</span>}
                    <span className="swipeableItem__accionIcono">{accionIzquierda.icono}</span>
                </div>
            )}

            {/* Contenido deslizable */}
            <div
                className="swipeableItem__contenido"
                style={{
                    transform: `translateX(${desplazamiento}px)`,
                    transition: arrastrando ? 'none' : 'transform 0.2s ease-out'
                }}>
                {children}
            </div>
        </div>
    );
}

export type {SwipeableItemProps, AccionSwipe};

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

import type {ReactNode} from 'react';
import {useSwipeableItem} from '../../hooks/shared/useSwipeableItem';
import type {AccionSwipe} from '../../hooks/shared/useSwipeableItem';

interface SwipeableItemProps {
    children: ReactNode;
    onSwipeRight?: () => void;
    onSwipeLeft?: () => void;
    accionDerecha?: AccionSwipe;
    accionIzquierda?: AccionSwipe;
    umbralActivacion?: number;
    deshabilitado?: boolean;
}

export function SwipeableItem({children, onSwipeRight, onSwipeLeft, accionDerecha, accionIzquierda, umbralActivacion, deshabilitado}: SwipeableItemProps): JSX.Element {
    const {contenedorRef, desplazamiento, arrastrando, handleTouchStart, handleTouchMove, handleTouchEnd, calcularOpacidad, claseContenedor} = useSwipeableItem({onSwipeRight, onSwipeLeft, accionDerecha, accionIzquierda, umbralActivacion, deshabilitado});

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

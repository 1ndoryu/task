/*
 * BottomSheet
 * Componente para menus que se deslizan desde abajo en movil
 * Fase 10.2: Menus contextuales como Bottom Sheet
 * Fase 10.8.8: Gesto drag-to-close
 *
 * Caracteristicas:
 * - Se desliza desde la parte inferior de la pantalla
 * - Altura automatica segun contenido (max 70vh)
 * - Overlay oscuro clickeable para cerrar
 * - Indicador de arrastre visual con gesto drag-to-close
 */

import {useEffect, useCallback, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

export interface BottomSheetProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    children: React.ReactNode;
    titulo?: string;
}

const UMBRAL_CIERRE = 0.3; /* 30% del alto del panel para cerrar */
const VELOCIDAD_MINIMA = 0.5; /* px/ms para cierre rápido */

export function BottomSheet({estaAbierto, onCerrar, children, titulo: _titulo}: BottomSheetProps): JSX.Element | null {
    const panelRef = useRef<HTMLDivElement>(null);
    const indicadorRef = useRef<HTMLDivElement>(null);
    const [arrastrando, setArrastrando] = useState(false);
    const [desplazamiento, setDesplazamiento] = useState(0);
    const inicioArrastre = useRef<{y: number; tiempo: number} | null>(null);

    /* Cerrar con Escape */
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
            document.body.classList.add('bottomSheetAbierto');
            setDesplazamiento(0);
        }

        return () => {
            document.removeEventListener('keydown', manejarTecla);
            document.body.style.overflow = '';
            document.body.classList.remove('bottomSheetAbierto');
        };
    }, [estaAbierto, manejarTecla]);

    const manejarClickOverlay = (evento: React.MouseEvent<HTMLDivElement>) => {
        if (evento.target === evento.currentTarget) {
            onCerrar();
        }
    };

    /* Inicio del arrastre */
    const iniciarArrastre = useCallback((clienteY: number) => {
        setArrastrando(true);
        inicioArrastre.current = {y: clienteY, tiempo: Date.now()};
    }, []);

    /* Durante el arrastre */
    const manejarArrastre = useCallback(
        (clienteY: number) => {
            if (!arrastrando || !inicioArrastre.current) return;

            const diferencia = clienteY - inicioArrastre.current.y;
            /* Solo permitir arrastrar hacia abajo */
            if (diferencia > 0) {
                setDesplazamiento(diferencia);
            }
        },
        [arrastrando]
    );

    /* Fin del arrastre */
    const finalizarArrastre = useCallback(
        (clienteY: number) => {
            if (!arrastrando || !inicioArrastre.current || !panelRef.current) {
                setArrastrando(false);
                return;
            }

            const diferencia = clienteY - inicioArrastre.current.y;
            const duracion = Date.now() - inicioArrastre.current.tiempo;
            const velocidad = diferencia / duracion;
            const alturaPanel = panelRef.current.offsetHeight;

            /* Cerrar si supera el umbral o si el gesto fue rápido */
            if (diferencia > alturaPanel * UMBRAL_CIERRE || velocidad > VELOCIDAD_MINIMA) {
                onCerrar();
            }

            setArrastrando(false);
            setDesplazamiento(0);
            inicioArrastre.current = null;
        },
        [arrastrando, onCerrar]
    );

    /* Manejadores de eventos táctiles */
    const manejarTouchStart = useCallback(
        (evento: React.TouchEvent) => {
            iniciarArrastre(evento.touches[0].clientY);
        },
        [iniciarArrastre]
    );

    const manejarTouchMove = useCallback(
        (evento: React.TouchEvent) => {
            manejarArrastre(evento.touches[0].clientY);
        },
        [manejarArrastre]
    );

    const manejarTouchEnd = useCallback(
        (evento: React.TouchEvent) => {
            finalizarArrastre(evento.changedTouches[0].clientY);
        },
        [finalizarArrastre]
    );

    /* Manejadores de eventos de ratón (para desarrollo) */
    const manejarMouseDown = useCallback(
        (evento: React.MouseEvent) => {
            iniciarArrastre(evento.clientY);
        },
        [iniciarArrastre]
    );

    useEffect(() => {
        if (!arrastrando) return;

        const manejarMouseMove = (evento: MouseEvent) => {
            manejarArrastre(evento.clientY);
        };

        const manejarMouseUp = (evento: MouseEvent) => {
            finalizarArrastre(evento.clientY);
        };

        window.addEventListener('mousemove', manejarMouseMove);
        window.addEventListener('mouseup', manejarMouseUp);

        return () => {
            window.removeEventListener('mousemove', manejarMouseMove);
            window.removeEventListener('mouseup', manejarMouseUp);
        };
    }, [arrastrando, manejarArrastre, finalizarArrastre]);

    if (!estaAbierto) return null;

    const estiloPanel = {
        transform: desplazamiento > 0 ? `translateY(${desplazamiento}px)` : undefined,
        transition: arrastrando ? 'none' : undefined
    };

    const contenido = (
        <>
            {/* Overlay oscuro */}
            {/* sentinel-disable-next-line componente-artesanal — ES el bottom sheet primitivo del sistema */}
            <div className={`bottomSheetOverlay ${estaAbierto ? 'bottomSheetOverlay--visible' : ''}`} onClick={manejarClickOverlay} aria-hidden="true" />

            {/* Panel inferior */}
            <div ref={panelRef} className={`bottomSheetPanel ${estaAbierto ? 'bottomSheetPanel--visible' : ''}`} role="dialog" aria-modal="true" style={estiloPanel}>
                {/* Indicador de arrastre - área táctil para drag-to-close */}
                <div ref={indicadorRef} className="bottomSheetIndicador bottomSheetIndicadorArrastrable" onTouchStart={manejarTouchStart} onTouchMove={manejarTouchMove} onTouchEnd={manejarTouchEnd} onMouseDown={manejarMouseDown} />

                {/* Titulo opcional eliminado para consistencia limpia */ null}

                {/* Contenido */}
                <div className="bottomSheetContenido">{children}</div>
            </div>
        </>
    );

    /* Usar Portal para renderizar fuera del flujo del componente padre (evitar clipping por overflow:hidden) */
    return createPortal(contenido, document.body);
}

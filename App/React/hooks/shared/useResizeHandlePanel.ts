/*
 * useResizeHandlePanel
 * Lógica extraída de ResizeHandlePanel para cumplir SRP
 * Gestiona redimensionamiento de altura de paneles con anclaje inteligente a auto
 */

import {useState, useRef, useEffect, useCallback} from 'react';
import type {PanelId} from '../useConfiguracionLayout';

/* Límite mínimo de altura en píxeles */
const ALTURA_MINIMA = 120;

/* Margen de tolerancia para activar el anclaje a auto (snap) */
const MARGEN_ANCLAJE = 20;

/* Movimiento mínimo para considerar arrastre intencional */
const MOVIMIENTO_MINIMO = 5;

interface UseResizeHandlePanelParams {
    panelId: PanelId;
    alturaInicial: string;
    onCambiarAltura: (panelId: PanelId, altura: string) => void;
}

interface UseResizeHandlePanelReturn {
    contenedorRef: React.RefObject<HTMLDivElement | null>;
    isResizing: boolean;
    alturaLocal: string;
    esAuto: boolean;
    handleMouseDown: (e: React.MouseEvent) => void;
    handleDoubleClick: () => void;
}

export function useResizeHandlePanel({panelId, alturaInicial, onCambiarAltura}: UseResizeHandlePanelParams): UseResizeHandlePanelReturn {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [alturaLocal, setAlturaLocal] = useState<string>(alturaInicial);

    /* Determinar si está en modo auto */
    const esAuto = alturaLocal === 'auto';

    /* Sincronizar con altura externa cuando no se está redimensionando */
    useEffect(() => {
        if (!isResizing) {
            setAlturaLocal(alturaInicial);
        }
    }, [alturaInicial, isResizing]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);

            const startY = e.clientY;
            const contenedor = contenedorRef.current;

            if (!contenedor) return;

            const rect = contenedor.getBoundingClientRect();
            const startHeight = rect.height;
            const contenidoTotal = contenedor.scrollHeight;

            let huboMovimiento = false;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaY = moveEvent.clientY - startY;

                if (Math.abs(deltaY) > MOVIMIENTO_MINIMO) {
                    huboMovimiento = true;
                }

                const alturaDeseada = startHeight + deltaY;

                if (alturaDeseada >= contenidoTotal - MARGEN_ANCLAJE) {
                    setAlturaLocal('auto');
                } else {
                    const nuevaAltura = Math.max(ALTURA_MINIMA, alturaDeseada);
                    setAlturaLocal(`${Math.round(nuevaAltura)}px`);
                }
            };

            const handleMouseUp = (upEvent: MouseEvent) => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                setIsResizing(false);

                const deltaY = upEvent.clientY - startY;

                if (!huboMovimiento && Math.abs(deltaY) <= MOVIMIENTO_MINIMO) {
                    setAlturaLocal(alturaInicial);
                    return;
                }

                const alturaDeseada = startHeight + deltaY;

                /* Persistir la decisión final: auto o px */
                if (alturaDeseada >= contenidoTotal - MARGEN_ANCLAJE) {
                    onCambiarAltura(panelId, 'auto');
                } else {
                    const alturaFinal = Math.max(ALTURA_MINIMA, alturaDeseada);
                    onCambiarAltura(panelId, `${Math.round(alturaFinal)}px`);
                }
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [panelId, onCambiarAltura, alturaInicial]
    );

    /* Doble clic para alternar manualmente */
    const handleDoubleClick = useCallback(() => {
        if (esAuto) {
            const alturaActual = contenedorRef.current?.getBoundingClientRect().height || 300;
            onCambiarAltura(panelId, `${Math.round(alturaActual)}px`);
        } else {
            onCambiarAltura(panelId, 'auto');
        }
    }, [esAuto, panelId, onCambiarAltura]);

    return {
        contenedorRef,
        isResizing,
        alturaLocal,
        esAuto,
        handleMouseDown,
        handleDoubleClick
    };
}

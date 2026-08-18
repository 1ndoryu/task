/*
 * useLayoutManager
 * Hook que encapsula la lógica de redimensionamiento de columnas
 * del LayoutManager del dashboard: tracking de arrastre, cálculo
 * de anchos con limites min/max, listeners de documento y estilo grid.
 */

import {useState, useRef, useCallback, useEffect, type CSSProperties} from 'react';
import type {ModoColumnas, AnchoColumnas} from '../useConfiguracionLayout';
import {ANCHO_MINIMO_COLUMNA, ANCHO_MAXIMO_COLUMNA} from '../useConfiguracionLayout';

interface UseLayoutManagerParams {
    modoColumnas: ModoColumnas;
    anchos: AnchoColumnas;
    onAjustarAnchos?: (anchos: Partial<AnchoColumnas>) => void;
}

export function useLayoutManager({modoColumnas, anchos, onAjustarAnchos}: UseLayoutManagerParams) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const [arrastrando, setArrastrando] = useState<'handle1' | 'handle2' | null>(null);

    /* Manejar inicio de arrastre */
    const iniciarArrastre = useCallback(
        (handle: 'handle1' | 'handle2') => (e: React.MouseEvent) => {
            e.preventDefault();
            setArrastrando(handle);
        },
        []
    );

    /* Manejar movimiento durante arrastre */
    const manejarMovimiento = useCallback(
        (e: MouseEvent) => {
            if (!arrastrando || !contenedorRef.current || !onAjustarAnchos) return;

            const rect = contenedorRef.current.getBoundingClientRect();
            const posicionRelativa = ((e.clientX - rect.left) / rect.width) * 100;

            if (modoColumnas === 2 && arrastrando === 'handle1') {
                const nuevoAncho1 = Math.min(Math.max(posicionRelativa, ANCHO_MINIMO_COLUMNA), ANCHO_MAXIMO_COLUMNA);
                const nuevoAncho2 = 100 - nuevoAncho1;

                if (nuevoAncho2 >= ANCHO_MINIMO_COLUMNA) {
                    onAjustarAnchos({
                        columna1: nuevoAncho1,
                        columna2: nuevoAncho2
                    });
                }
            } else if (modoColumnas === 3) {
                if (arrastrando === 'handle1') {
                    const nuevoAncho1 = Math.min(Math.max(posicionRelativa, ANCHO_MINIMO_COLUMNA), ANCHO_MAXIMO_COLUMNA);
                    const espacioRestante = 100 - nuevoAncho1;
                    const proporcion = anchos.columna2 / (anchos.columna2 + anchos.columna3);
                    const nuevoAncho2 = espacioRestante * proporcion;
                    const nuevoAncho3 = espacioRestante - nuevoAncho2;

                    if (nuevoAncho2 >= ANCHO_MINIMO_COLUMNA && nuevoAncho3 >= ANCHO_MINIMO_COLUMNA) {
                        onAjustarAnchos({
                            columna1: nuevoAncho1,
                            columna2: nuevoAncho2,
                            columna3: nuevoAncho3
                        });
                    }
                } else if (arrastrando === 'handle2') {
                    const anchoColumna1 = anchos.columna1;
                    const anchoDisponible = 100 - anchoColumna1;
                    const posicionEnDisponible = posicionRelativa - anchoColumna1;
                    const nuevoAncho2 = Math.min(Math.max(posicionEnDisponible, ANCHO_MINIMO_COLUMNA), anchoDisponible - ANCHO_MINIMO_COLUMNA);
                    const nuevoAncho3 = anchoDisponible - nuevoAncho2;

                    if (nuevoAncho3 >= ANCHO_MINIMO_COLUMNA) {
                        onAjustarAnchos({
                            columna2: nuevoAncho2,
                            columna3: nuevoAncho3
                        });
                    }
                }
            }
        },
        [arrastrando, modoColumnas, anchos, onAjustarAnchos]
    );

    /* Manejar fin de arrastre */
    const finalizarArrastre = useCallback(() => {
        setArrastrando(null);
    }, []);

    /* Listeners de documento para movimiento y fin de arrastre */
    useEffect(() => {
        if (!arrastrando) return;

        document.addEventListener('mousemove', manejarMovimiento);
        document.addEventListener('mouseup', finalizarArrastre);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', manejarMovimiento);
            document.removeEventListener('mouseup', finalizarArrastre);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [arrastrando, manejarMovimiento, finalizarArrastre]);

    /* Calcular estilos dinámicos del grid */
    const estiloGrid: CSSProperties = (() => {
        if (modoColumnas === 1) {
            return {
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 'var(--dashboard-espacioXl)'
            };
        }

        const columnas = modoColumnas === 2
            ? `${anchos.columna1}% ${anchos.columna2}%`
            : `${anchos.columna1}% ${anchos.columna2}% ${anchos.columna3}%`;

        return {
            display: 'grid',
            gridTemplateColumns: columnas,
            gap: 'var(--dashboard-espacioXl)'
        };
    })();

    return {
        contenedorRef,
        arrastrando,
        iniciarArrastre,
        estiloGrid
    };
}

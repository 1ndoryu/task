/*
 * BottomSheet
 * Componente para menus que se deslizan desde abajo en movil
 * Fase 10.2: Menus contextuales como Bottom Sheet
 *
 * Caracteristicas:
 * - Se desliza desde la parte inferior de la pantalla
 * - Altura automatica segun contenido (max 70vh)
 * - Overlay oscuro clickeable para cerrar
 * - Indicador de arrastre visual
 */

import {useEffect, useCallback} from 'react';

export interface BottomSheetProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    children: React.ReactNode;
    titulo?: string;
}

export function BottomSheet({estaAbierto, onCerrar, children, titulo}: BottomSheetProps): JSX.Element | null {
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
        }

        return () => {
            document.removeEventListener('keydown', manejarTecla);
            document.body.style.overflow = '';
        };
    }, [estaAbierto, manejarTecla]);

    const manejarClickOverlay = (evento: React.MouseEvent<HTMLDivElement>) => {
        if (evento.target === evento.currentTarget) {
            onCerrar();
        }
    };

    if (!estaAbierto) return null;

    return (
        <>
            {/* Overlay oscuro */}
            <div className={`bottomSheetOverlay ${estaAbierto ? 'bottomSheetOverlay--visible' : ''}`} onClick={manejarClickOverlay} aria-hidden="true" />

            {/* Panel inferior */}
            <div className={`bottomSheetPanel ${estaAbierto ? 'bottomSheetPanel--visible' : ''}`} role="dialog" aria-modal="true">
                {/* Indicador de arrastre */}
                <div className="bottomSheetIndicador" />

                {/* Titulo opcional */}
                {titulo && (
                    <div className="bottomSheetCabecera">
                        <h3 className="bottomSheetTitulo">{titulo}</h3>
                    </div>
                )}

                {/* Contenido */}
                <div className="bottomSheetContenido">{children}</div>
            </div>
        </>
    );
}

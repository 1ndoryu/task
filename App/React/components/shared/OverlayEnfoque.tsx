/*
 * OverlayEnfoque
 * Componente overlay para el modo enfoque de paneles
 *
 * Muestra el fondo difuminado y renderiza el contenido del panel
 * centrado en la pantalla
 */

import {useEffect, useCallback} from 'react';
import {X, Minimize2} from 'lucide-react';

interface OverlayEnfoqueProps {
    estaActivo: boolean;
    onCerrar: () => void;
    children: React.ReactNode;
    titulo?: string;
}

export function OverlayEnfoque({estaActivo, onCerrar, children, titulo}: OverlayEnfoqueProps): JSX.Element | null {
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
        if (estaActivo) {
            document.addEventListener('keydown', manejarTecla);
        }

        return () => {
            document.removeEventListener('keydown', manejarTecla);
        };
    }, [estaActivo, manejarTecla]);

    if (!estaActivo) return null;

    const manejarClickOverlay = (evento: React.MouseEvent<HTMLDivElement>) => {
        if (evento.target === evento.currentTarget) {
            onCerrar();
        }
    };

    return (
        <div id="overlay-enfoque" className="overlayEnfoque" onClick={manejarClickOverlay}>
            <div className="overlayEnfoqueContenedor">
                <div className="overlayEnfoqueHeader">
                    {titulo && <span className="overlayEnfoqueTitulo">{titulo}</span>}
                    <button className="overlayEnfoqueBotonCerrar" onClick={onCerrar} title="Salir del modo enfoque (Esc)" type="button">
                        <Minimize2 size={16} />
                    </button>
                </div>
                <div className="overlayEnfoqueContenido">{children}</div>
            </div>
        </div>
    );
}

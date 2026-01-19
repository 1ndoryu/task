/*
 * OverlayEnfoque
 * Componente overlay para el modo enfoque de paneles
 *
 * Muestra el fondo difuminado y renderiza el contenido del panel
 * centrado en la pantalla
 *
 * Funcionalidad de bloqueo:
 * - Botón candado permite bloquear el panel
 * - Cuando está bloqueado, click fuera NO cierra el panel
 * - Escape siempre cierra (incluso bloqueado)
 */

import {useEffect, useCallback, useState} from 'react';
import {Minimize2, Lock, Unlock} from 'lucide-react';

interface OverlayEnfoqueProps {
    estaActivo: boolean;
    onCerrar: () => void;
    children: React.ReactNode;
    titulo?: string;
}

export function OverlayEnfoque({estaActivo, onCerrar, children, titulo}: OverlayEnfoqueProps): JSX.Element | null {
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

    if (!estaActivo) return null;

    const manejarClickOverlay = (evento: React.MouseEvent<HTMLDivElement>) => {
        /* Si está bloqueado, no cerrar al hacer click fuera */
        if (bloqueado) return;

        if (evento.target === evento.currentTarget) {
            onCerrar();
        }
    };

    const toggleBloqueo = () => {
        setBloqueado(prev => !prev);
    };

    return (
        <div id="overlay-enfoque" className={`overlayEnfoque ${bloqueado ? 'overlayEnfoque--bloqueado' : ''}`} onClick={manejarClickOverlay}>
            <div className="overlayEnfoqueContenedor">
                <div className="overlayEnfoqueHeader">
                    {titulo && <span className="overlayEnfoqueTitulo">{titulo}</span>}
                    <div className="overlayEnfoqueBotones">
                        <button className={`overlayEnfoqueBotonBloqueo ${bloqueado ? 'overlayEnfoqueBotonBloqueo--activo' : ''}`} onClick={toggleBloqueo} title={bloqueado ? 'Desbloquear panel (permitir cierre al hacer click fuera)' : 'Bloquear panel (impedir cierre al hacer click fuera)'} type="button">
                            {bloqueado ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <button className="overlayEnfoqueBotonCerrar" onClick={onCerrar} title="Salir del modo enfoque (Esc)" type="button">
                            <Minimize2 size={16} />
                        </button>
                    </div>
                </div>
                <div className="overlayEnfoqueContenido">{children}</div>
            </div>
        </div>
    );
}

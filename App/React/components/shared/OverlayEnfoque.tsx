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

import {Minimize2, Lock, Unlock} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {useOverlayEnfoque} from '../../hooks/shared/useOverlayEnfoque';

interface OverlayEnfoqueProps {
    estaActivo: boolean;
    onCerrar: () => void;
    children: React.ReactNode;
    titulo?: string;
}

export function OverlayEnfoque({estaActivo, onCerrar, children, titulo}: OverlayEnfoqueProps): JSX.Element | null {
    const {bloqueado, manejarClickOverlay, toggleBloqueo} = useOverlayEnfoque({estaActivo, onCerrar});

    if (!estaActivo) return null;

    return (
        <div id="overlay-enfoque" className={`overlayEnfoque ${bloqueado ? 'overlayEnfoque--bloqueado' : ''}`} onClick={manejarClickOverlay}>
            <div className="overlayEnfoqueContenedor">
                <div className="overlayEnfoqueHeader">
                    {titulo && <span className="overlayEnfoqueTitulo">{titulo}</span>}
                    <div className="overlayEnfoqueBotones">
                        <Boton claseAdicional={`overlayEnfoqueBotonBloqueo ${bloqueado ? 'overlayEnfoqueBotonBloqueo--activo' : ''}`} onClick={toggleBloqueo} title={bloqueado ? 'Desbloquear panel (permitir cierre al hacer click fuera)' : 'Bloquear panel (impedir cierre al hacer click fuera)'} type="button">
                            {bloqueado ? <Lock size={14} /> : <Unlock size={14} />}
                        </Boton>
                        <Boton claseAdicional="overlayEnfoqueBotonCerrar" onClick={onCerrar} title="Salir del modo enfoque (Esc)" type="button">
                            <Minimize2 size={16} />
                        </Boton>
                    </div>
                </div>
                <div className="overlayEnfoqueContenido">{children}</div>
            </div>
        </div>
    );
}

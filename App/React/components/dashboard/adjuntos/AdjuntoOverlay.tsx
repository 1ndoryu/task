import {X} from 'lucide-react';
import {Boton} from '../../ui';
import type {Adjunto} from '../../../types/dashboard';

interface AdjuntoOverlayProps {
    previewImage: Adjunto;
    url: string | null;
    onClose: () => void;
}

export function AdjuntoOverlay({previewImage, url, onClose}: AdjuntoOverlayProps) {
    return (
        <div className="adjuntoOverlay" onClick={onClose}>
            <div className="adjuntoOverlayContenido" onClick={e => e.stopPropagation()}>
                <Boton
                    variante="icono"
                    onClick={onClose}
                    icono={<X size={24} />}
                    claseAdicional="adjuntoBotonCerrar"
                />
                <img src={url || previewImage.url} alt={previewImage.nombre} className="adjuntoImagenFull" />
            </div>
        </div>
    );
}

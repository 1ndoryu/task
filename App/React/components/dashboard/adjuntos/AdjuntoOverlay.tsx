import {X} from 'lucide-react';
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
                <button className="adjuntoBotonCerrar" onClick={onClose}>
                    <X size={24} />
                </button>
                <img src={url || previewImage.url} alt={previewImage.nombre} className="adjuntoImagenFull" />
            </div>
        </div>
    );
}

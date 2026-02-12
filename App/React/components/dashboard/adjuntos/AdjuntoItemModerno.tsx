import {Trash2, Play, Pause, File, Lock, Download} from 'lucide-react';
import {Boton} from '../../ui';
import type {Adjunto} from '../../../types/dashboard';

interface AdjuntoItemModernoProps {
    adjunto: Adjunto;
    onDelete: (id: number) => void;
    urlPreview: string | null;
    esCifrado: boolean;
    onPreviewClick: (adjunto: Adjunto) => void;
    // Audio
    isPlaying: boolean;
    onToggleAudio: (id: number) => void;
    audioRef: (el: HTMLAudioElement | null) => void;
    onTimeUpdate: (id: number) => void;
    onAudioEnded: (id: number) => void;
}

export function AdjuntoItemModerno({adjunto, onDelete, urlPreview, esCifrado, onPreviewClick, isPlaying, onToggleAudio, audioRef, onTimeUpdate, onAudioEnded}: AdjuntoItemModernoProps) {
    return (
        <div className="adjuntosGrid__item">
            {/* Preview Area */}
            <div className="adjuntosGrid__preview" onClick={() => onPreviewClick(adjunto)}>
                {adjunto.tipo === 'imagen' && urlPreview ? (
                    <img src={urlPreview} alt={adjunto.nombre} />
                ) : adjunto.tipo === 'audio' ? (
                    <div className="adjuntosGrid__audio">
                        <Boton
                            variante="icono"
                            onClick={e => {
                                e.stopPropagation();
                                onToggleAudio(adjunto.id);
                            }}
                            icono={isPlaying ? <Pause size={14} /> : <Play size={14} style={{marginLeft: '2px'}} />}
                            claseAdicional="adjuntosGrid__audioBtn"
                        />
                        <audio ref={audioRef} src={adjunto.url} onTimeUpdate={() => onTimeUpdate(adjunto.id)} onEnded={() => onAudioEnded(adjunto.id)} style={{display: 'none'}} />
                    </div>
                ) : (
                    <File size={32} strokeWidth={1.5} className="adjuntosGrid__icono" />
                )}
            </div>

            {/* Info Area */}
            <div className="adjuntosGrid__info">
                <div className="adjuntosGrid__nombre" title={adjunto.nombre}>
                    {esCifrado && <Lock size={12} className="adjuntosGrid__iconoCifrado" />}
                    <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{adjunto.nombre}</span>
                </div>
                <div className="adjuntosGrid__acciones">
                    {/* Download */}
                    <a href={adjunto.url} download={adjunto.nombre} className="adjuntosGrid__accion" title="Descargar" onClick={e => e.stopPropagation()}>
                        <Download size={12} />
                    </a>
                    {/* Delete */}
                    <Boton
                        variante="icono"
                        onClick={e => {
                            e.stopPropagation();
                            onDelete(adjunto.id);
                        }}
                        icono={<Trash2 size={12} />}
                        titulo="Eliminar"
                        claseAdicional="adjuntosGrid__accion adjuntosGrid__accion--peligro"
                    />
                </div>
            </div>
        </div>
    );
}

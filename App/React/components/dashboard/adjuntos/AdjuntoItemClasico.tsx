import {Trash2, Music, Play, Pause, File, Lock, Loader2} from 'lucide-react';
import type {Adjunto} from '../../../types/dashboard';
import {formatBytes} from '../../../utils/formato';
import {Boton} from '../../ui';

interface AdjuntoItemClasicoProps {
    adjunto: Adjunto;
    onDelete: (id: number) => void;
    // Preview
    urlPreview: string | null;
    esCifrado: boolean;
    yaDescifrado: boolean;
    cargando: boolean;
    onPreviewClick: (adjunto: Adjunto) => void;
    // Audio
    isPlaying: boolean;
    progress: number;
    onToggleAudio: (id: number) => void;
    audioRef: (el: HTMLAudioElement | null) => void;
    onTimeUpdate: (id: number) => void;
    onAudioEnded: (id: number) => void;
}

export function AdjuntoItemClasico({adjunto, onDelete, urlPreview, esCifrado, yaDescifrado, cargando, onPreviewClick, isPlaying, progress, onToggleAudio, audioRef, onTimeUpdate, onAudioEnded}: AdjuntoItemClasicoProps) {
    const sinPreview = !urlPreview && !yaDescifrado;

    return (
        <div className="adjuntoItem">
            {/* Preview / Icono */}
            <div className={`adjuntoPreview ${adjunto.tipo === 'imagen' ? 'adjuntoPreviewImagen' : ''} ${esCifrado && !yaDescifrado ? 'adjuntoPreviewCifrado' : ''}`} onClick={() => onPreviewClick(adjunto)} title={esCifrado && !yaDescifrado ? 'Clic para ver imagen completa (cifrada)' : undefined}>
                {cargando ? (
                    <Loader2 size={20} className="adjuntoIcono iconoGirando" />
                ) : adjunto.tipo === 'imagen' && urlPreview ? (
                    <>
                        <img src={urlPreview} alt={adjunto.nombre} />
                        {esCifrado && !yaDescifrado && (
                            <div className="adjuntoIndicadorCifrado">
                                <Lock size={10} />
                            </div>
                        )}
                    </>
                ) : sinPreview && esCifrado ? (
                    <Lock size={20} className="adjuntoIcono adjuntoIconoCifrado" />
                ) : adjunto.tipo === 'audio' ? (
                    <Music size={20} className="adjuntoIcono" />
                ) : (
                    <File size={20} className="adjuntoIcono" />
                )}
            </div>

            {/* Info / Player */}
            <div className="adjuntoInfo">
                <div className="adjuntoInfoFila">
                    {adjunto.tipo === 'audio' ? (
                        <div className="adjuntoAudioControl">
                            <Boton claseAdicional="adjuntoBotonPlay" onClick={() => onToggleAudio(adjunto.id)}>
                                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                            </Boton>
                            <div className="adjuntoAudioBarra">
                                <div className="adjuntoAudioProgreso" style={{width: `${progress}%`}} />
                            </div>
                            <audio ref={audioRef} src={adjunto.url} onTimeUpdate={() => onTimeUpdate(adjunto.id)} onEnded={() => onAudioEnded(adjunto.id)} className="inputOculto" />
                            <span className="adjuntoMeta adjuntoMeta--truncado" title={adjunto.nombre}>
                                {adjunto.nombre}
                            </span>
                        </div>
                    ) : (
                        <a href={adjunto.url} download={adjunto.nombre} className="adjuntoNombre" title={`Descargar ${adjunto.nombre}`}>
                            {adjunto.nombre}
                        </a>
                    )}
                </div>

                {adjunto.tipo !== 'audio' && (
                    <span className="adjuntoMeta">
                        {formatBytes(adjunto.tamano)} • {new Date(adjunto.fechaSubida).toLocaleDateString()}
                    </span>
                )}
            </div>

            <Boton claseAdicional="adjuntoAccionEliminar" onClick={() => onDelete(adjunto.id)} title="Eliminar adjunto">
                <Trash2 size={14} />
            </Boton>
        </div>
    );
}

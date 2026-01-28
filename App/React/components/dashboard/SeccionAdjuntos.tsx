/*
 * SeccionAdjuntos
 * Componente para gestionar archivos adjuntos en una tarea
 * Refactorizado para usar hooks y componentes atomicos (SRP)
 */

import {useRef, useState} from 'react';
import {Upload, Loader2, AlertTriangle, X} from 'lucide-react';
import type {Adjunto} from '../../types/dashboard';
import {SeccionPanel} from '../shared';

import {useAudioPlayer} from '../../hooks/shared/useAudioPlayer';
import {useAdjuntosCifrados} from '../../hooks/adjuntos/useAdjuntosCifrados';
import {useGestionAdjuntos} from '../../hooks/adjuntos/useGestionAdjuntos';

import {AdjuntoItemClasico} from './adjuntos/AdjuntoItemClasico';
import {AdjuntoItemModerno} from './adjuntos/AdjuntoItemModerno';
import {AdjuntoOverlay} from './adjuntos/AdjuntoOverlay';

interface SeccionAdjuntosProps {
    adjuntos: Adjunto[];
    onChange: (adjuntos: Adjunto[]) => void;
    modoLegacy?: boolean;
    estilo?: 'clasico' | 'moderno';
    etiqueta?: string;
}

export function SeccionAdjuntos({adjuntos, onChange, modoLegacy = false, estilo = 'clasico', etiqueta = 'Adjuntos'}: SeccionAdjuntosProps): JSX.Element {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioPlayer = useAudioPlayer();
    const adjuntosCifrados = useAdjuntosCifrados();
    const {error, estadoSubida, handleFileSelect, eliminarAdjunto} = useGestionAdjuntos(adjuntos, onChange, modoLegacy);

    const [previewImage, setPreviewImage] = useState<Adjunto | null>(null);

    const obtenerUrlPreview = (adjunto: Adjunto): string | null => {
        if (adjunto.url.startsWith('data:')) return adjunto.url;
        if (adjuntosCifrados.contenidoDescifrado[adjunto.id]) return adjuntosCifrados.contenidoDescifrado[adjunto.id];
        if (adjuntosCifrados.esCifrado(adjunto)) return adjunto.thumbnailUrl || null;
        return adjunto.url;
    };

    const onPreviewClick = (adjunto: Adjunto) => {
        if (adjuntosCifrados.cargandoDescifrado[adjunto.id]) return;

        const estaCifrado = adjuntosCifrados.esCifrado(adjunto);
        const yaDescifrado = adjuntosCifrados.tieneContenidoCargado(adjunto.id);

        if (estaCifrado && !yaDescifrado) {
            adjuntosCifrados.cargarContenido(adjunto).then(url => {
                if (url && adjunto.tipo === 'imagen') {
                    setPreviewImage({...adjunto, url});
                }
            });
        } else if (adjunto.tipo === 'imagen') {
            const url = obtenerUrlPreview(adjunto) || adjunto.url;
            setPreviewImage({...adjunto, url});
        } else if (adjunto.tipo !== 'audio' && !estaCifrado) {
            window.open(adjunto.url, '_blank');
        }
    };

    const handleDelete = (id: number) => {
        eliminarAdjunto(id, id => audioPlayer.playingId === id && audioPlayer.toggleAudio(id));
    };

    const renderContenidoClasico = () => (
        <SeccionPanel titulo="Adjuntos">
            <div className="adjuntosContenedor">
                {adjuntos.length > 0 && (
                    <div className="adjuntosLista">
                        {adjuntos.map(adjunto => (
                            <AdjuntoItemClasico key={adjunto.id} adjunto={adjunto} onDelete={handleDelete} urlPreview={obtenerUrlPreview(adjunto)} esCifrado={adjuntosCifrados.esCifrado(adjunto)} yaDescifrado={adjuntosCifrados.tieneContenidoCargado(adjunto.id)} cargando={!!adjuntosCifrados.cargandoDescifrado[adjunto.id]} onPreviewClick={onPreviewClick} isPlaying={audioPlayer.playingId === adjunto.id} progress={audioPlayer.progress[adjunto.id] || 0} onToggleAudio={audioPlayer.toggleAudio} audioRef={el => audioPlayer.registerAudio(adjunto.id, el)} onTimeUpdate={audioPlayer.handleTimeUpdate} onAudioEnded={audioPlayer.handleAudioEnded} />
                        ))}
                    </div>
                )}
                {/* Area de carga */}
                <div className={`adjuntosAreaCarga ${estadoSubida.subiendo ? 'adjuntosAreaCarga--subiendo' : ''}`} onClick={() => !estadoSubida.subiendo && fileInputRef.current?.click()}>
                    {estadoSubida.subiendo ? (
                        <>
                            <Loader2 size={16} className="adjuntosIconoCarga iconoGirando" />
                            <span className="adjuntosSubtextoCarga">Subiendo archivo...</span>
                        </>
                    ) : (
                        <>
                            <Upload size={16} className="adjuntosIconoCarga" />
                            <span className="adjuntosSubtextoCarga">Imágenes, Audios o Documentos (Max 5MB)</span>
                        </>
                    )}
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{display: 'none'}}
                    onChange={e => {
                        handleFileSelect(e);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                    disabled={estadoSubida.subiendo}
                />

                {(error || estadoSubida.error) && (
                    <div className="adjuntosMensajeError">
                        <AlertTriangle size={12} />
                        {error || estadoSubida.error}
                    </div>
                )}

                {previewImage && <AdjuntoOverlay previewImage={previewImage} url={previewImage.url} onClose={() => setPreviewImage(null)} />}
            </div>
        </SeccionPanel>
    );

    const renderContenidoModerno = () => (
        <>
            <div className="propiedadesCompactas">
                <span className="propiedadesCompactas__etiqueta">{etiqueta}</span>
                <div className="propiedadesCompactas__contenido">
                    <button type="button" className="pillOpcion pillOpcion--vacio" onClick={() => fileInputRef.current?.click()} title="Agregar adjunto" disabled={estadoSubida.subiendo}>
                        {estadoSubida.subiendo ? <Loader2 size={14} className="iconoGirando" /> : <Upload size={14} />}
                        <span>Agregar</span>
                    </button>
                    {(error || estadoSubida.error) && (
                        <div className="textoPequeno textoError" style={{marginLeft: '10px'}}>
                            {error || estadoSubida.error}
                        </div>
                    )}
                </div>
            </div>

            {adjuntos.length > 0 && (
                <div className="adjuntosContenedorGrid">
                    <div className="adjuntosGrid">
                        {adjuntos.map(adjunto => (
                            <AdjuntoItemModerno key={adjunto.id} adjunto={adjunto} onDelete={handleDelete} urlPreview={obtenerUrlPreview(adjunto)} esCifrado={adjuntosCifrados.esCifrado(adjunto)} onPreviewClick={onPreviewClick} isPlaying={audioPlayer.playingId === adjunto.id} onToggleAudio={audioPlayer.toggleAudio} audioRef={el => audioPlayer.registerAudio(adjunto.id, el)} onTimeUpdate={audioPlayer.handleTimeUpdate} onAudioEnded={audioPlayer.handleAudioEnded} />
                        ))}
                    </div>
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                style={{display: 'none'}}
                onChange={e => {
                    handleFileSelect(e);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                disabled={estadoSubida.subiendo}
            />

            {previewImage && <AdjuntoOverlay previewImage={previewImage} url={previewImage.url} onClose={() => setPreviewImage(null)} />}
        </>
    );

    return estilo === 'moderno' ? renderContenidoModerno() : renderContenidoClasico();
}

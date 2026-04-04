/*
 * SeccionAdjuntos
 * Componente para gestionar archivos adjuntos en una tarea
 * Refactorizado para usar hooks y componentes atomicos (SRP)
 * Incluye verificación de límites según plan de suscripción
 */

import {useRef, useState} from 'react';
import {Upload, Loader2, AlertTriangle} from 'lucide-react';
import type {Adjunto} from '../../types/dashboard';
import {SeccionPanel} from '../shared';
import {Boton, Input} from '../ui';

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
    /* Props de suscripción para verificar límites */
    limiteAdjuntos?: number;
    onClickUpgrade?: () => void;
}

export function SeccionAdjuntos({adjuntos, onChange, modoLegacy = false, estilo = 'clasico', etiqueta = 'Adjuntos', limiteAdjuntos = 0, onClickUpgrade}: SeccionAdjuntosProps): JSX.Element {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioPlayer = useAudioPlayer();
    const adjuntosCifrados = useAdjuntosCifrados();
    const {error, estadoSubida, handleFileSelect, eliminarAdjunto} = useGestionAdjuntos(adjuntos, onChange, modoLegacy);

    const [previewImage, setPreviewImage] = useState<Adjunto | null>(null);

    /* Verificar si tiene permisos para subir adjuntos */
    const puedeSubir = limiteAdjuntos > 0;
    const alcanzadoLimite = adjuntos.length >= limiteAdjuntos;

    /* Manejar click en area de subida con verificación de límites */
    const manejarClickSubida = () => {
        if (!puedeSubir && onClickUpgrade) {
            onClickUpgrade();
            return;
        }
        if (alcanzadoLimite) {
            return;
        }
        if (!estadoSubida.subiendo) {
            fileInputRef.current?.click();
        }
    };

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
            // sentinel-disable-next-line fallo-sin-feedback — error de descifrado, archivo no se muestra y usuario lo nota
            }).catch(error => {
                console.error('[SeccionAdjuntos] Error al cargar contenido cifrado:', error);
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
                {/* Area de carga con verificación de límites */}
                <div className={`adjuntosAreaCarga ${estadoSubida.subiendo ? 'adjuntosAreaCarga--subiendo' : ''} ${alcanzadoLimite ? 'adjuntosAreaCarga--limite' : ''}`} onClick={manejarClickSubida}>
                    {estadoSubida.subiendo ? (
                        <>
                            <Loader2 size={16} className="adjuntosIconoCarga iconoGirando" />
                            <span className="adjuntosSubtextoCarga">Subiendo archivo...</span>
                        </>
                    ) : alcanzadoLimite ? (
                        <>
                            <AlertTriangle size={16} className="adjuntosIconoCarga adjuntosIconoLimite" />
                            <span className="adjuntosSubtextoCarga">Límite alcanzado ({limiteAdjuntos} adjuntos)</span>
                        </>
                    ) : (
                        <>
                            <Upload size={16} className="adjuntosIconoCarga" />
                            <span className="adjuntosSubtextoCarga">Imágenes, Audios o Documentos{puedeSubir && ` (${adjuntos.length}/${limiteAdjuntos})`}</span>
                        </>
                    )}
                </div>

                <Input
                    tipo="file"
                    ref={fileInputRef}
                    claseAdicional="inputOculto"
                    onChange={e => {
                        handleFileSelect(e);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                    disabled={estadoSubida.subiendo || !puedeSubir || alcanzadoLimite}
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
                <span className="propiedadesCompactas__etiqueta">
                    {etiqueta}
                    {puedeSubir && ` (${adjuntos.length}/${limiteAdjuntos})`}
                </span>
                <div className="propiedadesCompactas__contenido">
                    <Boton type="button" claseAdicional="pillOpcion pillOpcion--vacio" onClick={manejarClickSubida} title={alcanzadoLimite ? 'Límite alcanzado' : 'Agregar adjunto'} disabled={estadoSubida.subiendo || alcanzadoLimite}>
                        {estadoSubida.subiendo ? <Loader2 size={14} className="iconoGirando" /> : <Upload size={14} />}
                        <span>{alcanzadoLimite ? 'Límite' : 'Agregar'}</span>
                    </Boton>
                    {(error || estadoSubida.error) && (
                        <div className="textoPequeno textoError textoError--conMargen">
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
            <Input
                tipo="file"
                ref={fileInputRef}
                claseAdicional="inputOculto"
                onChange={e => {
                    handleFileSelect(e);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                disabled={estadoSubida.subiendo || !puedeSubir || alcanzadoLimite}
            />

            {previewImage && <AdjuntoOverlay previewImage={previewImage} url={previewImage.url} onClose={() => setPreviewImage(null)} />}
        </>
    );

    return estilo === 'moderno' ? renderContenidoModerno() : renderContenidoClasico();
}

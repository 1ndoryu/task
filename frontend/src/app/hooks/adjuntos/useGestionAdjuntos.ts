import {useState, useCallback} from 'react';
import type {Adjunto} from '../../types/dashboard';
import {useAdjuntos} from '../useAdjuntos';
import {formatBytes} from '../../utils/formato';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function useGestionAdjuntos(adjuntos: Adjunto[], onChange: (adjuntos: Adjunto[]) => void, modoLegacy: boolean) {
    const {estado: estadoSubida, subirArchivo, eliminarArchivo: eliminarArchivoFisico, limpiarError} = useAdjuntos();
    const [error, setError] = useState<string | null>(null);

    const determinarTipo = (mimeType: string): 'imagen' | 'audio' | 'archivo' => {
        if (mimeType.startsWith('image/')) return 'imagen';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'archivo';
    };

    const handleFileSelectFisico = useCallback(
        async (file: File) => {
            if (file.size > MAX_FILE_SIZE) {
                setError(`El archivo es demasiado grande (Max: ${formatBytes(MAX_FILE_SIZE)})`);
                return;
            }
            setError(null);
            limpiarError();

            const nuevoAdjunto = await subirArchivo(file);

            if (nuevoAdjunto) {
                onChange([...adjuntos, nuevoAdjunto]);
            } else if (estadoSubida.error) {
                setError(estadoSubida.error);
            }
        },
        [adjuntos, onChange, subirArchivo, estadoSubida.error, limpiarError]
    );

    const handleFileSelectLegacy = useCallback(
        (file: File) => {
            if (file.size > MAX_FILE_SIZE) {
                setError(`El archivo es demasiado grande (Max: ${formatBytes(MAX_FILE_SIZE)})`);
                return;
            }
            setError(null);

            const reader = new FileReader();
            reader.onload = e => {
                const url = e.target?.result as string;
                const tipo = determinarTipo(file.type);

                const nuevoAdjunto: Adjunto = {
                    id: Date.now(),
                    tipo,
                    url,
                    nombre: file.name,
                    tamano: file.size,
                    fechaSubida: new Date().toISOString()
                };

                onChange([...adjuntos, nuevoAdjunto]);
            };
            reader.readAsDataURL(file);
        },
        [adjuntos, onChange]
    );

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (modoLegacy) {
            handleFileSelectLegacy(file);
        } else {
            handleFileSelectFisico(file);
        }
    };

    const esBase64 = (url: string): boolean => {
        return url.startsWith('data:');
    };

    const eliminarAdjunto = useCallback(
        (id: number, onAudioStop?: (id: number) => void) => {
            const adjunto = adjuntos.find(a => a.id === id);
            if (!adjunto) return;

            if (onAudioStop) onAudioStop(id);

            onChange(adjuntos.filter(a => a.id !== id));

            if (!esBase64(adjunto.url)) {
                eliminarArchivoFisico(adjunto).catch(err => {
                    console.error('Error eliminando archivo del servidor:', err);
                });
            }
        },
        [adjuntos, onChange, eliminarArchivoFisico]
    );

    return {
        error,
        estadoSubida,
        handleFileSelect,
        eliminarAdjunto
    };
}

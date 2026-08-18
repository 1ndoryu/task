import {useState, useCallback} from 'react';
import type {Adjunto} from '../../types/dashboard';

export function useAdjuntosCifrados() {
    const [contenidoDescifrado, setContenidoDescifrado] = useState<{[key: number]: string}>({});
    const [cargandoDescifrado, setCargandoDescifrado] = useState<{[key: number]: boolean}>({});
    const [errorDescifrado, setErrorDescifrado] = useState<string | null>(null);

    const esBase64 = (url: string): boolean => {
        return url.startsWith('data:');
    };

    /**
     * Detecta si un adjunto es cifrado basándose en la URL
     * Los archivos cifrados tienen extensión .enc en el nombre
     */
    const esCifrado = useCallback((adjunto: Adjunto): boolean => {
        /* Base64 nunca es cifrado (ya es accesible) */
        if (esBase64(adjunto.url)) return false;

        /* Detectar por parámetro file en la URL que termina en .enc */
        try {
            const urlParams = new URL(adjunto.url, window.location.origin);
            const nombreArchivo = urlParams.searchParams.get('file') || '';
            return nombreArchivo.endsWith('.enc');
        } catch {
            return false;
        }
    }, []);

    const tieneContenidoCargado = useCallback(
        (id: number): boolean => {
            return contenidoDescifrado[id] !== undefined;
        },
        [contenidoDescifrado]
    );

    /**
     * Carga el contenido de un archivo cifrado bajo demanda
     */
    const cargarContenido = useCallback(
        async (adjunto: Adjunto) => {
            if (cargandoDescifrado[adjunto.id]) return;

            setCargandoDescifrado(prev => ({...prev, [adjunto.id]: true}));
            setErrorDescifrado(null);

            try {
                /* Obtener nonce para autenticación */
                const gloryData = window.gloryDashboard;
                const nonce = gloryData?.nonce || '';

                const response = await fetch(adjunto.url, {
                    credentials: 'same-origin',
                    headers: {
                        'X-WP-Nonce': nonce
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Sesión expirada. Recarga la página.');
                    }
                    throw new Error('Error descargando archivo');
                }

                const blob = await response.blob();
                const urlObjeto = URL.createObjectURL(blob);

                setContenidoDescifrado(prev => ({...prev, [adjunto.id]: urlObjeto}));
                return urlObjeto;
            } catch (err) {
                const mensaje = err instanceof Error ? err.message : 'Error al cargar archivo cifrado';
                setErrorDescifrado(mensaje);
                return null;
            } finally {
                setCargandoDescifrado(prev => ({...prev, [adjunto.id]: false}));
            }
        },
        [cargandoDescifrado]
    );

    return {
        contenidoDescifrado,
        cargandoDescifrado,
        errorDescifrado,
        esCifrado,
        tieneContenidoCargado,
        cargarContenido
    };
}

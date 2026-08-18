/*
 * Hook para obtener el conteo de mensajes no leidos de multiples elementos
 * Optimizado para evitar multiples llamadas a la API
 * Separado del hook principal useMensajes para respetar SRP y limites de lineas
 */

import {useState, useCallback, useRef, useEffect} from 'react';
import {obtenerNonce} from './useMensajes';

/* Base URL de la API */
const API_BASE = '/wp-json/glory/v1/mensajes';

interface UseMensajesNoLeidosReturn {
    noLeidos: Record<number, number>;
    cargando: boolean;
    refrescar: () => Promise<void>;
}

export function useMensajesNoLeidos(tipoElemento: 'tarea' | 'proyecto' | 'habito', elementoIds: number[]): UseMensajesNoLeidosReturn {
    const [noLeidos, setNoLeidos] = useState<Record<number, number>>({});
    const [cargando, setCargando] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    /* [18-08-2026] Mensajes no tiene backend Rust aun: se degrada a cero
     * sin llamar a /wp-json (sin badges falsos ni ruido en consola). */
    const refrescar = useCallback(async (): Promise<void> => {
        setNoLeidos({});
        setCargando(false);
    }, []);

    /* Cargar al montar o cuando cambian los IDs */
    useEffect(() => {
        refrescar();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [refrescar]);

    return {noLeidos, cargando, refrescar};
}

/*
 * Hook para obtener el conteo de mensajes no leidos de multiples elementos
 * Optimizado para evitar multiples llamadas a la API
 * Separado del hook principal useMensajes para respetar SRP y limites de lineas
 */

import {useState, useCallback, useRef, useEffect} from 'react';
import {apiFetch} from '../utils/apiClient';

/* [18-08-2026] Contrato Rust: GET /timeline/unread/{itemType}/{itemId} -> { unread } */

interface UseMensajesNoLeidosReturn {
    noLeidos: Record<number, number>;
    cargando: boolean;
    refrescar: () => Promise<void>;
}

const LIMITE_PETICIONES_PARALELAS = 5;

export function useMensajesNoLeidos(tipoElemento: 'tarea' | 'proyecto' | 'habito', elementoIds: number[]): UseMensajesNoLeidosReturn {
    const [noLeidos, setNoLeidos] = useState<Record<number, number>>({});
    const [cargando, setCargando] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    /* [18-08-2026] Los callers construyen el array de ids inline (nueva
     * identidad cada render). Se compara por CLAVE serializada para no
     * relanzar el efecto en bucle (Maximum update depth exceeded). */
    const elementoIdsRef = useRef(elementoIds);
    elementoIdsRef.current = elementoIds;
    const claveIds = elementoIds.join(',');

    const refrescar = useCallback(async (): Promise<void> => {
        const ids = elementoIdsRef.current;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        if (ids.length === 0) {
            setNoLeidos({});
            setCargando(false);
            return;
        }

        setCargando(true);

        const resultado: Record<number, number> = {};
        for (let i = 0; i < ids.length; i += LIMITE_PETICIONES_PARALELAS) {
            const lote = ids.slice(i, i + LIMITE_PETICIONES_PARALELAS);
            await Promise.allSettled(
                lote.map(async id => {
                    const respuesta = await apiFetch<{unread: number}>(
                        `/timeline/unread/${tipoElemento}/${id}`,
                        {signal}
                    );
                    resultado[id] = respuesta.unread;
                })
            );
            if (signal.aborted) return;
        }

        setNoLeidos(resultado);
        setCargando(false);
    }, [tipoElemento, claveIds]);

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

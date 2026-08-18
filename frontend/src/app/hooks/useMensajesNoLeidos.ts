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

    const refrescar = useCallback(async (): Promise<void> => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        if (elementoIds.length === 0) {
            setNoLeidos({});
            setCargando(false);
            return;
        }

        setCargando(true);

        const resultado: Record<number, number> = {};
        for (let i = 0; i < elementoIds.length; i += LIMITE_PETICIONES_PARALELAS) {
            const lote = elementoIds.slice(i, i + LIMITE_PETICIONES_PARALELAS);
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
    }, [tipoElemento, elementoIds]);

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

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

    const refrescar = useCallback(async (): Promise<void> => {
        /* Guard: No ejecutar si no hay usuario autenticado */
        const nonce = obtenerNonce();
        if (!nonce) {
            setNoLeidos({});
            return;
        }

        if (elementoIds.length === 0) {
            setNoLeidos({});
            return;
        }

        /* Cancelar peticion anterior */
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setCargando(true);

        try {
            const response = await fetch(`${API_BASE}/no-leidos-masivo`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': obtenerNonce()
                },
                body: JSON.stringify({
                    tipoElemento,
                    elementoIds
                }),
                signal: abortControllerRef.current.signal
            });

            /* Silenciar errores 401 (usuario no autenticado) */
            if (response.status === 401) {
                setNoLeidos({});
                return;
            }

            if (!response.ok) {
                throw new Error('Error al obtener mensajes no leídos');
            }

            const data = (await response.json()) as {success: boolean; noLeidos: Record<string, number>};

            if (data.success) {
                /* Convertir claves de string a number */
                const resultado: Record<number, number> = {};
                for (const [key, value] of Object.entries(data.noLeidos)) {
                    resultado[parseInt(key, 10)] = value;
                }
                setNoLeidos(resultado);
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            console.error('Error obteniendo mensajes no leídos:', error);
        } finally {
            setCargando(false);
        }
    }, [tipoElemento, JSON.stringify(elementoIds)]);

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

/*
 * useListaFeedbackAdmin
 * Hook que gestiona la carga, paginación y marcado de feedback de usuarios.
 * Separa la lógica de datos del componente de presentación.
 */

import {useState, useEffect, useCallback} from 'react';

interface FeedbackItem {
    id: number;
    usuarioNombre: string;
    usuarioEmail: string;
    tipo: 'sugerencia' | 'bug' | 'otro';
    mensaje: string;
    leido: boolean;
    fechaCreacion: string;
}

interface PaginacionFeedback {
    pagina: number;
    totalPaginas: number;
    total: number;
}

export interface UseListaFeedbackAdminParams {
    visible: boolean;
}

export function useListaFeedbackAdmin({visible}: UseListaFeedbackAdminParams) {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [paginacion, setPaginacion] = useState<PaginacionFeedback>({pagina: 1, totalPaginas: 1, total: 0});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandido, setExpandido] = useState<number | null>(null);

    /* Obtener nonce desde gloryDashboard */
    const obtenerNonce = (): string => {
        const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
        return wpData?.nonce || '';
    };

    /* [18-08-2026] Sin backend de feedback admin en Rust aun: se degrada a
     * lista vacia sin llamar a /wp-json. */
    const cargarFeedback = useCallback(async (_pagina = 1) => {
        setCargando(false);
        setError(null);
        setFeedback([]);
        setPaginacion({pagina: 1, totalPaginas: 1, total: 0});
    }, []);

    /* Marcar feedback como leído */
    const marcarLeido = async (_id: number) => {
        /* no-op: no hay backend */
    };

    /* Cargar al hacer visible */
    useEffect(() => {
        if (visible) {
            cargarFeedback(1);
        }
    }, [visible, cargarFeedback]);

    /* Expandir/colapsar mensaje */
    const toggleExpandido = (id: number) => {
        setExpandido(prev => (prev === id ? null : id));
    };

    return {
        feedback,
        paginacion,
        cargando,
        error,
        expandido,
        cargarFeedback,
        marcarLeido,
        toggleExpandido
    };
}

export type {FeedbackItem, PaginacionFeedback};

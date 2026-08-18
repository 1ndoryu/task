/*
 * useListaFeedbackAdmin
 * Hook que gestiona toda la lógica del panel de feedback admin.
 * Incluye: carga de datos, paginación, marcar como leído, expandir/colapsar.
 */

import {useState, useEffect, useCallback} from 'react';

/* Interfaz con claves camelCase según respuesta del API */
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

interface UseListaFeedbackAdminParams {
    visible: boolean;
}

/* Obtener nonce desde gloryDashboard */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

export function useListaFeedbackAdmin({visible}: UseListaFeedbackAdminParams) {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [paginacion, setPaginacion] = useState<PaginacionFeedback>({pagina: 1, totalPaginas: 1, total: 0});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandido, setExpandido] = useState<number | null>(null);

    /* [18-08-2026] Sin backend de feedback admin en Rust aun: degradado a
     * lista vacia sin llamar a /wp-json. */
    const cargarFeedback = useCallback(async (_pagina = 1) => {
        setCargando(false);
        setError(null);
        setFeedback([]);
        setPaginacion({pagina: 1, totalPaginas: 1, total: 0});
    }, []);

    /* Marcar como leído */
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

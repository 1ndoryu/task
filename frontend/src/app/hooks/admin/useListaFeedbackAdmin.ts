/*
 * useListaFeedbackAdmin
 * Hook que gestiona toda la lógica del panel de feedback admin.
 * Incluye: carga de datos, paginación, marcar como leído, expandir/colapsar.
 */

import {useState, useEffect, useCallback} from 'react';
import {apiFetch} from '../../utils/apiClient';

/* Interfaz con claves camelCase según respuesta del API Rust */
interface FeedbackItem {
    id: string;
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

/* [18-08-2026] Contrato Rust /api/admin/feedback:
 * GET /admin/feedback?page=&per_page= -> { items, page, perPage, hasMore, total }
 * POST /admin/feedback/{id}/read -> 204 */

interface PaginatedFeedbackRust {
    items: FeedbackItem[];
    page: number;
    perPage: number;
    hasMore: boolean;
    total: number;
}

export function useListaFeedbackAdmin({visible}: UseListaFeedbackAdminParams) {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [paginacion, setPaginacion] = useState<PaginacionFeedback>({pagina: 1, totalPaginas: 1, total: 0});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandido, setExpandido] = useState<string | null>(null);

    const cargarFeedback = useCallback(async (pagina = 1) => {
        setCargando(true);
        setError(null);
        try {
            const datos = await apiFetch<PaginatedFeedbackRust>(`/admin/feedback?page=${pagina}&per_page=20`);
            setFeedback(datos.items);
            setPaginacion({
                pagina: datos.page,
                totalPaginas: Math.max(1, Math.ceil(datos.total / Math.max(1, datos.perPage))),
                total: datos.total
            });
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }, []);

    /* Marcar como leído */
    const marcarLeido = async (id: string) => {
        try {
            await apiFetch<void>(`/admin/feedback/${id}/read`, {method: 'POST'});
            setFeedback(prev => prev.map(item => (item.id === id ? {...item, leido: true} : item)));
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setError(mensaje);
        }
    };

    /* Cargar al hacer visible */
    useEffect(() => {
        if (visible) {
            cargarFeedback(1);
        }
    }, [visible, cargarFeedback]);

    /* Expandir/colapsar mensaje */
    const toggleExpandido = (id: string) => {
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

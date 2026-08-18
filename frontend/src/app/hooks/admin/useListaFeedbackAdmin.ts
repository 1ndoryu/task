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

    /* Cargar feedback */
    const cargarFeedback = useCallback(async (pagina = 1) => {
        setCargando(true);
        setError(null);

        try {
            const response = await fetch(`/wp-json/glory/v1/admin/feedback?pagina=${pagina}&porPagina=15`, {
                credentials: 'include',
                headers: {'X-WP-Nonce': obtenerNonce()}
            });

            if (!response.ok) {
                throw new Error('Error al cargar feedback');
            }

            const data = await response.json();
            /* El API devuelve 'feedbacks' en camelCase */
            setFeedback(data.feedbacks || []);
            setPaginacion({
                pagina: data.pagina || 1,
                totalPaginas: data.totalPaginas || 1,
                total: data.total || 0
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setCargando(false);
        }
    }, []);

    /* Marcar como leído */
    const marcarLeido = async (id: number) => {
        try {
            await fetch(`/wp-json/glory/v1/admin/feedback/${id}/leido`, {
                method: 'PUT',
                credentials: 'include',
                headers: {'X-WP-Nonce': obtenerNonce()}
            });

            setFeedback(prev => prev.map(item => (item.id === id ? {...item, leido: true} : item)));
        } catch (err) {
            console.error('Error marcando leído:', err);
        }
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

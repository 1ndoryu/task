/* [18-08-2026] useNotificaciones contra /api/notifications (backend Rust).
 * Sesion por cookie HttpOnly + X-CSRF-Token en mutaciones. El contrato Rust
 * devuelve JSON plano ({items, page, perPage, hasMore, total}) con UUIDs y
 * campos camelCase; este hook mapea al tipo Notificacion del front original.
 * Mantiene el polling de 30s y la cache local del diseno original. */

import {useState, useEffect, useCallback, useRef} from 'react';
import {apiFetch} from '../utils/apiClient';
import type {Notificacion, RespuestaNotificaciones, PaginacionNotificaciones} from '../types/dashboard';

interface EstadoNotificaciones {
    notificaciones: Notificacion[];
    noLeidas: number;
    total: number;
    paginacion: PaginacionNotificaciones;
    cargando: boolean;
    cargandoPrimeraVez: boolean;
    error: string | null;
}

interface AccionesNotificaciones {
    cargarNotificaciones: (pagina?: number, soloNoLeidas?: boolean) => Promise<void>;
    marcarLeida: (id: number) => Promise<boolean>;
    marcarTodasLeidas: () => Promise<boolean>;
    eliminar: (id: number) => Promise<boolean>;
    refrescar: () => Promise<void>;
}

interface HookNotificaciones extends EstadoNotificaciones, AccionesNotificaciones {}

const INTERVALO_POLLING = 30000;

interface NotificacionRust {
    id: string;
    notificationType: string;
    title: string;
    content: string | null;
    read: boolean;
    createdAt: string;
    readAt: string | null;
    metadata: unknown;
}

interface ListadoRust {
    items: NotificacionRust[];
    page: number;
    perPage: number;
    hasMore: boolean;
    total: number;
}

function mapearNotificacion(n: NotificacionRust): Notificacion {
    return {
        id: n.id as unknown as number,
        tipo: n.notificationType as Notificacion['tipo'],
        titulo: n.title,
        contenido: n.content,
        leida: n.read,
        fechaCreacion: n.createdAt,
        fechaLectura: n.readAt,
        datosExtra: (n.metadata ?? null) as Notificacion['datosExtra'],
    };
}

export function useNotificaciones(habilitado: boolean = true): HookNotificaciones {
    const [estado, setEstado] = useState<EstadoNotificaciones>({
        notificaciones: [],
        noLeidas: 0,
        total: 0,
        paginacion: {pagina: 1, porPagina: 20, totalPaginas: 0},
        cargando: false,
        cargandoPrimeraVez: true,
        error: null
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const montadoRef = useRef(true);
    const hayCargaInicialRef = useRef(false);

    /* Cargar notificaciones con paginación opcional */
    const cargarNotificaciones = useCallback(
        async (pagina: number = 1, soloNoLeidas: boolean = false): Promise<void> => {
            if (!habilitado) return;

            const esPrimeraCarga = !hayCargaInicialRef.current;
            setEstado(prev => ({
                ...prev,
                cargando: true,
                cargandoPrimeraVez: esPrimeraCarga,
                error: null
            }));

            try {
                const params = new URLSearchParams({
                    page: pagina.toString(),
                    perPage: '20',
                    unreadOnly: soloNoLeidas.toString()
                });

                const datos = await apiFetch<ListadoRust>(`/notifications?${params}`);

                if (!montadoRef.current) return;

                hayCargaInicialRef.current = true;
                const totalPaginas = datos.perPage > 0 ? Math.ceil(datos.total / datos.perPage) : 0;
                setEstado(prev => ({
                    ...prev,
                    notificaciones: datos.items.map(mapearNotificacion),
                    total: datos.total,
                    paginacion: {
                        pagina: datos.page,
                        porPagina: datos.perPage,
                        totalPaginas
                    },
                    cargando: false,
                    cargandoPrimeraVez: false
                }));
            } catch (err) {
                if (!montadoRef.current) return;
                setEstado(prev => ({
                    ...prev,
                    cargando: false,
                    cargandoPrimeraVez: false,
                    error: err instanceof Error ? err.message : 'Error desconocido'
                }));
            }
        },
        [habilitado]
    );

    /* Cargar solo el contador de no leídas (para polling ligero) */
    const cargarContador = useCallback(async (): Promise<void> => {
        if (!habilitado) return;

        try {
            const datos = await apiFetch<{unread: number}>(`/notifications/unread-count`);

            if (!montadoRef.current) return;

            setEstado(prev => ({
                ...prev,
                noLeidas: datos?.unread ?? 0
            }));
        } catch {
            /* Silenciar errores de polling */
        }
    }, [habilitado]);

    /* Marcar una notificación como leída */
    const marcarLeida = useCallback(async (id: number): Promise<boolean> => {
        try {
            await apiFetch(`/notifications/${id}/read`, {method: 'PUT'});
            setEstado(prev => ({
                ...prev,
                notificaciones: prev.notificaciones.map(n => (String(n.id) === String(id) ? {...n, leida: true, fechaLectura: n.fechaLectura || new Date().toISOString()} : n)),
                noLeidas: Math.max(0, prev.noLeidas - 1)
            }));
            return true;
        } catch {
            /* Silenciar errores como en el original */
            return false;
        }
    }, []);

    /* Marcar todas las notificaciones como leídas */
    const marcarTodasLeidas = useCallback(async (): Promise<boolean> => {
        try {
            await apiFetch(`/notifications/read-all`, {method: 'PUT'});
            setEstado(prev => ({
                ...prev,
                notificaciones: prev.notificaciones.map(n => ({
                    ...n,
                    leida: true,
                    fechaLectura: n.fechaLectura || new Date().toISOString()
                })),
                noLeidas: 0
            }));
            return true;
        } catch {
            return false;
        }
    }, []);

    /* Eliminar una notificación */
    const eliminar = useCallback(async (id: number): Promise<boolean> => {
        try {
            await apiFetch(`/notifications/${id}`, {method: 'DELETE'});
            setEstado(prev => {
                const notificacionEliminada = prev.notificaciones.find(n => String(n.id) === String(id));
                const eraNoLeida = notificacionEliminada && !notificacionEliminada.leida;

                return {
                    ...prev,
                    notificaciones: prev.notificaciones.filter(n => String(n.id) !== String(id)),
                    total: Math.max(0, prev.total - 1),
                    noLeidas: eraNoLeida ? Math.max(0, prev.noLeidas - 1) : prev.noLeidas
                };
            });
            return true;
        } catch {
            return false;
        }
    }, []);

    /* Refrescar todo */
    const refrescar = useCallback(async (): Promise<void> => {
        await Promise.all([cargarNotificaciones(1), cargarContador()]);
    }, [cargarNotificaciones, cargarContador]);

    /* Efecto: Carga inicial y polling */
    useEffect(() => {
        montadoRef.current = true;

        if (habilitado) {
            cargarContador();
            cargarNotificaciones(1);

            intervalRef.current = setInterval(() => {
                cargarContador();
            }, INTERVALO_POLLING);
        }

        return () => {
            montadoRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [habilitado, cargarContador, cargarNotificaciones]);

    return {
        ...estado,
        cargarNotificaciones,
        marcarLeida,
        marcarTodasLeidas,
        eliminar,
        refrescar
    };
}

/**
 * Hook para el sistema de mensajes (Timeline Chat + Historial)
 *
 * Maneja la comunicación con la API de mensajes:
 * - Obtener timeline de un elemento
 * - Enviar mensajes
 * - Estados de carga
 *
 * @package App/React/hooks
 */

import {useState, useCallback, useRef, useEffect} from 'react';
import {apiFetch} from '../utils/apiClient';
import {suscribirEvento} from '../utils/eventBus';

/* Tipos para el sistema de mensajes */
export type TipoMensaje = 'enviado' | 'recibido' | 'sistema';

export type AccionSistema = 'creado' | 'editado' | 'completado' | 'reabierto' | 'asignado' | 'desasignado' | 'adjunto_agregado' | 'adjunto_eliminado' | 'prioridad' | 'urgencia' | 'fecha_limite' | 'participante_agregado' | 'participante_removido' | 'compartido' | 'descripcion' | 'nombre' | 'repeticion';

export interface MensajeTimeline {
    id: string;
    tipoElemento: 'tarea' | 'proyecto' | 'habito';
    elementoId: number;
    usuarioId: string;
    usuarioNombre: string;
    avatar: string;
    tipoMensaje: 'usuario' | 'sistema';
    contenido: string;
    accionSistema: AccionSistema | null;
    datosExtra: Record<string, unknown> | null;
    fechaCreacion: string;
    esPropio: boolean;
}

interface EstadoMensajes {
    cargando: boolean;
    enviando: boolean;
    error: string | null;
    mensajes: MensajeTimeline[];
    total: number;
    hayMas: boolean;
}

interface UseMensajesReturn {
    estado: EstadoMensajes;
    cargarMensajes: () => Promise<void>;
    enviarMensaje: (contenido: string) => Promise<boolean>;
    cargarMas: () => Promise<void>;
    limpiarError: () => void;
}

/* [18-08-2026] Contrato Rust /api/timeline (camelCase):
 * GET /timeline/{itemType}/{itemId} -> { items, total, limit, offset, hasMore }
 * POST /timeline { itemType, itemId, content } -> TimelineItem (201) */

interface TimelineItemRust {
    id: string;
    itemType: 'tarea' | 'proyecto' | 'habito';
    itemId: number;
    userId: string;
    userName: string;
    avatarUrl: string | null;
    messageType: 'usuario' | 'sistema';
    content: string;
    systemAction: AccionSistema | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    isOwn: boolean;
}

interface TimelineResponseRust {
    items: TimelineItemRust[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

function mapearMensaje(mensaje: TimelineItemRust): MensajeTimeline {
    return {
        id: mensaje.id,
        tipoElemento: mensaje.itemType,
        elementoId: mensaje.itemId,
        usuarioId: mensaje.userId,
        usuarioNombre: mensaje.userName,
        avatar: mensaje.avatarUrl || '',
        tipoMensaje: mensaje.messageType,
        contenido: mensaje.content,
        accionSistema: mensaje.systemAction,
        datosExtra: mensaje.metadata,
        fechaCreacion: mensaje.createdAt,
        esPropio: mensaje.isOwn,
    };
}

/*
 * IDs de tareas de bienvenida (datos iniciales para nuevos usuarios)
 * Estos mensajes de sistema de "admin" deben ocultarse porque son
 * artefactos de sincronización inicial, no acciones reales del usuario.
 */
const IDS_TAREAS_BIENVENIDA = [1, 2, 3];

/**
 * Filtra mensajes de sistema generados por "admin" para tareas de bienvenida.
 * Esto evita mostrar actividad confusa como "admin ha cambiado la prioridad"
 * en las tareas iniciales que el usuario no creó.
 */
function filtrarMensajesAdmin(mensajes: MensajeTimeline[], tipoElemento: string, elementoId: number): MensajeTimeline[] {
    /* Solo filtrar para tareas de bienvenida */
    if (tipoElemento !== 'tarea' || !IDS_TAREAS_BIENVENIDA.includes(elementoId)) {
        return mensajes;
    }

    /* Filtrar mensajes de sistema que contengan "admin" (case insensitive) */
    return mensajes.filter(msg => {
        if (msg.tipoMensaje !== 'sistema') return true;
        const contenidoLower = msg.contenido.toLowerCase();
        return !contenidoLower.includes('admin');
    });
}

/**
 * Hook principal para el sistema de mensajes
 */
export function useMensajes(tipoElemento: 'tarea' | 'proyecto' | 'habito', elementoId: number): UseMensajesReturn {
    const [estado, setEstado] = useState<EstadoMensajes>({
        cargando: false,
        enviando: false,
        error: null,
        mensajes: [],
        total: 0,
        hayMas: false
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const offsetRef = useRef(0);
    const limiteRef = useRef(50);

    /**
     * Carga los mensajes del timeline
     */
    const cargarMensajes = useCallback(async (): Promise<void> => {
        /* Cancelar petición anterior */
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setEstado(prev => ({...prev, cargando: true, error: null}));
        offsetRef.current = 0;

        try {
            const response = await apiFetch<TimelineResponseRust>(
                `/timeline/${tipoElemento}/${elementoId}?limit=${limiteRef.current}&offset=0`,
                {signal: abortControllerRef.current.signal}
            );

            const mensajes = response.items.map(mapearMensaje);

            /* Filtrar mensajes de admin para tareas de bienvenida */
            const mensajesFiltrados = filtrarMensajesAdmin(mensajes, tipoElemento, elementoId);

            setEstado(prev => ({
                ...prev,
                cargando: false,
                mensajes: mensajesFiltrados,
                total: response.total,
                hayMas: response.hasMore
            }));

            offsetRef.current = mensajes.length;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            const mensaje = error instanceof Error ? error.message : 'Error desconocido';
            setEstado(prev => ({...prev, cargando: false, error: mensaje}));
        }
    }, [tipoElemento, elementoId]);

    /**
     * Carga más mensajes (paginación)
     */
    const cargarMas = useCallback(async (): Promise<void> => {
        if (estado.cargando || !estado.hayMas) return;

        setEstado(prev => ({...prev, cargando: true}));

        try {
            const response = await apiFetch<TimelineResponseRust>(
                `/timeline/${tipoElemento}/${elementoId}?limit=${limiteRef.current}&offset=${offsetRef.current}`
            );

            const mensajes = response.items.map(mapearMensaje);

            /* Filtrar mensajes de admin para tareas de bienvenida */
            const mensajesFiltrados = filtrarMensajesAdmin(mensajes, tipoElemento, elementoId);

            setEstado(prev => ({
                ...prev,
                cargando: false,
                mensajes: [...prev.mensajes, ...mensajesFiltrados],
                hayMas: response.hasMore
            }));

            offsetRef.current += mensajes.length;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error desconocido';
            setEstado(prev => ({...prev, cargando: false, error: mensaje}));
        }
    }, [tipoElemento, elementoId, estado.cargando, estado.hayMas]);

    /**
     * Envía un mensaje de usuario
     */
    const enviarMensaje = useCallback(
        async (contenido: string): Promise<boolean> => {
            if (!contenido.trim()) return false;

            setEstado(prev => ({...prev, enviando: true, error: null}));

            try {
                const mensaje = await apiFetch<TimelineItemRust>('/timeline', {
                    method: 'POST',
                    body: {
                        itemType: tipoElemento,
                        itemId: elementoId,
                        content: contenido.trim()
                    }
                });

                /* Agregar mensaje al estado (respuesta del servidor) */
                setEstado(prev => ({
                    ...prev,
                    enviando: false,
                    mensajes: [...prev.mensajes, mapearMensaje(mensaje)],
                    total: prev.total + 1
                }));

                return true;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';
                setEstado(prev => ({...prev, enviando: false, error: mensaje}));
                return false;
            }
        },
        [tipoElemento, elementoId]
    );

    /**
     * Limpia el error actual
     */
    const limpiarError = useCallback(() => {
        setEstado(prev => ({...prev, error: null}));
    }, []);

    /* Cargar mensajes al montar o cambiar elemento */
    useEffect(() => {
        if (elementoId > 0) {
            cargarMensajes();
        }

        /* [18-08-2026] Tiempo real: recargar cuando llega un evento de timeline
         * para este elemento (enviado desde otro dispositivo). */
        const desuscribir = suscribirEvento(evento => {
            if (evento.itemType === tipoElemento && evento.itemId === elementoId) {
                cargarMensajes();
            }
        });

        return () => {
            desuscribir();
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [cargarMensajes, elementoId, tipoElemento]);

    return {
        estado,
        cargarMensajes,
        enviarMensaje,
        cargarMas,
        limpiarError
    };
}

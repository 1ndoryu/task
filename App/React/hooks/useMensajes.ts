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

/* Tipos para el sistema de mensajes */
export type TipoMensaje = 'enviado' | 'recibido' | 'sistema';

export type AccionSistema = 'creado' | 'editado' | 'completado' | 'reabierto' | 'asignado' | 'desasignado' | 'adjunto_agregado' | 'adjunto_eliminado' | 'prioridad' | 'urgencia' | 'fecha_limite' | 'participante_agregado' | 'participante_removido' | 'compartido' | 'descripcion' | 'nombre' | 'repeticion';

export interface MensajeTimeline {
    id: number;
    tipoElemento: 'tarea' | 'proyecto' | 'habito';
    elementoId: number;
    usuarioId: number;
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

/* Base URL de la API */
const API_BASE = '/wp-json/glory/v1/mensajes';

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
 * Obtiene el nonce de WordPress para autenticación
 */
export function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
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
     * Realiza una petición a la API de mensajes
     */
    const fetchApi = useCallback(async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
        const url = `${API_BASE}${endpoint}`;

        const defaultOptions: RequestInit = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': obtenerNonce()
            }
        };

        const response = await fetch(url, {...defaultOptions, ...options});

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('No autenticado. Inicia sesión para continuar.');
            }
            if (response.status === 403) {
                throw new Error('Sin permisos para acceder a este elemento.');
            }
            throw new Error(`Error del servidor: ${response.status}`);
        }

        return response.json();
    }, []);

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
            const response = await fetchApi<{
                success: boolean;
                mensajes: MensajeTimeline[];
                total: number;
            }>(`/${tipoElemento}/${elementoId}?limite=${limiteRef.current}&offset=0`);

            if (!response.success) {
                throw new Error('Error al cargar mensajes');
            }

            /* Filtrar mensajes de admin para tareas de bienvenida */
            const mensajesFiltrados = filtrarMensajesAdmin(response.mensajes, tipoElemento, elementoId);

            setEstado(prev => ({
                ...prev,
                cargando: false,
                mensajes: mensajesFiltrados,
                total: mensajesFiltrados.length,
                hayMas: mensajesFiltrados.length < response.total
            }));

            offsetRef.current = response.mensajes.length;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            const mensaje = error instanceof Error ? error.message : 'Error desconocido';
            setEstado(prev => ({...prev, cargando: false, error: mensaje}));
        }
    }, [fetchApi, tipoElemento, elementoId]);

    /**
     * Carga más mensajes (paginación)
     */
    const cargarMas = useCallback(async (): Promise<void> => {
        if (estado.cargando || !estado.hayMas) return;

        setEstado(prev => ({...prev, cargando: true}));

        try {
            const response = await fetchApi<{
                success: boolean;
                mensajes: MensajeTimeline[];
                total: number;
            }>(`/${tipoElemento}/${elementoId}?limite=${limiteRef.current}&offset=${offsetRef.current}`);

            if (!response.success) {
                throw new Error('Error al cargar más mensajes');
            }

            /* Filtrar mensajes de admin para tareas de bienvenida */
            const mensajesFiltrados = filtrarMensajesAdmin(response.mensajes, tipoElemento, elementoId);

            setEstado(prev => ({
                ...prev,
                cargando: false,
                mensajes: [...prev.mensajes, ...mensajesFiltrados],
                hayMas: prev.mensajes.length + mensajesFiltrados.length < response.total
            }));

            offsetRef.current += response.mensajes.length;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error desconocido';
            setEstado(prev => ({...prev, cargando: false, error: mensaje}));
        }
    }, [fetchApi, tipoElemento, elementoId, estado.cargando, estado.hayMas]);

    /**
     * Envía un mensaje de usuario
     */
    const enviarMensaje = useCallback(
        async (contenido: string): Promise<boolean> => {
            if (!contenido.trim()) return false;

            setEstado(prev => ({...prev, enviando: true, error: null}));

            try {
                const response = await fetchApi<{
                    success: boolean;
                    mensaje: MensajeTimeline;
                }>('', {
                    method: 'POST',
                    body: JSON.stringify({
                        tipoElemento,
                        elementoId,
                        contenido
                    })
                });

                if (!response.success) {
                    throw new Error('Error al enviar mensaje');
                }

                /* Agregar mensaje al estado (optimistic update) */
                setEstado(prev => ({
                    ...prev,
                    enviando: false,
                    mensajes: [...prev.mensajes, response.mensaje],
                    total: prev.total + 1
                }));

                return true;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';
                setEstado(prev => ({...prev, enviando: false, error: mensaje}));
                return false;
            }
        },
        [fetchApi, tipoElemento, elementoId]
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

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [tipoElemento, elementoId, cargarMensajes]);

    return {
        estado,
        cargarMensajes,
        enviarMensaje,
        cargarMas,
        limpiarError
    };
}

/* Re-exportar funciones y hooks movidos para compatibilidad retroactiva */
export {registrarEventoSistema, obtenerTipoVisual, obtenerIconoAccion} from '../utils/mensajes';
export {useMensajesNoLeidos} from './useMensajesNoLeidos';

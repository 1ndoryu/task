/**
 * Hook para el historial de hábitos
 *
 * Gestiona el historial retroactivo de cumplimiento de hábitos.
 * Permite:
 * - Ver los últimos 7 días de cada hábito
 * - Marcar días pasados como completados/pospuestos
 * - Obtener estadísticas de cumplimiento
 *
 * @package App/React/hooks
 */

import {useState, useCallback, useRef} from 'react';
import {invalidarCache} from '../services/actividadStore';
import {notificarCambioHabito, obtenerHistorialDelCache, guardarHistorialEnCache, actualizarFechaEnCache} from '../services/historialHabitosStore';

/* Re-exportar tipos desde archivo compartido para mantener compatibilidad */
export type {EstadoHabito, DiaHistorial, HistorialHabito, EstadisticasHabito, HistorialMultiple} from '../types/historialHabitos';
import type {EstadoHabito, DiaHistorial, HistorialHabito, EstadisticasHabito, HistorialMultiple} from '../types/historialHabitos';

interface EstadoHistorial {
    cargando: boolean;
    guardando: boolean;
    error: string | null;
    resumen7Dias: DiaHistorial[];
    historial: HistorialHabito;
    estadisticas: EstadisticasHabito | null;
    historialMultiple: HistorialMultiple;
}

interface UseHabitosHistorialReturn {
    estado: EstadoHistorial;
    cargarHistorial: (habitoId: number, dias?: number) => Promise<void>;
    marcarDia: (habitoId: number, fecha: string, estado: EstadoHabito, notas?: string) => Promise<boolean>;
    desmarcarDia: (habitoId: number, fecha: string) => Promise<boolean>;
    cargarHistorialMultiple: (habitoIds: number[]) => Promise<void>;
    limpiarError: () => void;
}

/* Base URL de la API */
const API_HABITOS = '/wp-json/glory/v1/habitos';

/**
 * Obtiene el nonce de WordPress para autenticacion
 */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

/**
 * Hook principal para el historial de habitos
 *
 * @param habitoIdInicial - ID del habito para cargar del cache inmediatamente
 * @param diasIniciales - Dias de historial a cargar (default 30)
 */
export function useHabitosHistorial(habitoIdInicial?: number, diasIniciales: number = 30): UseHabitosHistorialReturn {
    /* Intentar cargar del cache inmediatamente para evitar flash de "Cargando..." */
    const cacheInicial = habitoIdInicial ? obtenerHistorialDelCache(habitoIdInicial, diasIniciales) : null;

    const [estado, setEstado] = useState<EstadoHistorial>(() => {
        /* Si hay cache válido, inicializar con esos datos */
        if (cacheInicial) {
            return {
                cargando: false,
                guardando: false,
                error: null,
                resumen7Dias: cacheInicial.resumen7Dias,
                historial: cacheInicial.historial,
                estadisticas: cacheInicial.estadisticas,
                historialMultiple: {}
            };
        }
        /* Si no hay cache, inicializar vacío */
        return {
            cargando: false,
            guardando: false,
            error: null,
            resumen7Dias: [],
            historial: {},
            estadisticas: null,
            historialMultiple: {}
        };
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Realiza una peticion a la API
     */
    const fetchApi = useCallback(async <T>(url: string, options: RequestInit = {}): Promise<T> => {
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
                throw new Error('No autenticado. Inicia sesion para continuar.');
            }
            if (response.status === 403) {
                throw new Error('Sin permisos para acceder al historial.');
            }
            throw new Error(`Error del servidor: ${response.status}`);
        }

        return response.json();
    }, []);

    /**
     * Carga el historial completo de un habito
     * Usa cache para carga instantanea al abrir el modal
     */
    const cargarHistorial = useCallback(
        async (habitoId: number, dias: number = 30): Promise<void> => {
            /* Verificar cache primero para carga instantanea */
            const cacheEntry = obtenerHistorialDelCache(habitoId, dias);
            if (cacheEntry) {
                setEstado(prev => ({
                    ...prev,
                    cargando: false,
                    historial: cacheEntry.historial,
                    resumen7Dias: cacheEntry.resumen7Dias,
                    estadisticas: cacheEntry.estadisticas
                }));
                return;
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            setEstado(prev => ({...prev, cargando: true, error: null}));

            try {
                const response = await fetchApi<{
                    success: boolean;
                    historial: HistorialHabito;
                    resumen7Dias: DiaHistorial[];
                    estadisticas: EstadisticasHabito;
                }>(`${API_HABITOS}/${habitoId}/historial?dias=${dias}`);

                if (!response.success) {
                    throw new Error('Error al cargar historial');
                }

                /* Guardar en cache para futuras cargas */
                guardarHistorialEnCache(habitoId, response.historial, response.resumen7Dias, response.estadisticas, dias);

                setEstado(prev => ({
                    ...prev,
                    cargando: false,
                    historial: response.historial,
                    resumen7Dias: response.resumen7Dias,
                    estadisticas: response.estadisticas
                }));
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';
                setEstado(prev => ({...prev, cargando: false, error: mensaje}));
            }
        },
        [fetchApi]
    );

    /**
     * Marca un dia como completado, pospuesto u omitido
     * Usa actualización optimista para respuesta inmediata en la UI
     *
     * IMPORTANTE: No incluir estado.historial en dependencias para evitar
     * recreaciones del callback durante actualizaciones optimistas.
     * Usamos refs para capturar el estado anterior cuando sea necesario.
     */
    const marcarDia = useCallback(
        async (habitoId: number, fecha: string, estadoDia: EstadoHabito, notas?: string): Promise<boolean> => {
            /* Capturamos el estado anterior dentro del setEstado para garantizar consistencia */
            let estadoAnterior: HistorialHabito = {};
            let historialMultipleAnterior: HistorialMultiple = {};

            /* Actualización optimista: actualizar la UI inmediatamente */
            setEstado(prev => {
                /* Capturar estado anterior para posible rollback */
                estadoAnterior = {...prev.historial};
                historialMultipleAnterior = {...prev.historialMultiple};

                const nuevoHistorial = {...prev.historial};
                nuevoHistorial[fecha] = {
                    estado: estadoDia,
                    notas: notas || null,
                    fechaRegistro: new Date().toISOString()
                };

                const nuevoHistorialMultiple = {...prev.historialMultiple};
                if (!nuevoHistorialMultiple[habitoId]) {
                    nuevoHistorialMultiple[habitoId] = {};
                }
                nuevoHistorialMultiple[habitoId][fecha] = estadoDia;

                return {
                    ...prev,
                    guardando: true,
                    error: null,
                    historial: nuevoHistorial,
                    historialMultiple: nuevoHistorialMultiple
                };
            });

            try {
                const response = await fetchApi<{
                    success: boolean;
                    resumen7Dias: DiaHistorial[];
                }>(`${API_HABITOS}/${habitoId}/historial`, {
                    method: 'POST',
                    body: JSON.stringify({
                        fecha,
                        estado: estadoDia,
                        notas
                    })
                });

                if (!response.success) {
                    throw new Error('Error al marcar dia');
                }

                /* Confirmar guardado exitoso */
                setEstado(prev => ({
                    ...prev,
                    guardando: false,
                    resumen7Dias: response.resumen7Dias
                }));

                /* Actualizar cache del historial */
                actualizarFechaEnCache(habitoId, fecha, estadoDia);

                /* Invalidar cache de actividad para sincronizar el panel */
                invalidarCache();

                /* Notificar a otros componentes del cambio */
                notificarCambioHabito(habitoId, fecha);

                return true;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';

                /* Rollback: restaurar estado anterior en caso de error */
                setEstado(prev => ({
                    ...prev,
                    guardando: false,
                    error: mensaje,
                    historial: estadoAnterior,
                    historialMultiple: historialMultipleAnterior
                }));

                return false;
            }
        },
        [fetchApi]
    );

    /**
     * Desmarca un dia (elimina el registro)
     * Usa actualización optimista para respuesta inmediata en la UI
     *
     * IMPORTANTE: No incluir estado.historial en dependencias para evitar
     * recreaciones del callback durante actualizaciones optimistas.
     */
    const desmarcarDia = useCallback(
        async (habitoId: number, fecha: string): Promise<boolean> => {
            /* Capturamos el estado anterior dentro del setEstado para garantizar consistencia */
            let estadoAnterior: HistorialHabito = {};
            let historialMultipleAnterior: HistorialMultiple = {};

            /* Actualización optimista: eliminar de la UI inmediatamente */
            setEstado(prev => {
                /* Capturar estado anterior para posible rollback */
                estadoAnterior = {...prev.historial};
                historialMultipleAnterior = {...prev.historialMultiple};

                const nuevoHistorial = {...prev.historial};
                delete nuevoHistorial[fecha];

                const nuevoHistorialMultiple = {...prev.historialMultiple};
                if (nuevoHistorialMultiple[habitoId]) {
                    delete nuevoHistorialMultiple[habitoId][fecha];
                }

                return {
                    ...prev,
                    guardando: true,
                    error: null,
                    historial: nuevoHistorial,
                    historialMultiple: nuevoHistorialMultiple
                };
            });

            try {
                const response = await fetchApi<{
                    success: boolean;
                    resumen7Dias: DiaHistorial[];
                }>(`${API_HABITOS}/${habitoId}/historial/${fecha}`, {
                    method: 'DELETE'
                });

                if (!response.success) {
                    throw new Error('Error al desmarcar dia');
                }

                /* Confirmar guardado exitoso */
                setEstado(prev => ({
                    ...prev,
                    guardando: false,
                    resumen7Dias: response.resumen7Dias
                }));

                /* Actualizar cache del historial (eliminar la fecha) */
                actualizarFechaEnCache(habitoId, fecha, null);

                /* Invalidar cache de actividad para sincronizar el panel */
                invalidarCache();

                /* Notificar a otros componentes del cambio */
                notificarCambioHabito(habitoId, fecha);

                return true;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';

                /* Rollback: restaurar estado anterior en caso de error */
                setEstado(prev => ({
                    ...prev,
                    guardando: false,
                    error: mensaje,
                    historial: estadoAnterior,
                    historialMultiple: historialMultipleAnterior
                }));

                return false;
            }
        },
        [fetchApi]
    );

    /**
     * Carga el historial de multiples habitos (optimizado)
     */
    const cargarHistorialMultiple = useCallback(
        async (habitoIds: number[]): Promise<void> => {
            if (habitoIds.length === 0) return;

            setEstado(prev => ({...prev, cargando: true, error: null}));

            try {
                const response = await fetchApi<{
                    success: boolean;
                    historial: HistorialMultiple;
                }>(`${API_HABITOS}/historial-resumen`, {
                    method: 'POST',
                    body: JSON.stringify({habitoIds})
                });

                if (!response.success) {
                    throw new Error('Error al cargar historial multiple');
                }

                setEstado(prev => ({
                    ...prev,
                    cargando: false,
                    historialMultiple: response.historial
                }));
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';
                setEstado(prev => ({...prev, cargando: false, error: mensaje}));
            }
        },
        [fetchApi]
    );

    /**
     * Limpia el error actual
     */
    const limpiarError = useCallback(() => {
        setEstado(prev => ({...prev, error: null}));
    }, []);

    return {
        estado,
        cargarHistorial,
        marcarDia,
        desmarcarDia,
        cargarHistorialMultiple,
        limpiarError
    };
}

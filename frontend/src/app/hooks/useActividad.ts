/**
 * Hook para el mapa de calor de actividad
 *
 * Gestiona la consulta de actividad del usuario para visualización
 * en formato heatmap estilo GitHub. Soporta filtros por:
 * - Período: semana, mes, trimestre, año
 * - Tipo: tarea_completada, habito_cumplido, nota_creada
 * - Proyecto específico
 * - Hábito específico
 *
 * Incluye sistema de cache con invalidación automática para
 * actualizaciones en tiempo real cuando se completan tareas/hábitos.
 *
 * @package App/React/hooks
 */

import {useState, useCallback, useRef, useEffect} from 'react';
import {obtenerDelCache, guardarEnCache, suscribirACambios} from '../services/actividadStore';
import {obtenerFechaHoy} from '../utils/fecha';

/* Tipos para el mapa de calor */
export interface DatosHeatmap {
    [fecha: string]: {
        nivel: number;
        total: number;
        tipos: {
            [tipo: string]: number;
        };
    };
}

export interface EstadisticasActividad {
    totales: {
        [tipo: string]: number;
    };
    diasActivos: number;
    racha: number;
}

export interface PeriodoActividad {
    inicio: string;
    fin: string;
    tipo: 'semana' | 'mes' | 'trimestre' | 'anio';
}

export interface FiltrosActividad {
    periodo?: 'auto' | 'semana' | 'mes' | 'trimestre' | 'anio';
    fechaInicio?: string;
    fechaFin?: string;
    tipo?: 'tarea_completada' | 'habito_cumplido' | 'nota_creada' | 'adjunto_subido' | 'tarea_desmarcada' | 'habito_desmarcado' | 'habito_pospuesto';
    proyectoId?: number;
    habitoId?: number;
}

interface EstadoActividad {
    cargando: boolean;
    cargaInicial: boolean;
    error: string | null;
    heatmap: DatosHeatmap;
    estadisticas: EstadisticasActividad | null;
    periodo: PeriodoActividad | null;
}

interface UseActividadReturn {
    estado: EstadoActividad;
    cargarHeatmap: (filtros?: FiltrosActividad) => Promise<void>;
    cargarEstadisticas: (fechaInicio?: string, fechaFin?: string) => Promise<void>;
    registrarActividad: (tipo: string, elementoId?: number, elementoTipo?: string, proyectoId?: number, fecha?: string) => Promise<boolean>;
    limpiarError: () => void;
    forzarRecarga: () => void;
}

/* Base URL de la API */
const API_BASE = '/wp-json/glory/v1/actividad';

/**
 * Obtiene el nonce de WordPress para autenticación
 */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

/**
 * Hook principal para el mapa de calor de actividad
 * Incluye cache automático y suscripción a cambios para tiempo real
 *
 * @param filtrosIniciales - Filtros opcionales para cargar del cache inmediatamente
 */
export function useActividad(filtrosIniciales?: FiltrosActividad): UseActividadReturn {
    /* Intentar cargar del cache inmediatamente para evitar flash de "Cargando..." */
    const cacheInicial = filtrosIniciales ? obtenerDelCache(filtrosIniciales) : null;

    const [estado, setEstado] = useState<EstadoActividad>(() => {
        /* Si hay cache válido, inicializar con esos datos */
        if (cacheInicial) {
            return {
                cargando: false,
                cargaInicial: false,
                error: null,
                heatmap: cacheInicial.datos,
                estadisticas: cacheInicial.estadisticas,
                periodo: cacheInicial.periodo
            };
        }
        /* Si no hay cache, inicializar vacío */
        return {
            cargando: false,
            cargaInicial: true,
            error: null,
            heatmap: {},
            estadisticas: null,
            periodo: null
        };
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const filtrosActualesRef = useRef<FiltrosActividad>(filtrosIniciales || {});
    const cargandoRef = useRef(false);

    /**
     * Realiza una petición a la API de actividad
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
                throw new Error('No autenticado. Inicia sesion para continuar.');
            }
            if (response.status === 403) {
                throw new Error('Sin permisos para acceder a la actividad.');
            }
            throw new Error(`Error del servidor: ${response.status}`);
        }

        return response.json();
    }, []);

    /**
     * Carga el heatmap de actividad con filtros opcionales
     * Usa cache si los datos estan disponibles y no han expirado
     */
    const cargarHeatmap = useCallback(
        async (filtros: FiltrosActividad = {}, forzarRecarga: boolean = false): Promise<void> => {
            /* Evitar cargas duplicadas */
            if (cargandoRef.current) return;

            /* Guardar filtros actuales para poder recargar */
            filtrosActualesRef.current = filtros;

            /* Verificar cache primero (si no se fuerza recarga) */
            if (!forzarRecarga) {
                const cacheEntry = obtenerDelCache(filtros);
                if (cacheEntry) {
                    setEstado(prev => ({
                        ...prev,
                        cargando: false,
                        cargaInicial: false,
                        heatmap: cacheEntry.datos,
                        periodo: cacheEntry.periodo,
                        estadisticas: cacheEntry.estadisticas
                    }));
                    return;
                }
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            cargandoRef.current = true;
            setEstado(prev => ({...prev, cargando: true, error: null}));

            try {
                const params = new URLSearchParams();

                /* Enviar fecha local del usuario para evitar problemas de zona horaria */
                const fechaHoyLocal = obtenerFechaHoy();
                params.append('fechaHoyLocal', fechaHoyLocal);

                if (filtros.periodo) {
                    /* Si es 'auto', pedimos datos de un año para tener suficiente info */
                    const periodoApi = filtros.periodo === 'auto' ? 'anio' : filtros.periodo;
                    params.append('periodo', periodoApi);
                }
                if (filtros.fechaInicio) {
                    params.append('fechaInicio', filtros.fechaInicio);
                }
                if (filtros.fechaFin) {
                    params.append('fechaFin', filtros.fechaFin);
                }
                if (filtros.tipo) {
                    params.append('tipo', filtros.tipo);
                }
                if (filtros.proyectoId) {
                    params.append('proyectoId', String(filtros.proyectoId));
                }
                if (filtros.habitoId) {
                    params.append('habitoId', String(filtros.habitoId));
                }

                const queryString = params.toString();
                const endpoint = queryString ? `?${queryString}` : '';

                const response = await fetchApi<{
                    success: boolean;
                    heatmap: DatosHeatmap;
                    periodo: PeriodoActividad;
                }>(endpoint);

                if (!response.success) {
                    throw new Error('Error al cargar actividad');
                }

                /* Guardar en cache */
                guardarEnCache(filtros, response.heatmap, response.periodo);

                setEstado(prev => ({
                    ...prev,
                    cargando: false,
                    cargaInicial: false,
                    heatmap: response.heatmap,
                    periodo: response.periodo
                }));
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';
                setEstado(prev => ({...prev, cargando: false, error: mensaje}));
            } finally {
                cargandoRef.current = false;
            }
        },
        [fetchApi]
    );

    /**
     * Carga las estadísticas de actividad
     */
    const cargarEstadisticas = useCallback(
        async (fechaInicio?: string, fechaFin?: string): Promise<void> => {
            try {
                const params = new URLSearchParams();
                if (fechaInicio) params.append('fechaInicio', fechaInicio);
                if (fechaFin) params.append('fechaFin', fechaFin);

                const queryString = params.toString();
                const endpoint = `/estadisticas${queryString ? `?${queryString}` : ''}`;

                const response = await fetchApi<{
                    success: boolean;
                    estadisticas: EstadisticasActividad;
                }>(endpoint);

                if (!response.success) {
                    throw new Error('Error al cargar estadisticas');
                }

                setEstado(prev => ({
                    ...prev,
                    estadisticas: response.estadisticas
                }));
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';
                setEstado(prev => ({...prev, error: mensaje}));
            }
        },
        [fetchApi]
    );

    /**
     * Registra una actividad manualmente
     */
    const registrarActividad = useCallback(
        async (tipo: string, elementoId?: number, elementoTipo?: string, proyectoId?: number, fecha?: string): Promise<boolean> => {
            try {
                const response = await fetchApi<{
                    success: boolean;
                }>('', {
                    method: 'POST',
                    body: JSON.stringify({
                        tipo,
                        elementoId,
                        elementoTipo,
                        proyectoId,
                        fecha
                    })
                });

                return response.success;
            } catch (error) {
                console.error('Error registrando actividad:', error);
                return false;
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

    /**
     * Fuerza una recarga de los datos actuales
     */
    const forzarRecarga = useCallback(() => {
        cargarHeatmap(filtrosActualesRef.current, true);
    }, [cargarHeatmap]);

    /**
     * Suscribirse a cambios en el store de actividad
     * Cuando se registra nueva actividad, recargar datos automaticamente
     */
    useEffect(() => {
        const desuscribir = suscribirACambios(() => {
            /* Solo recargar si ya tenemos datos cargados */
            if (Object.keys(filtrosActualesRef.current).length > 0 || estado.periodo) {
                cargarHeatmap(filtrosActualesRef.current, true);
            }
        });

        return () => {
            desuscribir();
        };
    }, [cargarHeatmap, estado.periodo]);

    return {
        estado,
        cargarHeatmap,
        cargarEstadisticas,
        registrarActividad,
        limpiarError,
        forzarRecarga
    };
}

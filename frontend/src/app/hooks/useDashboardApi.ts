/**
 * Hook para sincronización con la API del Dashboard (backend Rust /api).
 *
 * [188A-1] Se abandona el contrato WordPress (/wp-json/glory/v1/dashboard +
 * nonce): la lectura viene de GET /api/dashboard y el guardado se hace por
 * entidad (PUT /api/tasks/{id} y PUT /api/projects/{id}). La sesion viaja en
 * cookie HttpOnly y las mutaciones usan X-CSRF-Token (cookie csrf_token).
 * Habitos, scratchpad de notas y configuracion aun no tienen endpoint Rust:
 * se omiten del guardado (quedan locales) hasta que existan.
 *
 * @package App/React/hooks
 */

import {useState, useCallback, useRef, useEffect} from 'react';
import type {Habito, Tarea, Proyecto} from '../types/dashboard';
import type {AyunoState} from '../types/ayuno';
import type {DeficitCaloricoState} from '../types/deficitCalorico';
import {ErrorSilencioso, esErrorSilencioso} from '../utils/errores';

/*
 * Tipos para la API
 */
interface DashboardData {
    version: string;
    habitos: Habito[];
    tareas: Tarea[];
    proyectos: Proyecto[];
    notas: string;
    configuracion: ConfiguracionUsuario;
    ayuno?: AyunoState;
    deficitCalorico?: DeficitCaloricoState;
    ultimaActualizacion: string | null;
}

interface ConfiguracionUsuario {
    notificaciones: {
        email: boolean;
        frecuenciaResumen: 'diario' | 'semanal' | 'nunca';
        horaPreferida: string;
        tareasPorVencer: boolean;
        rachaEnPeligro: boolean;
    };
    cifradoE2E: boolean;
    tema: 'terminal' | 'claro' | 'oscuro';
    ordenHabitos: string;
}

interface SyncStatus {
    lastSync: number | null;
    lastUpdate: string | null;
    version: string;
    serverTimestamp: number;
}

interface EstadoApi {
    cargando: boolean;
    guardando: boolean;
    sincronizando: boolean;
    error: string | null;
    ultimaSync: number | null;
    online: boolean;
}

interface UseDashboardApiReturn {
    estado: EstadoApi;
    cargar: () => Promise<DashboardData | null>;
    guardar: (datos: Partial<DashboardData>) => Promise<boolean>;
    obtenerEstadoSync: () => Promise<SyncStatus | null>;
    sincronizar: (datosLocales: DashboardData) => Promise<DashboardData | null>;
    limpiarError: () => void;
}

/* Respuesta del backend Rust: { data, meta } (no envuelto en { success }) */
interface DashboardReadResponse {
    data: DashboardData;
    meta: {
        loadedAt: string;
        serverTimestamp: number;
        sharedItemsIncluded: boolean;
        truncated: boolean;
    };
}

function obtenerTimezoneCliente(): string | null {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
        return null;
    }
}

/* Lee el token CSRF de la cookie no HttpOnly (contrato Rust ADR-02). */
function obtenerTokenCsrf(): string {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/* Mapea una tarea del front al contrato UpsertTaskRequest de Rust.
 * El payload conserva el objeto completo para que el round-trip no pierda
 * campos (subtareas, dependencias, tags, etc.). */
function tareaARequest(tarea: Tarea): Record<string, unknown> {
    return {
        texto: tarea.texto,
        completado: Boolean(tarea.completado),
        prioridad: tarea.prioridad ?? null,
        urgencia: tarea.urgencia ?? 'normal',
        proyectoId: tarea.proyectoId ?? null,
        parentId: tarea.parentId ?? null,
        orden: tarea.orden ?? 0,
        payload: tarea,
        expectedUpdatedAt: null,
    };
}

function proyectoARequest(proyecto: Proyecto): Record<string, unknown> {
    return {
        nombre: proyecto.nombre,
        estado: proyecto.estado ?? 'activo',
        prioridad: proyecto.prioridad ?? null,
        urgencia: proyecto.urgencia ?? 'normal',
        fechaLimite: proyecto.fechaLimite ?? null,
        orden: Number((proyecto as {orden?: number}).orden ?? 0),
        payload: proyecto,
        expectedUpdatedAt: null,
    };
}

/**
 * Hook principal para la API del Dashboard
 */
export function useDashboardApi(): UseDashboardApiReturn {
    const [estado, setEstado] = useState<EstadoApi>({
        cargando: false,
        guardando: false,
        sincronizando: false,
        error: null,
        ultimaSync: null,
        online: navigator.onLine
    });

    /* [188A-1] Cada peticion tiene su propio AbortController: el guardado es por
     * entidad (varias PUT en paralelo) y abortar la peticion anterior al iniciar
     * una nueva cancelaria el batch entero. Solo se aborta en unmount/timeout. */
    const abortControllersRef = useRef<Set<AbortController>>(new Set());
    const avisoDominiosSinBackend = useRef(false);

    /* Cleanup: Abortar peticiones pendientes al desmontar */
    useEffect(() => {
        return () => {
            for (const controller of abortControllersRef.current) {
                controller.abort();
            }
            abortControllersRef.current.clear();
        };
    }, []);

    /**
     * Realiza una petición a la API Rust
     */
    const fetchApi = useCallback(async <T>(url: string, options: RequestInit = {}): Promise<T> => {
        /* Guard: No ejecutar si el usuario no esta autenticado */
        const autenticado = Boolean((window as unknown as {gloryDashboard?: {isLoggedIn?: boolean}}).gloryDashboard?.isLoggedIn);
        if (!autenticado) {
            throw new ErrorSilencioso('No autenticado');
        }

        const controller = new AbortController();
        abortControllersRef.current.add(controller);
        const timezoneCliente = obtenerTimezoneCliente();
        const esMutacion = ['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase());

        const defaultOptions: RequestInit = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(esMutacion ? {'X-CSRF-Token': obtenerTokenCsrf()} : {}),
                ...(timezoneCliente ? {'X-Glory-Timezone': timezoneCliente} : {})
            },
            signal: controller.signal
        };

        try {
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const liberar = () => abortControllersRef.current.delete(controller);

            const response = await fetch(url, {...defaultOptions, ...options});
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new ErrorSilencioso('No autenticado. Inicia sesión para continuar.');
                }
                if (response.status === 403) {
                    throw new ErrorSilencioso('Sin permisos para realizar esta acción.');
                }

                try {
                    const errorJson = await response.json();
                    throw new Error(errorJson.message || `Error del servidor: ${response.status}`);
                } catch (parseError) {
                    if (parseError instanceof Error && parseError.message.startsWith('Error del servidor')) {
                        throw parseError;
                    }
                    throw new Error(`Error del servidor: ${response.status}`);
                }
            }

            if (response.status === 204) {
                liberar();
                return undefined as T;
            }
            const resultado = await response.json() as T;
            liberar();
            return resultado;
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Petición cancelada');
            }
            if (esErrorSilencioso(error) || (error instanceof Error && error.message.includes('No autenticado'))) {
                throw error;
            }
            console.error('[DashboardApi] Fetch Error:', error);
            throw error;
        }
    }, []);

    /**
     * Carga todos los datos del dashboard desde el servidor
     */
    const cargar = useCallback(async (): Promise<DashboardData | null> => {
        setEstado(prev => ({...prev, cargando: true, error: null}));

        try {
            const response = await fetchApi<DashboardReadResponse>('/api/dashboard', {method: 'GET'});

            setEstado(prev => ({
                ...prev,
                cargando: false,
                ultimaSync: response.meta?.serverTimestamp || Date.now()
            }));

            return response.data;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error desconocido';
            setEstado(prev => ({...prev, cargando: false, error: mensaje}));
            return null;
        }
    }, [fetchApi]);

    /**
     * Guarda datos en el servidor.
     * Tareas y proyectos se persisten por entidad (PUT /api/tasks|projects/{id});
     * habitos, scratchpad de notas y configuracion no tienen endpoint Rust aun
     * y se omiten (quedan locales) — aviso unico en consola.
     */
    const guardar = useCallback(
        async (datos: Partial<DashboardData>): Promise<boolean> => {
            setEstado(prev => ({...prev, guardando: true, error: null}));

            try {
                const operaciones: Promise<unknown>[] = [];

                for (const tarea of datos.tareas ?? []) {
                    if (typeof tarea.id !== 'number') continue;
                    operaciones.push(
                        fetchApi(`/api/tasks/${tarea.id}`, {
                            method: 'PUT',
                            body: JSON.stringify(tareaARequest(tarea))
                        })
                    );
                }

                for (const proyecto of datos.proyectos ?? []) {
                    if (typeof proyecto.id !== 'number') continue;
                    operaciones.push(
                        fetchApi(`/api/projects/${proyecto.id}`, {
                            method: 'PUT',
                            body: JSON.stringify(proyectoARequest(proyecto))
                        })
                    );
                }

                if (!avisoDominiosSinBackend.current) {
                    const sinBackend = [
                        datos.habitos?.length ? 'habitos' : null,
                        datos.notas ? 'scratchpad-notas' : null,
                        datos.configuracion ? 'configuracion' : null,
                    ].filter(Boolean);
                    if (sinBackend.length > 0) {
                        console.warn(`[DashboardApi] Dominios sin endpoint Rust (quedan locales): ${sinBackend.join(', ')}`);
                        avisoDominiosSinBackend.current = true;
                    }
                }

                const resultados = await Promise.allSettled(operaciones);
                const fallaron = resultados.filter(r => r.status === 'rejected');

                setEstado(prev => ({
                    ...prev,
                    guardando: false,
                    ultimaSync: Date.now(),
                    error: fallaron.length > 0 ? 'No se pudieron guardar todos los datos' : null
                }));

                return fallaron.length === 0;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';
                setEstado(prev => ({...prev, guardando: false, error: mensaje}));
                return false;
            }
        },
        [fetchApi]
    );

    /**
     * Obtiene el estado de sincronización del servidor.
     * Rust no expone este endpoint; se retorna null (el manager usa timestamps locales).
     */
    const obtenerEstadoSync = useCallback(async (): Promise<SyncStatus | null> => {
        return null;
    }, []);

    /**
     * Sincroniza datos locales con el servidor
     * Estrategia: Last-Write-Wins con merge inteligente
     */
    const sincronizar = useCallback(
        async (datosLocales: DashboardData): Promise<DashboardData | null> => {
            setEstado(prev => ({...prev, sincronizando: true, error: null}));

            try {
                const estadoServidor = await obtenerEstadoSync();

                if (!estadoServidor) {
                    /* Primera vez - subir todo */
                    const guardado = await guardar(datosLocales);
                    if (guardado) {
                        setEstado(prev => ({...prev, sincronizando: false}));
                        return datosLocales;
                    }
                    throw new Error('Error al sincronizar por primera vez');
                }

                const timestampLocal = estado.ultimaSync || 0;
                const timestampServidor = estadoServidor.lastSync || 0;

                if (timestampLocal >= timestampServidor) {
                    const guardado = await guardar(datosLocales);
                    if (guardado) {
                        setEstado(prev => ({...prev, sincronizando: false}));
                        return datosLocales;
                    }
                    throw new Error('Error al subir datos locales');
                }

                const datosServidor = await cargar();

                if (!datosServidor) {
                    throw new Error('Error al descargar datos del servidor');
                }

                setEstado(prev => ({...prev, sincronizando: false}));
                return datosServidor;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error de sincronización';
                setEstado(prev => ({...prev, sincronizando: false, error: mensaje}));
                return null;
            }
        },
        [cargar, guardar, obtenerEstadoSync, estado.ultimaSync]
    );

    /**
     * Limpia el error actual
     */
    const limpiarError = useCallback(() => {
        setEstado(prev => ({...prev, error: null}));
    }, []);

    return {
        estado,
        cargar,
        guardar,
        obtenerEstadoSync,
        sincronizar,
        limpiarError
    };
}

/**
 * Obtiene el nonce de WordPress para autenticación
 * [188A-1] Retorna '' — Rust no usa nonces; la sesion viaja en cookie HttpOnly.
 * Se conserva para que los hooks legacy que lo leen no rompan.
 */
export function obtenerNonce(): string {
    return '';
}

/**
 * Hook para detectar estado online/offline
 */
export function useOnlineStatus(): boolean {
    const [online, setOnline] = useState(navigator.onLine);

    useState(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    });

    return online;
}

export type {DashboardData, ConfiguracionUsuario, SyncStatus, EstadoApi};

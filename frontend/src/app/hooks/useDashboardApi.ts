/**
 * Hook para sincronización con la API del Dashboard (backend Rust /api).
 *
 * [188A-1] Se abandona el contrato WordPress (/wp-json/glory/v1/dashboard +
 * nonce): la lectura viene de GET /api/dashboard y el guardado se hace por
 * entidad (PUT /api/tasks/{id}, PUT /api/projects/{id} y PUT /api/habits/{id})
 * mas PUT /api/dashboard/settings para scratchpad (notas) y configuracion.
 * La sesion viaja en cookie HttpOnly y las mutaciones usan X-CSRF-Token.
 *
 * @package App/React/hooks
 */

import {useState, useCallback, useRef, useEffect} from 'react';
import type {Habito, Tarea, Proyecto} from '../types/dashboard';
import type {AyunoState} from '../types/ayuno';
import {logError} from '../utils/logger';
import type {DeficitCaloricoState} from '../types/deficitCalorico';
import {ErrorSilencioso, esErrorSilencioso} from '../utils/errores';
import {recolectarPreferencias} from '../utils/preferenciasUsuario';
import {obtenerTokenCsrf} from '../utils/apiClient';
import {
    obtenerBorradosPendientes,
    confirmarBorradosConfirmados,
} from '../utils/borradosPendientes';
import {tareaARequest, proyectoARequest, habitoARequest} from '../utils/mappersContrato';

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

interface EstadoApi {
    cargando: boolean;
    guardando: boolean;
    sincronizando: boolean;
    error: string | null;
    ultimaSync: number | null;
    online: boolean;
}

/* [T7] Documento de guardado: lo que el sync sube al servidor por entidad.
 * Extiende Partial<DashboardData> con el flag opcional `generateBackup`
 * (snapshot automático para premium, [18-08-2026]). El campo no contamina
 * el tipo de lectura `DashboardData`: solo existe en el documento de escritura. */
interface DatosGuardado extends Partial<DashboardData> {
    generateBackup?: boolean;
}

interface UseDashboardApiReturn {
    estado: EstadoApi;
    cargar: () => Promise<DashboardData | null>;
    guardar: (datos: DatosGuardado) => Promise<boolean>;
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
                    /* [18-08-2026] Sesion perdida en mitad del uso (p. ej. cookie
                     * pisada por otra app del mismo host en dev, o sesion revocada
                     * en servidor). Si creiamos estar autenticados, avisamos al
                     * boot para recargar y caer en la landing limpia en vez de
                     * dejar el dashboard congelado en 'Cargando datos...'. El gate
                     * (isLoggedIn) evita bucles de recarga en la landing. */
                    const glory = (window as unknown as {gloryDashboard?: {isLoggedIn?: boolean}}).gloryDashboard;
                    if (glory?.isLoggedIn) {
                        window.dispatchEvent(new Event('glory:sesion-perdida'));
                    }
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
            logError('useDashboardApi', 'Fetch Error:', error);
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
     * [H-F12-12] Comentario actualizado: tareas/proyectos/hábitos se persisten
     * por entidad (PUT /api/tasks|projects|habits/{id}) y notas + configuracion
     * via PUT /api/dashboard/settings — todos con endpoint Rust activo.
     */
    const guardar = useCallback(
        async (datos: DatosGuardado): Promise<boolean> => {
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

                for (const habito of datos.habitos ?? []) {
                    if (typeof habito.id !== 'number') continue;
                    operaciones.push(
                        fetchApi(`/api/habits/${habito.id}`, {
                            method: 'PUT',
                            body: JSON.stringify(habitoARequest(habito))
                        })
                    );
                }

                /* Scratchpad de notas + configuracion de usuario (PUT /api/dashboard/settings).
                 * [18-08-2026] El blob `preferencias` (layout, plugins, tema, ordenes...) se
                 * sube en cada guardado: el servidor es la fuente de verdad para que nada
                 * se pierda al cambiar de navegador o limpiar cache. */
                if (datos.notas !== undefined || datos.configuracion !== undefined) {
                    operaciones.push(
                        fetchApi('/api/dashboard/settings', {
                            method: 'PUT',
                            body: JSON.stringify({
                                notas: datos.notas ?? '',
                                configuracion: datos.configuracion ?? {},
                                preferencias: recolectarPreferencias()
                            })
                        })
                    );
                }

                /* [18-08-2026] Flush de borrados pendientes (tombstones). El sync por
                 * entidad solo hace upsert de lo presente, así que sin DELETE explícito
                 * el servidor conserva las filas eliminadas y estas reaparecen en el
                 * siguiente refresh. Se omiten los IDs que siguen presentes en los datos
                 * (deshacer dentro del debounce): el upsert ya los revivirá. */
                const pendientes = obtenerBorradosPendientes();
                const idsPresentes = (tipo: 'tareas' | 'proyectos' | 'habitos') => {
                    const lista = tipo === 'tareas' ? (datos.tareas ?? []) : tipo === 'proyectos' ? (datos.proyectos ?? []) : (datos.habitos ?? []);
                    return new Set(lista.map(entidad => entidad.id));
                };
                const confirmados: Array<{tipo: 'tareas' | 'proyectos' | 'habitos'; id: number}> = [];
                (['tareas', 'proyectos', 'habitos'] as const).forEach(tipo => {
                    const presentes = idsPresentes(tipo);
                    pendientes[tipo].forEach(id => {
                        if (presentes.has(id)) return; // deshacer: el upsert lo revive
                        operaciones.push(
                            fetchApi(`/api/${tipo === 'tareas' ? 'tasks' : tipo === 'proyectos' ? 'projects' : 'habits'}/${id}`, {
                                method: 'DELETE'
                            }).then(() => {
                                confirmados.push({tipo, id});
                            })
                        );
                    });
                });

                const resultados = await Promise.allSettled(operaciones);
                const fallaron = resultados.filter(r => r.status === 'rejected');

                /* [18-08-2026] Los borrados confirmados salen del registro aunque otro
                 * upsert del lote haya fallado: son idempotentes y el próximo guardado
                 * los reenviaría sin efecto. El error visible sigue siendo el del batch. */
                confirmarBorradosConfirmados(confirmados);

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
     * Sincroniza datos locales con el servidor.
     * [H-F12-06] Se eliminó `obtenerEstadoSync` (el backend Rust no expone el
     * endpoint y siempre devolvía null): la rama LWW del merge era código
     * muerto — el flujo es subir todo (LWW simple con timestamps locales).
     */
    const sincronizar = useCallback(
        async (datosLocales: DashboardData): Promise<DashboardData | null> => {
            setEstado(prev => ({...prev, sincronizando: true, error: null}));

            try {
                const guardado = await guardar(datosLocales);
                if (guardado) {
                    setEstado(prev => ({...prev, sincronizando: false}));
                    return datosLocales;
                }
                throw new Error('Error al sincronizar los datos locales');
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error de sincronización';
                setEstado(prev => ({...prev, sincronizando: false, error: mensaje}));
                return null;
            }
        },
        [guardar]
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
        sincronizar,
        limpiarError
    };
}

/* [T7] `useOnlineStatus` y `obtenerNonce` viven en `./useOnlineStatus` (módulo
 * propio de conexión/sesión). Se re-exportan aquí para preservar el camino de
 * import de los consumidores legacy. */
export {useOnlineStatus, obtenerNonce} from './useOnlineStatus';

export type {DashboardData, ConfiguracionUsuario, EstadoApi, DatosGuardado};

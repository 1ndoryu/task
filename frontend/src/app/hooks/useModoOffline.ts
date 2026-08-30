/*
 * Hook useModoOffline
 *
 * Gestiona el almacenamiento local y la sincronización offline-first.
 * Los datos se guardan localmente primero y se sincronizan con el servidor
 * cuando hay conexión disponible.
 *
 * TAREA 11: Modo Offline para App
 *
 * Características:
 * - Almacenamiento persistente con IndexedDB
 * - Cola de cambios pendientes
 * - Sincronización automática al recuperar conexión
 * - Indicador visual de estado offline
 * - Resolución básica de conflictos (último gana)
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {abrirBaseDatos, ejecutarTransaccion, incrementarIntentosDeCola, hayOperacionesAgotadas, contarOperacionesPendientes, vaciarCola, STORES} from '../utils/offlineDB';
import type {OperacionCola, TipoOperacion, TipoEntidad} from '../utils/offlineDB';
import type {Habito, Tarea, Proyecto} from '../types/dashboard';

interface DatosOffline {
    habitos: Habito[];
    tareas: Tarea[];
    proyectos: Proyecto[];
    notas: string;
    ultimaActualizacion: number;
}

interface EstadoOffline {
    /* True si está sin conexión */
    offline: boolean;
    /* Número de operaciones pendientes en cola */
    operacionesPendientes: number;
    /* True si está sincronizando */
    sincronizando: boolean;
    /* Error de sincronización si lo hay */
    error: string | null;
    /* Última sincronización exitosa */
    ultimaSync: Date | null;
}

interface AccionesOffline {
    /* Guardar datos localmente */
    guardarLocal: (datos: Partial<DatosOffline>) => Promise<void>;
    /* Obtener datos locales */
    obtenerLocal: () => Promise<DatosOffline | null>;
    /* Encolar operación para sincronizar después */
    encolarOperacion: (operacion: Omit<OperacionCola, 'id' | 'timestamp' | 'intentos'>) => Promise<void>;
    /* Forzar sincronización */
    forzarSync: () => Promise<void>;
    /* Limpiar datos locales */
    limpiarDatosLocales: () => Promise<void>;
}

export function useModoOffline(
    sincronizarConServidor?: (datos: DatosOffline) => Promise<boolean>
): EstadoOffline & AccionesOffline {
    const [estado, setEstado] = useState<EstadoOffline>({
        offline: !navigator.onLine,
        operacionesPendientes: 0,
        sincronizando: false,
        error: null,
        ultimaSync: null
    });

    const sincronizandoRef = useRef(false);
    const montadoRef = useRef(true);

    /* Detectar cambios en conexión */
    useEffect(() => {
        const manejarOnline = async () => {
            if (!montadoRef.current) return;
            setEstado(prev => ({...prev, offline: false}));
            /* [H-F12-10] Si la cola agotó reintentos, no auto-reintentar en bucle;
             * el usuario usa forzarSync (manual). */
            if (await hayOperacionesAgotadas()) {
                setEstado(prev => ({...prev, error: 'Demasiados reintentos; usa sincronizar manualmente'}));
                return;
            }
            /* Intentar sincronizar cuando volvemos online */
            procesarCola();
        };

        const manejarOffline = () => {
            if (!montadoRef.current) return;
            setEstado(prev => ({...prev, offline: true}));
        };

        window.addEventListener('online', manejarOnline);
        window.addEventListener('offline', manejarOffline);

        return () => {
            window.removeEventListener('online', manejarOnline);
            window.removeEventListener('offline', manejarOffline);
        };
    }, []);

    /* Guardar datos localmente */
    const guardarLocal = useCallback(async (datos: Partial<DatosOffline>): Promise<void> => {
        try {
            const datosExistentes = await obtenerLocal();
            const datosActualizados: DatosOffline = {
                habitos: datos.habitos ?? datosExistentes?.habitos ?? [],
                tareas: datos.tareas ?? datosExistentes?.tareas ?? [],
                proyectos: datos.proyectos ?? datosExistentes?.proyectos ?? [],
                notas: datos.notas ?? datosExistentes?.notas ?? '',
                ultimaActualizacion: Date.now()
            };

            await ejecutarTransaccion(STORES.datos, 'readwrite', (store) =>
                store.put({id: 'dashboard', ...datosActualizados})
            );
        } catch (error) {
            console.error('[Offline] Error al guardar localmente:', error);
        }
    }, []);

    /* Obtener datos locales */
    const obtenerLocal = useCallback(async (): Promise<DatosOffline | null> => {
        try {
            const resultado = await ejecutarTransaccion<{id: string} & DatosOffline | undefined>(
                STORES.datos,
                'readonly',
                (store) => store.get('dashboard')
            );

            if (!resultado) return null;

            const {id, ...datos} = resultado;
            return datos as DatosOffline;
        } catch (error) {
            console.error('[Offline] Error al obtener datos locales:', error);
            return null;
        }
    }, []);

    /* Encolar operación */
    const encolarOperacion = useCallback(
        async (operacion: Omit<OperacionCola, 'id' | 'timestamp' | 'intentos'>): Promise<void> => {
            try {
                await ejecutarTransaccion(STORES.cola, 'readwrite', (store) =>
                    store.add({
                        ...operacion,
                        timestamp: Date.now(),
                        intentos: 0
                    })
                );

                /* Actualizar contador */
                const count = await contarOperacionesPendientes();
                if (montadoRef.current) {
                    setEstado(prev => ({...prev, operacionesPendientes: count}));
                }

                /* [H-F12-10] Si estamos online y la cola no agotó reintentos,
                 * intentar sincronizar */
                if (navigator.onLine && !(await hayOperacionesAgotadas())) {
                    procesarCola();
                }
            } catch (error) {
                console.error('[Offline] Error al encolar operación:', error);
            }
        },
        []
    );

    /* Procesar cola de operaciones */
    const procesarCola = useCallback(async (): Promise<void> => {
        if (sincronizandoRef.current || !navigator.onLine || !sincronizarConServidor) return;

        sincronizandoRef.current = true;
        if (montadoRef.current) {
            setEstado(prev => ({...prev, sincronizando: true, error: null}));
        }

        try {
            /* Obtener datos locales y sincronizar */
            const datosLocales = await obtenerLocal();
            if (!datosLocales) {
                throw new Error('No hay datos locales para sincronizar');
            }

            const exito = await sincronizarConServidor(datosLocales);

            if (exito) {
                /* Limpiar cola de operaciones (helper puro en el módulo). */
                await vaciarCola();

                if (montadoRef.current) {
                    setEstado(prev => ({
                        ...prev,
                        operacionesPendientes: 0,
                        ultimaSync: new Date(),
                        error: null
                    }));
                }
            } else {
                throw new Error('Sincronización rechazada por el servidor');
            }
        } catch (error) {
            /* [H-F12-10] Contar el intento fallido: acota los reintentos
             * automáticos (la cola se reintenta entera). */
            await incrementarIntentosDeCola();
            const mensaje = error instanceof Error ? error.message : 'Error de sincronización';
            if (montadoRef.current) {
                setEstado(prev => ({...prev, error: mensaje}));
            }
        } finally {
            sincronizandoRef.current = false;
            if (montadoRef.current) {
                setEstado(prev => ({...prev, sincronizando: false}));
            }
        }
    }, [sincronizarConServidor, obtenerLocal]);

    /* Forzar sincronización */
    const forzarSync = useCallback(async (): Promise<void> => {
        if (!navigator.onLine) {
            setEstado(prev => ({...prev, error: 'Sin conexión a internet'}));
            return;
        }
        await procesarCola();
    }, [procesarCola]);

    /* Limpiar datos locales */
    const limpiarDatosLocales = useCallback(async (): Promise<void> => {
        try {
            const db = await abrirBaseDatos();
            const transaction = db.transaction([STORES.datos, STORES.cola, STORES.meta], 'readwrite');

            transaction.objectStore(STORES.datos).clear();
            transaction.objectStore(STORES.cola).clear();
            transaction.objectStore(STORES.meta).clear();

            await new Promise<void>((resolve, reject) => {
                /* [H-F12-08] Conexión compartida: no se cierra por transacción. */
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });

            if (montadoRef.current) {
                setEstado(prev => ({
                    ...prev,
                    operacionesPendientes: 0,
                    ultimaSync: null
                }));
            }
        } catch (error) {
            console.error('[Offline] Error al limpiar datos:', error);
        }
    }, []);

    /* Contar operaciones al montar */
    useEffect(() => {
        montadoRef.current = true;

        contarOperacionesPendientes().then((count) => {
            if (montadoRef.current) {
                setEstado(prev => ({...prev, operacionesPendientes: count}));
            }
        });

        return () => {
            montadoRef.current = false;
        };
    }, []);

    return {
        ...estado,
        guardarLocal,
        obtenerLocal,
        encolarOperacion,
        forzarSync,
        limpiarDatosLocales
    };
}

/* Re-exportar los tipos de la capa de datos para compatibilidad con los
 * consumidores del hook (la fuente canónica es utils/offlineDB). */
export type {DatosOffline, OperacionCola, EstadoOffline, TipoOperacion, TipoEntidad};

import {useEffect, useCallback, useRef, useState} from 'react';
import {devLog, devWarn} from '../../utils/devLog';
import type React from 'react';
import {useChangeDetector} from './useChangeDetector';
import {useSyncTransport} from './useSyncTransport';
import {useLocalStorage, CLAVES_LOCALSTORAGE} from '../useLocalStorage';
import {useSuscripcion} from '../useSuscripcion';
import type {DashboardData} from '../useDashboardApi';
import {hayBorradosPendientes, obtenerBorradosPendientes, type TipoEntidadBorrable} from '../../utils/borradosPendientes';
import {
    CLAVE_USUARIO_INICIALIZADO,
    esServidorVacio,
    esProbableWipeout,
    usuarioYaInicializado,
    marcarUsuarioComoInicializado,
    generarDatosInicialesUsuarioNuevo,
    dispararBackupAutomatico
} from '../../utils/syncAyudas';

interface SyncMeta {
    lastModified: number;
    lastSync: number;
}

interface UseSyncManagerProps {
    currentData: DashboardData;
    onDataReceived: (data: DashboardData) => void;
    debounceMs?: number;
    onInitComplete?: () => void;
    isDataReady?: boolean;
  habitosInicializado?: boolean;
    /* [014A-19] Contador de cambios recibidos vía WebSocket remoto.
     * Cuando > 0, el auto-save HTTP se inhibe y el hash se actualiza
     * sin enviar datos al servidor (los cambios ya están allí). */
    contadorCambiosRemotosRef?: React.MutableRefObject<number>;
}

/* [26-08-2026] Filtra del payload del servidor las entidades cuyo id está en el
 * registro local de borrados pendientes (tombstones). Previene que un refresh
 * periódico/de foco resucite elementos que el usuario borró localmente cuando el
 * servidor aún no ha procesado el DELETE (race del debounce). Ver plan
 * plan-paridad-sync-export-2026-08-26.md. */
function aplicarTombstonesAlPayload(datos: DashboardData): DashboardData {
    const pendientes = obtenerBorradosPendientes();
    const set = (tipo: TipoEntidadBorrable) => new Set<number>(pendientes[tipo]);

    return {
        ...datos,
        tareas: datos.tareas.filter(t => !set('tareas').has(t.id)),
        proyectos: datos.proyectos ? datos.proyectos.filter(p => !set('proyectos').has(p.id)) : datos.proyectos,
        habitos: datos.habitos.filter(h => !set('habitos').has(h.id))
    };
}

/* [T7] La lógica de bienvenida y los guards (esServidorVacio,
 * esProbableWipeout, generarDatosInicialesUsuarioNuevo, marcadores de
 * localStorage y dispararBackupAutomatico) viven en `utils/syncAyudas.ts`.
 * La máquina de init/auto-save queda aquí de forma intencionada: ambas fases
 * comparten el mismo estado (`syncMeta`, `hasChanges`, `isInitialized`) y las
 * guards anti-loop/anti-wipeout/WS-absorb; separarlas en hooks elevaría ~10
 * refs/props y reintroduciría riesgo de desincronización de las guards.
 * Ver H-F12-13 en `Agente/archivado/auditoria-2026-08-25/frontend/12-hooks.md`. */
export function useSyncManager({currentData, onDataReceived, debounceMs = 2000, onInitComplete, isDataReady = true, habitosInicializado, contadorCambiosRemotosRef}: UseSyncManagerProps) {
    const {esPremium} = useSuscripcion();

    // 1. Detector de Cambios
    const {hasChanges, updateVersion: markChangesAsSynced, resetVersion} = useChangeDetector(currentData, true);

    // 2. Transporte (Comunicación API)
    const {saveData, loadData, transportState, cancelPendingRequests} = useSyncTransport();

    // 3. Estado de Sincronización Local (Meta)
    const {
        valor: syncMeta,
        setValor: setSyncMeta,
        cargando: loadingMeta
    } = useLocalStorage<SyncMeta>(CLAVES_LOCALSTORAGE.sync, {
        valorPorDefecto: {lastModified: 0, lastSync: 0}
    });

    const [isInitialized, setIsInitialized] = useState(false);
    const initializationStarted = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    /* [26-08-2026] Ref de "guardado debounced pendiente": refleja si hay ediciones
     * locales aún sin confirmar en el servidor. El refresco periódico/de foco lo
     * consulta SIEMPRE via ref (nunca un closure stale de `hasChanges`) para no
     * pisotear un cambio local con datos stale del servidor. Ver plan
     * plan-paridad-sync-export-2026-08-26.md. */
    const guardadoPendienteRef = useRef(false);
    /* [27-08-2026] Ref espejo de `syncMeta` para el refresh periódico/foco: el
     * guard de pisoteo necesita comparar `lastModified > lastSync` (hay cambios
     * locales que el servidor aún no confirmó), pero el interval se crea con un
     * closure que NO incluye syncMeta en sus deps. Si el save del debounce
     * FALLÓ, guardadoPendienteRef vuelve a false y el siguiente refresh pisaría
     * el completado local con datos stale del servidor (bug de carrera al
     * completar hábitos: "se marca y vuelve a aparecer"). Este ref permite
     * saltar el refresh mientras existan cambios locales no confirmados. */
    const syncMetaRef = useRef(syncMeta);
    syncMetaRef.current = syncMeta;

    // --- Lógica de Inicialización (Load Strategy) ---

    const performInitialSync = useCallback(async () => {
        if (!syncMeta) return;

        const {lastModified, lastSync} = syncMeta;
        const hasUnsyncedLocalChanges = lastModified > lastSync;
        const RETRY_KEY = 'glory_sync_init_retries';

        devLog('[SyncManager] Inicializando. Cambios locales pendientes:', hasUnsyncedLocalChanges);

        try {
            if (hasUnsyncedLocalChanges) {
                // Check safety breaker
                const retries = parseInt(sessionStorage.getItem(RETRY_KEY) || '0');
                if (retries >= 3) {
                    devWarn('[SyncManager] Loop detectado. Saltando subida inicial para estabilizar.');
                    // No subimos ahora. El loop de auto-guardado lo intentará después (con debounce).
                } else {
                    sessionStorage.setItem(RETRY_KEY, (retries + 1).toString());

                    // Prioridad a local: Intentar subir primero
                    devLog('[SyncManager] Subiendo cambios locales pendientes...');
                    /* [275A-1] Safety guard: abortar si los datos están vacíos
                     * pero ya hubo una sync previa (race condition de hidratación).
                     * [18-08-2026] Se permite si hay tombstones pendientes (borrado
                     * deliberado de TODO): el guardado con tombstones no es un wipe. */
                    if (esProbableWipeout(currentData, lastSync, habitosInicializado) && !hayBorradosPendientes()) {
                        /* [18-08-2026] El guard anti-wipeout funciona por diseno: evita
                         * subir datos vacios (p. ej. race tras logout/limpieza de sesion).
                         * No es un fallo -> warn, no error (ruido en consola al cerrar sesion). */
                        devWarn('[SyncManager] Subida inicial omitida: datos vacios detectados (guard anti-wipeout, p. ej. tras logout).');
                        sessionStorage.removeItem(RETRY_KEY);
                        return;
                    }
                    const success = await saveData({
                        ...currentData,
                        generateBackup: esPremium
                    });

                    if (success) {
                        setSyncMeta(prev => ({...prev, lastSync: Date.now()}));
                        markChangesAsSynced(); // Actualizar hash base
                        sessionStorage.removeItem(RETRY_KEY); // Éxito -> Resetear contador
                        dispararBackupAutomatico(esPremium);
                    }
                }
            } else {
                // Prioridad a servidor: Descargar
                const serverData = await loadData();
                
                /*
                 * Caso especial: Usuario nuevo sin datos en servidor
                 * 
                 * Criterio para determinar usuario nuevo que necesita datos de bienvenida:
                 * 1. El servidor NO tiene datos (esServidorVacio)
                 * 2. El usuario NO ha sido inicializado previamente (evita re-inicializar si borró datos)
                 * 
                 * Cuando se cumple, generamos datos completos de bienvenida usando datosIniciales.ts
                 * directamente, sin depender del estado de currentData (que puede estar vacío
                 * debido a la hidratación de Zustand).
                 */
                if (esServidorVacio(serverData) && !usuarioYaInicializado()) {
                    /*
                     * Generar datos iniciales completos.
                     * IMPORTANTE: NO usamos currentData para los datos de contenido,
                     * solo para mantener la estructura base (version, configuracion, etc.)
                     */
                    const datosIniciales = generarDatosInicialesUsuarioNuevo(currentData);
                    
                    devLog('[SyncManager] Usuario nuevo detectado. Generando datos de bienvenida...');
                    devLog('[SyncManager] Datos a subir:', {
                        habitos: datosIniciales.habitos?.length,
                        tareas: datosIniciales.tareas?.length,
                        notasLength: datosIniciales.notas?.length
                    });
                    
                    const success = await saveData({
                        ...datosIniciales,
                        generateBackup: false
                    });
                    
                    if (success) {
                        devLog('[SyncManager] Datos iniciales sincronizados correctamente.');
                        
                        /* 
                         * Marcar usuario como inicializado para evitar repetir
                         * este proceso si el usuario limpia su localStorage
                         */
                        marcarUsuarioComoInicializado();
                        
                        /*
                         * CRÍTICO: Notificar al frontend con los datos iniciales completos.
                         * Esto actualiza tanto el store de Zustand (hábitos) como el estado local (tareas, notas).
                         */
                        onDataReceived(datosIniciales);
                        
                        setSyncMeta(prev => ({...prev, lastSync: Date.now()}));
                        markChangesAsSynced();
                    }
                } else if (serverData) {
                    devLog('[SyncManager] Datos descargados del servidor.');
                    onDataReceived(serverData);
                    resetVersion(serverData); // Resetear hash base a lo nuevo
                    setSyncMeta(prev => ({...prev, lastSync: Date.now()}));
                }
            }
        } catch (e) {
            console.error('[SyncManager] Error en sincronización inicial:', e);
        } finally {
            setIsInitialized(true);
            if (onInitComplete) onInitComplete();

            // Si llegamos aquí y nos mantenemos vivos por 5s, resetear el contador
            setTimeout(() => {
                sessionStorage.removeItem(RETRY_KEY);
            }, 5000);
        }
    }, [syncMeta, saveData, loadData, currentData, markChangesAsSynced, resetVersion, onDataReceived, setSyncMeta, esPremium, onInitComplete]);

    // Ejecutar inicialización una vez cargado el Meta y los datos externos
    useEffect(() => {
        if (!loadingMeta && !isInitialized && isDataReady && !initializationStarted.current) {
            initializationStarted.current = true;
            performInitialSync();
        }
    }, [loadingMeta, isInitialized, isDataReady, performInitialSync]);

    useEffect(() => {
        if (!isInitialized) return;

        const refrescarDesdeServidor = async () => {
            /* [26-08-2026] Fix reappear: NO sobrescribir el estado local con datos
             * del servidor si hay cambios locales pendientes de guardar. Se usa el
             * ref (guardadoPendienteRef) en vez de `hasChanges` para no depender de
             * un closure stale en el setInterval/manejarFoco: aunque `hasChanges`
             * mida el hash entero, el ref refleja el ciclo guardar-debounce de forma
             * determinista y evita que un pull pise una edición recién hecha.
             * [27-08-2026] Además de la ventana del debounce, se salta el refresh si
             * `lastModified > lastSync` (cambios locales aún no confirmados por el
             * servidor). Esto cubre el caso en que el save FALLÓ: guardadoPendienteRef
             * vuelve a false al terminar el intento, pero los datos locales siguen
             * siendo más nuevos y un pull los pisaría (carrera al completar hábitos). */
            const meta = syncMetaRef.current;
            if (document.visibilityState !== 'visible' || guardadoPendienteRef.current || transportState.isSaving) return;
            if (meta && meta.lastModified > meta.lastSync) return;
            const serverData = await loadData();
            if (!serverData) return;
            /* [28-08-2026] Re-verificar los guards DESPUÉS del fetch: entre el
             * chequeo inicial y la respuesta pueden entrar cambios locales.
             * Caso real (bug del toggle de hábitos): el clic que enfoca la
             * ventana dispara manejarFoco (pull) y a la vez completa el
             * hábito; la respuesta stale llegaba después y onDataReceived
             * pisaba el toggle optimista → toast de "completado" y el hábito
             * volvía a desmarcarse (solo quedaba al 2º/3º intento, sin evento
             * de foco). Con el re-check, un payload que pisaría cambios
             * locales se descarta y el próximo pull ya traerá el estado
             * guardado. */
            if (document.visibilityState !== 'visible' || guardadoPendienteRef.current) return;
            const metaPostFetch = syncMetaRef.current;
            if (metaPostFetch && metaPostFetch.lastModified > metaPostFetch.lastSync) return;
            /* [26-08-2026] Fix reappear (tombstones-aware): aunque el servidor
             * devuelva una fila que el usuario borró localmente (por el race entre
             * el DELETE del debounce y este pull), NO la resucitamos en local.
             * Se descartan del payload servidor las entidades cuyo id está aún en
             * el registro de borrados pendientes. */
            onDataReceived(aplicarTombstonesAlPayload(serverData));
            resetVersion(serverData);
            setSyncMeta(prev => ({...prev, lastSync: Date.now()}));
        };

        const intervalo = window.setInterval(() => {
            refrescarDesdeServidor().catch(error => devWarn('[SyncManager] Refresh servidor falló:', error));
        }, 30000);

        const manejarFoco = () => {
            refrescarDesdeServidor().catch(error => devWarn('[SyncManager] Refresh en foco falló:', error));
        };

        window.addEventListener('focus', manejarFoco);
        document.addEventListener('visibilitychange', manejarFoco);

        return () => {
            window.clearInterval(intervalo);
            window.removeEventListener('focus', manejarFoco);
            document.removeEventListener('visibilitychange', manejarFoco);
        };
    }, [isInitialized, hasChanges, transportState.isSaving, loadData, onDataReceived, resetVersion, setSyncMeta]);

    // --- Lógica de Sincronización Continua (Save Loop) ---

    // Detectar cambios y programar guardado
    useEffect(() => {
        if (!isInitialized) return; // Esperar a que termine la carga inicial

        if (hasChanges) {
            /* [014A-19] Si el cambio fue originado por WebSocket remoto, actualizar
             * hash baseline sin disparar HTTP auto-save. El dato ya está en servidor
             * (vino de ahí) así que reenviarlo sería redundante.
             * Tradeoff: si un cambio local coincide exactamente con uno remoto en el
             * mismo ciclo de render, el save se retrasa hasta la siguiente interacción.
             * Esto es aceptable dado lo estrecho de la ventana temporal. */
            if (contadorCambiosRemotosRef?.current && contadorCambiosRemotosRef.current > 0) {
                contadorCambiosRemotosRef.current = 0;
                /* [28-08-2026] Solo absorber si NO hay guardado local pendiente/en vuelo.
                 * Si lo hay, el cleanup de este efecto ya limpió su timer: absorber aquí
                 * cancelaría el save del cambio local y dejaría guardadoPendienteRef en
                 * true indefinidamente (bloqueando TODOS los pulls futuros — la re-verificación
                 * post-fetch los descartaría siempre). Al caer al save normal, el push envía
                 * el estado completo —incluye el cambio remoto ya aplicado— y el upsert
                 * idempotente del backend no duplica nada. */
                if (guardadoPendienteRef.current) {
                    devLog('[SyncManager] Cambio remoto WS con save local pendiente — el save en curso lo incluye');
                } else {
                    markChangesAsSynced();
                    devLog('[SyncManager] Cambio remoto WS absorbido — hash actualizado sin HTTP auto-save');
                    return;
                }
            }

            // Check Safety Breaker for Auto-Save too
            const retries = parseInt(sessionStorage.getItem('glory_sync_init_retries') || '0');
            if (retries >= 3) {
                devWarn('[SyncManager] Auto-save pausado por inestabilidad (Safety Breaker activo).');
                return;
            }

            /* [247A-2] Actualizar lastModified INMEDIATAMENTE al detectar cambio,
             * no dentro del debounce. Si el usuario recarga antes de que el debounce
             * de 2s se ejecute, lastModified > lastSync será true y performInitialSync
             * subirá los cambios locales en vez de descargar datos obsoletos del servidor.
             * Esto previene pérdida de ordenEjecucion y otros cambios de store. */
            setSyncMeta(prev => ({...prev, lastModified: Date.now()}));

            // 2. Debounce Save
            if (debounceTimer.current) clearTimeout(debounceTimer.current);

            /* Marcar que hay un guardado pendiente: el refresco periódico/foco no
             * debe pisar el estado local hasta que este save confirme (o falle). */
            guardadoPendienteRef.current = true;

            debounceTimer.current = setTimeout(async () => {
                devLog('[SyncManager] Auto-guardando cambios...');
                /* [275A-1] Safety guard: abortar auto-save si los datos estan vacios.
                 * Esto atrapa el caso donde la hidratacion se completa tarde
                 * y el auto-save se dispara con datos parciales. */
                /* [18-08-2026] El guard anti-wipeout se salta cuando hay tombstones
                 * pendientes: el usuario puede borrar TODOS los elementos a propósito
                 * y ese estado vacío es legítimo. Con tombstones el guardado no es un
                 * wipe (los upserts solo tocan lo presente + los DELETE informados),
                 * así que permitirlo no arriesga datos. */
                if (syncMeta && esProbableWipeout(currentData, syncMeta.lastSync, habitosInicializado) && !hayBorradosPendientes()) {
                    devWarn('[SyncManager] Auto-save omitido: datos vacios detectados (guard anti-wipeout, p. ej. tras logout).');
                    guardadoPendienteRef.current = false;
                    markChangesAsSynced(); // Resetear hash para evitar loop
                    return;
                }

                // Actualizar meta justo antes de guardar o al intentar guardar
                setSyncMeta(prev => ({...prev, lastModified: Date.now()}));

                const success = await saveData({
                    ...currentData,
                    generateBackup: esPremium
                });

                if (success) {
                    setSyncMeta(prev => ({...prev, lastSync: Date.now()}));
                    markChangesAsSynced();
                    dispararBackupAutomatico(esPremium);
                }
                guardadoPendienteRef.current = false;
            }, debounceMs);
        }

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [hasChanges, isInitialized, debounceMs, currentData, saveData, setSyncMeta, markChangesAsSynced, esPremium]);

    // Cleanup
    useEffect(() => {
        return () => cancelPendingRequests();
    }, [cancelPendingRequests]);

    // Exponer estado unificado
    const syncState = {
        isSynced: !transportState.isSaving && !hasChanges,
        isSaving: transportState.isSaving,
        isLoading: transportState.isLoading || !isInitialized,
        error: transportState.error,
        pendingChanges: hasChanges
    };

    return {
        syncState,
        forceSync: async () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            return await saveData(currentData);
        },
        resetSafetyBreaker: () => sessionStorage.removeItem('glory_sync_init_retries')
    };
}

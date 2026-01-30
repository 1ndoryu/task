import {useEffect, useCallback, useRef, useState} from 'react';
import {useChangeDetector} from './useChangeDetector';
import {useSyncTransport} from './useSyncTransport';
import {useLocalStorage, CLAVES_LOCALSTORAGE} from '../useLocalStorage';
import {useSuscripcion} from '../useSuscripcion';
import type {DashboardData, EstadoApi} from '../useDashboardApi';
import {tareasIniciales, notasIniciales, habitosIniciales} from '../../data/datosIniciales';

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
}

/*
 * Verifica si los datos del servidor están "vacíos" (usuario nuevo sin datos)
 * Consideramos vacío si no tiene hábitos, tareas, y notas vacías
 */
function esServidorVacio(serverData: DashboardData | null): boolean {
    if (!serverData) return true;
    
    const sinHabitos = !serverData.habitos || serverData.habitos.length === 0;
    const sinTareas = !serverData.tareas || serverData.tareas.length === 0;
    const sinNotas = !serverData.notas || serverData.notas.trim() === '';
    
    return sinHabitos && sinTareas && sinNotas;
}

/*
 * Verifica si los datos locales contienen datos iniciales de bienvenida
 * (al menos una tarea o una nota con contenido)
 * Nota: Si localData está vacío pero tenemos datos iniciales definidos, usamos esos.
 */
function tieneDataInicialLocal(localData: DashboardData): boolean {
    const tieneHabitos = !!(localData.habitos && localData.habitos.length > 0);
    const tieneTareas = !!(localData.tareas && localData.tareas.length > 0);
    const tieneNotas = !!(localData.notas && localData.notas.trim().length > 0);
    
    return tieneHabitos || tieneTareas || tieneNotas;
}

/*
 * Genera datos iniciales para usuarios nuevos usando los datos de bienvenida
 */
function generarDatosInicialesUsuarioNuevo(): Partial<DashboardData> {
    return {
        habitos: habitosIniciales,
        tareas: tareasIniciales,
        notas: notasIniciales,
        proyectos: []
    };
}

export function useSyncManager({currentData, onDataReceived, debounceMs = 2000, onInitComplete, isDataReady = true}: UseSyncManagerProps) {
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

    // --- Lógica de Inicialización (Load Strategy) ---

    const performInitialSync = useCallback(async () => {
        if (!syncMeta) return;

        const {lastModified, lastSync} = syncMeta;
        const hasUnsyncedLocalChanges = lastModified > lastSync;
        const RETRY_KEY = 'glory_sync_init_retries';

        console.log('[SyncManager] Inicializando. Cambios locales pendientes:', hasUnsyncedLocalChanges);

        try {
            if (hasUnsyncedLocalChanges) {
                // Check safety breaker
                const retries = parseInt(sessionStorage.getItem(RETRY_KEY) || '0');
                if (retries >= 3) {
                    console.warn('[SyncManager] Loop detectado. Saltando subida inicial para estabilizar.');
                    // No subimos ahora. El loop de auto-guardado lo intentará después (con debounce).
                } else {
                    sessionStorage.setItem(RETRY_KEY, (retries + 1).toString());

                    // Prioridad a local: Intentar subir primero
                    console.log('[SyncManager] Subiendo cambios locales pendientes...');
                    const success = await saveData({
                        ...currentData,
                        // @ts-ignore - Flag opcional para backend
                        generateBackup: esPremium
                    });

                    if (success) {
                        setSyncMeta(prev => ({...prev, lastSync: Date.now()}));
                        markChangesAsSynced(); // Actualizar hash base
                        sessionStorage.removeItem(RETRY_KEY); // Éxito -> Resetear contador
                    }
                }
            } else {
                // Prioridad a servidor: Descargar
                const serverData = await loadData();
                
                /*
                 * Caso especial: Usuario nuevo sin datos en servidor
                 * Si el servidor está vacío, subimos los datos iniciales de bienvenida.
                 * Usamos los datos locales si tienen contenido, o los datos iniciales como fallback.
                 * Esto asegura que nuevos usuarios vean las tareas/notas de bienvenida.
                 */
                if (esServidorVacio(serverData)) {
                    const datosParaSubir = tieneDataInicialLocal(currentData) 
                        ? currentData 
                        : {...currentData, ...generarDatosInicialesUsuarioNuevo()};
                    
                    console.log('[SyncManager] Usuario nuevo detectado. Subiendo datos iniciales al servidor...');
                    
                    const success = await saveData({
                        ...datosParaSubir,
                        // @ts-ignore - Flag opcional para backend
                        generateBackup: false
                    });
                    
                    if (success) {
                        console.log('[SyncManager] Datos iniciales sincronizados correctamente.');
                        
                        /*
                         * Si usamos datos iniciales porque currentData estaba vacío,
                         * notificar al frontend para que actualice su estado local
                         */
                        if (!tieneDataInicialLocal(currentData)) {
                            onDataReceived(datosParaSubir as DashboardData);
                        }
                        
                        setSyncMeta(prev => ({...prev, lastSync: Date.now()}));
                        markChangesAsSynced();
                    }
                } else if (serverData) {
                    console.log('[SyncManager] Datos descargados del servidor.');
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

    // --- Lógica de Sincronización Continua (Save Loop) ---

    // Detectar cambios y programar guardado
    useEffect(() => {
        if (!isInitialized) return; // Esperar a que termine la carga inicial

        if (hasChanges) {
            // Check Safety Breaker for Auto-Save too
            const retries = parseInt(sessionStorage.getItem('glory_sync_init_retries') || '0');
            if (retries >= 3) {
                console.warn('[SyncManager] Auto-save pausado por inestabilidad (Safety Breaker activo).');
                return;
            }

            // 2. Debounce Save
            if (debounceTimer.current) clearTimeout(debounceTimer.current);

            debounceTimer.current = setTimeout(async () => {
                console.log('[SyncManager] Auto-guardando cambios...');

                // Actualizar meta justo antes de guardar o al intentar guardar
                setSyncMeta(prev => ({...prev, lastModified: Date.now()}));

                const success = await saveData({
                    ...currentData,
                    // @ts-ignore
                    generateBackup: esPremium
                });

                if (success) {
                    setSyncMeta(prev => ({...prev, lastSync: Date.now()}));
                    markChangesAsSynced();
                }
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

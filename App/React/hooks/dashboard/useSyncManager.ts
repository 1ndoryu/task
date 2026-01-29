import {useEffect, useCallback, useRef, useState} from 'react';
import {useChangeDetector} from './useChangeDetector';
import {useSyncTransport} from './useSyncTransport';
import {useLocalStorage, CLAVES_LOCALSTORAGE} from '../useLocalStorage';
import {useSuscripcion} from '../useSuscripcion';
import type {DashboardData, EstadoApi} from '../useDashboardApi';

interface SyncMeta {
    lastModified: number;
    lastSync: number;
}

interface UseSyncManagerProps {
    currentData: DashboardData;
    onDataReceived: (data: DashboardData) => void;
    debounceMs?: number;
    onInitComplete?: () => void;
}

export function useSyncManager({currentData, onDataReceived, debounceMs = 2000, onInitComplete}: UseSyncManagerProps) {
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
                if (serverData) {
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

    // Ejecutar inicialización una vez cargado el Meta
    useEffect(() => {
        if (!loadingMeta && !isInitialized) {
            performInitialSync();
        }
    }, [loadingMeta, isInitialized, performInitialSync]);

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

import {useState, useCallback, useRef, useEffect} from 'react';
import {useDashboardApi, DashboardData, EstadoApi} from '../useDashboardApi';

interface SyncTransportConfig {
    maxRetries?: number;
    initialRetryDelay?: number;
}

interface UseSyncTransportReturn {
    // API Wrappers con lógica de reintento
    saveData: (data: Partial<DashboardData>) => Promise<boolean>;
    loadData: () => Promise<DashboardData | null>;

    // Estados expuestos
    transportState: {
        isSaving: boolean;
        isLoading: boolean;
        error: string | null;
        lastSuccess: number | null;
    };

    // Utilidades
    cancelPendingRequests: () => void;
}

export function useSyncTransport(config: SyncTransportConfig = {}): UseSyncTransportReturn {
    const {maxRetries = 3, initialRetryDelay = 2000} = config;

    const {estado: apiState, guardar, cargar} = useDashboardApi();

    // Estado local para manejar reintentos y lógica extendida
    const [lastSuccess, setLastSuccess] = useState<number | null>(null);
    const retryCount = useRef(0);
    const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Limpiar timeouts al desmontar
    useEffect(() => {
        return () => {
            if (retryTimeout.current) clearTimeout(retryTimeout.current);
        };
    }, []);

    const cancelPendingRequests = useCallback(() => {
        if (retryTimeout.current) {
            clearTimeout(retryTimeout.current);
            retryTimeout.current = null;
        }
    }, []);

    /**
     * Guarda datos con estrategia de Backoff Exponencial
     */
    const saveData = useCallback(
        async (data: Partial<DashboardData>): Promise<boolean> => {
            // Si ya estamos reintentando, cancelar el anterior (nueva data tiene prioridad)
            if (retryTimeout.current) {
                clearTimeout(retryTimeout.current);
            }

            try {
                const success = await guardar(data);

                if (success) {
                    retryCount.current = 0;
                    setLastSuccess(Date.now());
                    return true;
                } else {
                    // No dependemos de apiState.error para evitar inestabilidad en la referencia de la función
                    throw new Error('Error al guardar datos (API devolvió false)');
                }
            } catch (error) {
                console.warn('[SyncTransport] Error saving:', error);

                if (retryCount.current < maxRetries) {
                    retryCount.current++;
                    const delay = initialRetryDelay * Math.pow(2, retryCount.current - 1); // 2s, 4s, 8s...

                    console.log(`[SyncTransport] Retrying in ${delay}ms (Attempt ${retryCount.current}/${maxRetries})`);

                    return new Promise(resolve => {
                        retryTimeout.current = setTimeout(async () => {
                            const result = await saveData(data);
                            resolve(result);
                        }, delay);
                    });
                }

                return false;
            }
        },
        [guardar, maxRetries, initialRetryDelay]
    );

    const loadData = useCallback(async (): Promise<DashboardData | null> => {
        return await cargar();
    }, [cargar]);

    return {
        saveData,
        loadData,
        transportState: {
            isSaving: apiState.guardando,
            isLoading: apiState.cargando,
            error: apiState.error,
            lastSuccess
        },
        cancelPendingRequests
    };
}

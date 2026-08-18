import {useCallback, useRef} from 'react';

export interface ChangeDetectorResult {
    hasChanges: boolean;
    updateVersion: () => void;
    currentHash: string;
}

export function useChangeDetector<T>(data: T, skipInitial = false) {
    const lastHash = useRef<string>('');
    const isFirstRun = useRef<boolean>(true);

    const generateHash = (data: T): string => {
        try {
            return JSON.stringify(data);
        } catch (e) {
            console.error('[ChangeDetector] Error hashing data', e);
            return '';
        }
    };

    const currentHash = generateHash(data);

    // Inicialización del hash en la primera ejecución si se requiere
    if (isFirstRun.current) {
        if (skipInitial) {
            lastHash.current = currentHash;
        }
        isFirstRun.current = false;
    }

    const hasChanges = currentHash !== lastHash.current && lastHash.current !== '';

    const updateVersion = useCallback(() => {
        lastHash.current = currentHash;
    }, [currentHash]);

    // Forzar actualización manual del hash (útil tras cargar datos del servidor)
    const resetVersion = useCallback((newData: T) => {
        lastHash.current = generateHash(newData);
    }, []);

    return {
        hasChanges,
        currentHash,
        updateVersion,
        resetVersion
    };
}

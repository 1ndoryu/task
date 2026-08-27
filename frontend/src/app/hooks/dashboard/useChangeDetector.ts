import {useCallback, useRef} from 'react';

export interface ChangeDetectorResult {
    hasChanges: boolean;
    updateVersion: () => void;
    currentHash: string;
}

export function useChangeDetector<T>(data: T, skipInitial = false) {
    const lastHash = useRef<string>('');
    const isFirstRun = useRef<boolean>(true);

    /* [28-08-2026] Hash canónico: excluye campos que el SERVIDOR muta en cada
     * guardado sin cambio de contenido (el upsert hace updated_at=now() en toda
     * fila tocada y devuelve ultimaActualizacion). Con ellos dentro, cada pull
     * aplicaba timestamps frescos → hash distinto → auto-save → el backend los
     * volvía a mutar → save eterno (un guardado completo por cada pull de 30s,
     * para siempre). Los edits reales siempre cambian campos de contenido, así
     * que excluir metadata no oculta cambios genuinos. El replacer de
     * JSON.stringify omite las claves que devuelven undefined, recursivamente. */
    const CAMPOS_VOLATILES = new Set(['updatedAt', 'ultimaActualizacion']);
    const generateHash = (data: T): string => {
        try {
            return JSON.stringify(data, (clave, valor) => (CAMPOS_VOLATILES.has(clave) ? undefined : valor));
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

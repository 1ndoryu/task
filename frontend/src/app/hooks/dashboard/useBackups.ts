import {useState, useCallback} from 'react';
import {obtenerNonce} from '../useDashboardApi'; // Reusing nonce helper

export interface BackupMetadata {
    id: string;
    timestamp: number;
    sizeBytes: number;
    device: string;
    hash: string;
    trigger: string; // 'manual' | 'auto' | 'sync'
}

interface UseBackupsReturn {
    backups: BackupMetadata[];
    cargando: boolean;
    error: string | null;
    obtenerBackups: () => Promise<void>;
    restaurarBackup: (id: string) => Promise<boolean>;
    eliminarBackup: (id: string) => Promise<boolean>;
}

export function useBackups(): UseBackupsReturn {
    const [backups, setBackups] = useState<BackupMetadata[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* [18-08-2026] Sin backend de backups en Rust aun: se degrada sin llamar
     * a /wp-json (lista vacia, acciones deshabilitadas con mensaje claro). */
    const obtenerBackups = useCallback(async () => {
        setCargando(false);
        setError(null);
        setBackups([]);
    }, []);

    const restaurarBackup = useCallback(async (_id: string): Promise<boolean> => {
        setError('Los backups aún no están disponibles');
        return false;
    }, []);

    const eliminarBackup = useCallback(async (_id: string): Promise<boolean> => {
        setError('Los backups aún no están disponibles');
        return false;
    }, []);

    return {
        backups,
        cargando,
        error,
        obtenerBackups,
        restaurarBackup,
        eliminarBackup
    };
}

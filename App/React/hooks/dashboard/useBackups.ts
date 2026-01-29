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
}

export function useBackups(): UseBackupsReturn {
    const [backups, setBackups] = useState<BackupMetadata[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiBase = '/wp-json/glory/v1/backups';

    const obtenerBackups = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const response = await fetch(apiBase, {
                headers: {
                    'X-WP-Nonce': obtenerNonce(),
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Error al cargar backups');

            const data = await response.json();
            if (data.success) {
                setBackups(data.data);
            } else {
                throw new Error(data.message || 'Error desconocido');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error de conexión';
            setError(msg);
        } finally {
            setCargando(false);
        }
    }, []);

    const restaurarBackup = useCallback(async (id: string): Promise<boolean> => {
        setCargando(true);
        try {
            const response = await fetch(`${apiBase}/restore`, {
                method: 'POST',
                headers: {
                    'X-WP-Nonce': obtenerNonce(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({backup_id: id})
            });

            const data = await response.json();

            if (data.success) {
                // La app debería recargar los datos tras esto.
                // Idealmente forzamos una recarga completa de la página o del estado.
                window.location.reload();
                return true;
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error al restaurar';
            setError(msg);
            return false;
        } finally {
            setCargando(false);
        }
    }, []);

    return {
        backups,
        cargando,
        error,
        obtenerBackups,
        restaurarBackup
    };
}

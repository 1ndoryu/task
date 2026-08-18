import {useState, useCallback} from 'react';
import {apiFetch} from '../../utils/apiClient';

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
    crearBackup: () => Promise<boolean>;
    restaurarBackup: (id: string) => Promise<boolean>;
    eliminarBackup: (id: string) => Promise<boolean>;
}

/* [18-08-2026] Contrato Rust /api/backups:
 * GET /backups -> BackupMetadata[] | POST /backups { trigger } -> { success, backup }
 * POST /backups/{id}/restore -> { success, message } | DELETE /backups/{id} -> 204 */

export function useBackups(): UseBackupsReturn {
    const [backups, setBackups] = useState<BackupMetadata[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const obtenerBackups = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const datos = await apiFetch<BackupMetadata[]>('/backups');
            setBackups(datos);
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }, []);

    const crearBackup = useCallback(async (): Promise<boolean> => {
        setCargando(true);
        setError(null);
        try {
            const respuesta = await apiFetch<{success: boolean; backup: BackupMetadata}>('/backups', {
                method: 'POST',
                body: {trigger: 'manual'}
            });
            if (respuesta.success) {
                setBackups(prev => [respuesta.backup, ...prev]);
                return true;
            }
            return false;
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setError(mensaje);
            return false;
        } finally {
            setCargando(false);
        }
    }, []);

    const restaurarBackup = useCallback(async (id: string): Promise<boolean> => {
        setCargando(true);
        setError(null);
        try {
            const respuesta = await apiFetch<{success: boolean; message: string}>(
                `/backups/${id}/restore`,
                {method: 'POST'}
            );
            if (!respuesta.success) {
                setError(respuesta.message);
                return false;
            }
            return true;
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setError(mensaje);
            return false;
        } finally {
            setCargando(false);
        }
    }, []);

    const eliminarBackup = useCallback(async (id: string): Promise<boolean> => {
        setCargando(true);
        setError(null);
        try {
            await apiFetch<void>(`/backups/${id}`, {method: 'DELETE'});
            setBackups(prev => prev.filter(b => b.id !== id));
            return true;
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setError(mensaje);
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
        crearBackup,
        restaurarBackup,
        eliminarBackup
    };
}

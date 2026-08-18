/*
 * useModalHistorialBackups
 * Hook con la lógica del modal de historial de backups
 * Maneja carga de backups, acciones de restaurar/eliminar y formateo
 */

import {useEffect, useCallback} from 'react';
import {useBackups} from './useBackups';
import {useSuscripcionStore} from '../../stores/suscripcionStore';

interface UseModalHistorialBackupsParams {
    estaAbierto: boolean;
}

export function useModalHistorialBackups({estaAbierto}: UseModalHistorialBackupsParams) {
    const {backups, cargando, error, obtenerBackups, restaurarBackup, eliminarBackup} = useBackups();
    const esPremium = useSuscripcionStore(s => s.esPremium());

    useEffect(() => {
        if (estaAbierto && esPremium) {
            obtenerBackups();
        }
    }, [estaAbierto, obtenerBackups, esPremium]);

    const handleRestaurar = useCallback(
        async (id: string) => {
            if (window.confirm('¿ESTÁS SEGURO? Esto restaurará tus datos al estado de esta copia. Cualquier cambio no guardado se perderá.')) {
                await restaurarBackup(id);
            }
        },
        [restaurarBackup]
    );

    const handleEliminar = useCallback(
        async (id: string) => {
            if (window.confirm('¿Eliminar esta copia? Esta acción no se puede deshacer.')) {
                await eliminarBackup(id);
            }
        },
        [eliminarBackup]
    );

    const formatBytes = useCallback((bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

    const formatDate = useCallback((timestamp: number) => {
        if (!timestamp) return 'Fecha desconocida';
        return new Date(timestamp).toLocaleString('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'medium'
        });
    }, []);

    const formatTrigger = useCallback((trigger: string) => {
        if (!trigger) return '';
        if (trigger === 'sync') return 'Sincronización';
        if (trigger === 'manual' || trigger === 'manual_save') return 'Manual';
        if (trigger === 'auto' || trigger === 'auto_save') return 'Automática';
        return trigger;
    }, []);

    return {
        backups,
        cargando,
        error,
        esPremium,
        handleRestaurar,
        handleEliminar,
        formatBytes,
        formatDate,
        formatTrigger
    };
}

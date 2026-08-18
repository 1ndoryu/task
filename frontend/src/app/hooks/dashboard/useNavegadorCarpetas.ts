/*
 * useNavegadorCarpetas
 * Hook que encapsula la lógica CRUD de carpetas de notas.
 * Maneja creación, edición inline, renombrado y eliminación.
 */

import {useState, useCallback} from 'react';
import type {CarpetaNota} from '../../types/notas';

interface UseNavegadorCarpetasParams {
    onCrear: (nombre: string) => Promise<void>;
    onRenombrar: (id: number, nombre: string) => Promise<void>;
    onEliminar: (id: number) => Promise<void>;
}

export function useNavegadorCarpetas({onCrear, onRenombrar, onEliminar}: UseNavegadorCarpetasParams) {
    const [creando, setCreando] = useState(false);
    const [nombreNueva, setNombreNueva] = useState('');
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [nombreEditando, setNombreEditando] = useState('');

    /* Crear nueva carpeta y resetear formulario */
    const manejarCrear = useCallback(async () => {
        if (!nombreNueva.trim()) return;

        await onCrear(nombreNueva.trim());
        setNombreNueva('');
        setCreando(false);
    }, [nombreNueva, onCrear]);

    /* Iniciar edición inline de una carpeta (solo las no virtuales) */
    const iniciarEdicion = useCallback((carpeta: CarpetaNota) => {
        if (carpeta.esVirtual || carpeta.id === null) return;
        setEditandoId(carpeta.id);
        setNombreEditando(carpeta.nombre);
    }, []);

    /* Guardar nombre editado */
    const manejarGuardarEdicion = useCallback(async () => {
        if (!editandoId || !nombreEditando.trim()) return;

        await onRenombrar(editandoId, nombreEditando.trim());
        setEditandoId(null);
        setNombreEditando('');
    }, [editandoId, nombreEditando, onRenombrar]);

    /* Cancelar edición en curso */
    const cancelarEdicion = useCallback(() => {
        setEditandoId(null);
        setNombreEditando('');
    }, []);

    /* Eliminar carpeta con confirmación */
    const manejarEliminar = useCallback(
        async (id: number) => {
            if (!confirm('¿Eliminar carpeta? Las notas se moverán a General.')) return;
            await onEliminar(id);
        },
        [onEliminar]
    );

    /* Cancelar creación y limpiar formulario */
    const cancelarCreacion = useCallback(() => {
        setCreando(false);
        setNombreNueva('');
    }, []);

    return {
        creando,
        setCreando,
        nombreNueva,
        setNombreNueva,
        editandoId,
        nombreEditando,
        setNombreEditando,
        manejarCrear,
        iniciarEdicion,
        manejarGuardarEdicion,
        cancelarEdicion,
        manejarEliminar,
        cancelarCreacion
    };
}

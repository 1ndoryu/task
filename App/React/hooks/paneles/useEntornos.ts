/* [034A-14] Hook para gestión de entornos de Grupos Facebook.
 * CRUD + activación de entorno + config de usuario.
 * El entorno activo modifica la vista de grupos aplicando overrides. */

import { useState, useEffect, useCallback } from 'react';
import { gruposFbService, EntornoGrupoFb } from '../../services/gruposFbService';

interface UseEntornosState {
    entornos: EntornoGrupoFb[];
    entornoActivo: EntornoGrupoFb | null;
    cargando: boolean;
    error: string | null;
}

export function useEntornos() {
    const [state, setState] = useState<UseEntornosState>({
        entornos: [],
        entornoActivo: null,
        cargando: false,
        error: null,
    });

    const cargar = useCallback(async () => {
        setState(prev => ({ ...prev, cargando: true, error: null }));
        try {
            const entornos = await gruposFbService.listarEntornos();
            const activo = entornos.find(e => e.activo) ?? null;
            setState({ entornos, entornoActivo: activo, cargando: false, error: null });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al cargar entornos';
            setState(prev => ({ ...prev, cargando: false, error: msg }));
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        cargar();
        return () => controller.abort();
    }, [cargar]);

    const activar = useCallback(async (entornoId: number | null) => {
        try {
            await gruposFbService.activarEntorno(entornoId);
            setState(prev => ({
                ...prev,
                entornos: prev.entornos.map(e => ({ ...e, activo: e.id === entornoId })),
                entornoActivo: entornoId !== null
                    ? prev.entornos.find(e => e.id === entornoId) ?? null
                    : null,
            }));
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al activar entorno';
            setState(prev => ({ ...prev, error: msg }));
        }
    }, []);

    const crear = useCallback(async (datos: { nombre: string; icono?: string; color?: string; aiPrompt?: string | null }) => {
        try {
            const nuevo = await gruposFbService.crearEntorno({
                nombre: datos.nombre,
                icono: datos.icono ?? 'layers',
                color: datos.color ?? '#6366f1',
                aiPrompt: datos.aiPrompt ?? null,
                orden: state.entornos.length,
            });
            setState(prev => ({
                ...prev,
                entornos: [...prev.entornos, nuevo],
            }));
            return nuevo;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al crear entorno';
            setState(prev => ({ ...prev, error: msg }));
            return null;
        }
    }, [state.entornos.length]);

    const actualizar = useCallback(async (id: number, datos: Partial<Omit<EntornoGrupoFb, 'id' | 'createdAt'>>) => {
        try {
            const actualizado = await gruposFbService.actualizarEntorno(id, datos);
            setState(prev => ({
                ...prev,
                entornos: prev.entornos.map(e => e.id === id ? actualizado : e),
                entornoActivo: prev.entornoActivo?.id === id ? actualizado : prev.entornoActivo,
            }));
            return actualizado;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al actualizar entorno';
            setState(prev => ({ ...prev, error: msg }));
            return null;
        }
    }, []);

    const eliminar = useCallback(async (id: number) => {
        try {
            await gruposFbService.eliminarEntorno(id);
            setState(prev => ({
                ...prev,
                entornos: prev.entornos.filter(e => e.id !== id),
                entornoActivo: prev.entornoActivo?.id === id ? null : prev.entornoActivo,
            }));
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al eliminar entorno';
            setState(prev => ({ ...prev, error: msg }));
            return false;
        }
    }, []);

    return {
        ...state,
        cargar,
        activar,
        crear,
        actualizar,
        eliminar,
    };
}

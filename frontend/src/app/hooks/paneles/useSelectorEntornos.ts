/* [034A-19] Hook extraido de SelectorEntornos para cumplir max 3 useState por componente.
 * Gestiona estado del dropdown, modos crear/editar y handlers CRUD de entornos. */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { EntornoGrupoFb } from '../../services/gruposFbService';

interface UseSelectorEntornosParams {
    onCrear: (datos: { nombre: string; color?: string }) => Promise<EntornoGrupoFb | null>;
    onEliminar: (id: number) => Promise<boolean>;
    onActualizar: (id: number, datos: Partial<EntornoGrupoFb>) => Promise<EntornoGrupoFb | null>;
    entornoActivo: EntornoGrupoFb | null;
}

export function useSelectorEntornos({ onCrear, onEliminar, onActualizar, entornoActivo }: UseSelectorEntornosParams) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [modoCrear, setModoCrear] = useState(false);
    const [modoEditar, setModoEditar] = useState<number | null>(null);
    const [nombreNuevo, setNombreNuevo] = useState('');
    const refMenu = useRef<HTMLDivElement>(null);

    /* Cerrar al click fuera */
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: MouseEvent) => {
            if (refMenu.current && !refMenu.current.contains(e.target as Node)) {
                setMenuAbierto(false);
                setModoCrear(false);
                setModoEditar(null);
            }
        };
        /* sentinel-disable-next-line componente-artesanal — patron estandar de click-outside */
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto]);

    const handleCrear = useCallback(async () => {
        if (!nombreNuevo.trim()) return;
        const result = await onCrear({ nombre: nombreNuevo.trim() });
        if (result) {
            setNombreNuevo('');
            setModoCrear(false);
        }
    }, [nombreNuevo, onCrear]);

    const handleEditar = useCallback(async (id: number) => {
        if (!nombreNuevo.trim()) return;
        const result = await onActualizar(id, { nombre: nombreNuevo.trim() });
        if (result) {
            setNombreNuevo('');
            setModoEditar(null);
        }
    }, [nombreNuevo, onActualizar]);

    const handleEliminar = useCallback(async (id: number) => {
        await onEliminar(id);
    }, [onEliminar]);

    const toggleMenu = useCallback(() => setMenuAbierto(prev => !prev), []);
    const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
    const iniciarCrear = useCallback(() => { setModoCrear(true); setNombreNuevo(''); }, []);
    const iniciarEditar = useCallback((id: number, nombre: string) => { setModoEditar(id); setNombreNuevo(nombre); }, []);

    const etiquetaActiva = entornoActivo ? entornoActivo.nombre : 'Base';

    return {
        menuAbierto, modoCrear, modoEditar, nombreNuevo, refMenu,
        setNombreNuevo,
        handleCrear, handleEditar, handleEliminar,
        toggleMenu, cerrarMenu, iniciarCrear, iniciarEditar,
        etiquetaActiva
    };
}

/*
 * useListaHitos
 * Hook que gestiona el estado y handlers de la lista de hitos de un proyecto.
 * Incluye: ordenamiento por prioridad, CRUD de hitos y menú contextual.
 */

import {useState, useMemo} from 'react';
import type {Hito, NivelPrioridad} from '../../types/dashboard';

interface UseListaHitosParams {
    hitos: Hito[];
    onChange: (hitos: Hito[]) => void;
}

export function useListaHitos({hitos, onChange}: UseListaHitosParams) {
    const [nuevoHitoTexto, setNuevoHitoTexto] = useState('');
    const [mostrandoInput, setMostrandoInput] = useState(false);
    const [menuAbiertoId, setMenuAbiertoId] = useState<number | null>(null);
    const [posicionMenu, setPosicionMenu] = useState({x: 0, y: 0});

    /* Ordenar hitos: no completados primero, luego por prioridad, luego por id */
    const hitosOrdenados = useMemo(() => {
        const prioridadValor: Record<NivelPrioridad, number> = {muy_alta: 5, alta: 4, media: 3, baja: 2, muy_baja: 1};

        return [...hitos].sort((a, b) => {
            if (a.completado !== b.completado) return a.completado ? 1 : -1;
            const valA = prioridadValor[a.prioridad];
            const valB = prioridadValor[b.prioridad];
            if (valA !== valB) return valB - valA;
            return a.id - b.id;
        });
    }, [hitos]);

    const manejarToggle = (id: number) => {
        const nuevosHitos = hitos.map(h => (h.id === id ? {...h, completado: !h.completado} : h));
        onChange(nuevosHitos);
    };

    const manejarCambiarPrioridad = (id: number, nuevaPrioridad: NivelPrioridad) => {
        const nuevosHitos = hitos.map(h => (h.id === id ? {...h, prioridad: nuevaPrioridad} : h));
        onChange(nuevosHitos);
    };

    const manejarEliminar = (id: number) => {
        const nuevosHitos = hitos.filter(h => h.id !== id);
        onChange(nuevosHitos);
    };

    const manejarAgregar = () => {
        if (!nuevoHitoTexto.trim()) {
            setMostrandoInput(false);
            return;
        }

        const nuevoHito: Hito = {
            id: Date.now(),
            titulo: nuevoHitoTexto.trim(),
            completado: false,
            prioridad: 'media'
        };

        onChange([...hitos, nuevoHito]);
        setNuevoHitoTexto('');
    };

    const manejarKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            manejarAgregar();
        } else if (e.key === 'Escape') {
            setMostrandoInput(false);
            setNuevoHitoTexto('');
        }
    };

    const abrirMenuPrioridad = (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setPosicionMenu({x: rect.left, y: rect.bottom + 4});
        setMenuAbiertoId(id);
    };

    const cerrarMenu = () => setMenuAbiertoId(null);

    return {
        nuevoHitoTexto, setNuevoHitoTexto,
        mostrandoInput, setMostrandoInput,
        menuAbiertoId,
        posicionMenu,
        hitosOrdenados,
        manejarToggle,
        manejarCambiarPrioridad,
        manejarEliminar,
        manejarAgregar,
        manejarKeyDown,
        abrirMenuPrioridad,
        cerrarMenu
    };
}

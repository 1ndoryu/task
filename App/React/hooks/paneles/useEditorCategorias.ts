/* [024A-30] Hook para EditorCategorias
 * Gestiona el estado local del editor de categorías:
 * lista editable, pickers de icono/color, validación, guardado.
 * Estrategia: replace-all — se envían todas las categorías al guardar. */

import {useState, useCallback, useRef, useEffect} from 'react';
import type {CategoriaGrupoFb} from '../../stores/gruposFbStore';

export interface CategoriaLocal {
    key: string;
    nombre: string;
    icono: string;
    color: string;
}

export const COLORES_PRESET = [
    '#f59e0b', '#3b82f6', '#10b981', '#f472b6',
    '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16',
    '#f97316', '#6366f1', '#14b8a6', '#e879f9'
];

/* [034A-13] Iconos de categoría como nombres de lucide-react en vez de emojis.
 * Se almacenan como strings (ej: 'megaphone') y el componente los renderiza como SVG. */
export const ICONOS_PRESET = [
    'megaphone', 'monitor', 'users', 'smile', 'briefcase', 'book-open',
    'gamepad-2', 'palette', 'music', 'dumbbell', 'pizza', 'globe',
    'camera', 'home', 'lightbulb', 'wrench', 'target', 'star'
];

let keyCounter = 0;

export function useEditorCategorias(
    categorias: CategoriaGrupoFb[],
    onGuardar: (categorias: Omit<CategoriaGrupoFb, 'id' | 'orden'>[]) => Promise<void>,
    onCerrar: () => void
) {
    const [locales, setLocales] = useState<CategoriaLocal[]>(() =>
        categorias.map(c => ({
            key: `existing-${c.id}`,
            nombre: c.nombre,
            icono: c.icono,
            color: c.color
        }))
    );
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pickerAbierto, setPickerAbierto] = useState<{tipo: 'icono' | 'color'; key: string} | null>(null);
    const refContenedor = useRef<HTMLDivElement>(null);

    /* Cerrar pickers al clickear fuera */
    useEffect(() => {
        if (!pickerAbierto) return;
        const onClickFuera = (e: MouseEvent) => {
            if (refContenedor.current && !refContenedor.current.contains(e.target as Node)) {
                setPickerAbierto(null);
            }
        };
        document.addEventListener('mousedown', onClickFuera);
        return () => document.removeEventListener('mousedown', onClickFuera);
    }, [pickerAbierto]);

    const agregar = useCallback(() => {
        keyCounter++;
        const coloresUsados = new Set(locales.map(c => c.color));
        const colorDisponible = COLORES_PRESET.find(c => !coloresUsados.has(c)) || COLORES_PRESET[0];
        setLocales(prev => [...prev, {
            key: `new-${keyCounter}`,
            nombre: '',
            icono: 'folder',
            color: colorDisponible
        }]);
    }, [locales]);

    const eliminar = useCallback((key: string) => {
        setLocales(prev => prev.filter(c => c.key !== key));
    }, []);

    const actualizar = useCallback((key: string, campo: keyof CategoriaLocal, valor: string) => {
        setLocales(prev => prev.map(c => c.key === key ? {...c, [campo]: valor} : c));
    }, []);

    const mover = useCallback((index: number, direccion: -1 | 1) => {
        setLocales(prev => {
            const nuevo = [...prev];
            const destino = index + direccion;
            if (destino < 0 || destino >= nuevo.length) return prev;
            [nuevo[index], nuevo[destino]] = [nuevo[destino], nuevo[index]];
            return nuevo;
        });
    }, []);

    const togglePicker = useCallback((tipo: 'icono' | 'color', key: string) => {
        setPickerAbierto(prev =>
            prev && prev.tipo === tipo && prev.key === key ? null : {tipo, key}
        );
    }, []);

    const guardar = useCallback(async () => {
        const validas = locales.filter(c => c.nombre.trim());
        if (validas.length === 0) {
            setError('Agrega al menos una categoría con nombre');
            return;
        }

        const nombres = validas.map(c => c.nombre.trim().toLowerCase());
        const duplicados = nombres.filter((n, i) => nombres.indexOf(n) !== i);
        if (duplicados.length > 0) {
            setError(`Nombre duplicado: "${duplicados[0]}"`);
            return;
        }

        setGuardando(true);
        setError(null);

        try {
            await onGuardar(validas.map(c => ({
                nombre: c.nombre.trim(),
                icono: c.icono,
                color: c.color
            })));
            onCerrar();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al guardar');
        } finally {
            setGuardando(false);
        }
    }, [locales, onGuardar, onCerrar]);

    return {
        locales,
        guardando,
        error,
        pickerAbierto,
        refContenedor,
        agregar,
        eliminar,
        actualizar,
        mover,
        togglePicker,
        guardar
    };
}

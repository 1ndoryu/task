/* [024A-17] Hook para configuración de columnas visibles en PanelGruposFb.
 * Persiste en localStorage para que la preferencia sobreviva recargas.
 * Cada columna puede activarse/desactivarse excepto 'nombre' (siempre visible).
 * [024A-18] Incluye estado del dropdown para no sumar useState al componente. */

import {useState, useCallback, useMemo, useRef, useEffect} from 'react';
import {useLocalStorage} from '../useLocalStorage';

export type ColumnId = 'check' | 'imagen' | 'nombre' | 'tipo' | 'miembros' | 'publicaciones' | 'categoria' | 'importancia' | 'acciones';

export interface ColumnaDefinicion {
    id: ColumnId;
    etiqueta: string;
    ancho?: string;
    fija?: boolean;
}

const COLUMNAS: ColumnaDefinicion[] = [
    {id: 'check', etiqueta: 'Publicado', ancho: '32px'},
    {id: 'imagen', etiqueta: 'Imagen', ancho: '40px'},
    {id: 'nombre', etiqueta: 'Grupo', fija: true},
    {id: 'tipo', etiqueta: 'Tipo', ancho: '70px'},
    {id: 'miembros', etiqueta: 'Miembros', ancho: '100px'},
    {id: 'publicaciones', etiqueta: 'Pub/día', ancho: '80px'},
    {id: 'categoria', etiqueta: 'Categoría', ancho: '110px'},
    {id: 'importancia', etiqueta: 'Importancia', ancho: '80px'},
    {id: 'acciones', etiqueta: 'Acciones', ancho: '60px'},
];

type VisibilidadColumnas = Record<ColumnId, boolean>;

const VISIBILIDAD_DEFAULT: VisibilidadColumnas = {
    check: true,
    imagen: true,
    nombre: true,
    tipo: true,
    miembros: true,
    publicaciones: false,
    categoria: true,
    importancia: true,
    acciones: true,
};

const CLAVE_STORAGE = 'gruposFb_columnas';

export function useColumnasGruposFb() {
    const {valor: visibilidad, setValor: setVisibilidad} = useLocalStorage<VisibilidadColumnas>(CLAVE_STORAGE, {
        valorPorDefecto: VISIBILIDAD_DEFAULT,
        validarValor: (v) => typeof v === 'object' && v !== null && 'nombre' in (v as Record<string, unknown>),
    });

    /* Estado del dropdown de columnas (aquí para no añadir useState al componente) */
    const [menuAbierto, setMenuAbierto] = useState(false);
    const refMenu = useRef<HTMLDivElement>(null);

    const toggleMenu = useCallback(() => setMenuAbierto(p => !p), []);

    /* Click outside cierra el dropdown.
     * sentinel-disable-line: MenuContextual no sirve aquí porque cierra al hacer click
     * y necesitamos multi-select (toggle varias columnas sin cerrar). */
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: MouseEvent) => {
            if (refMenu.current && !refMenu.current.contains(e.target as Node)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto]);

    const toggleColumna = useCallback((id: ColumnId) => {
        if (id === 'nombre') return;
        setVisibilidad(prev => ({...prev, [id]: !prev[id]}));
    }, [setVisibilidad]);

    const columnasActivas = useMemo(
        () => COLUMNAS.filter(c => visibilidad[c.id]),
        [visibilidad]
    );

    return {
        columnas: COLUMNAS,
        visibilidad,
        columnasActivas,
        toggleColumna,
        menuAbierto,
        toggleMenu,
        refMenu,
    };
}

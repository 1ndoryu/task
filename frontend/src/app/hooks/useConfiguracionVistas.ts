/*
 * useConfiguracionVistas
 *
 * [318A-2] Hook del Modo Vistas: gestiona las vistas configurables del dashboard.
 *
 * Cada vista es un grid libre de hasta 4 paneles que llenan la pantalla.
 * El estado se persiste en localStorage (clave 'glory_config_vistas') y se
 * sincroniza al servidor vía el sistema de preferencias (CLAVES_PREFERENCIAS),
 * por lo que sobrevive a cambios de navegador/dispositivo sin tocar el backend.
 *
 * Modelo de distribución:
 *  - Una vista tiene `totalColumnas` y `totalFilas` (grid CSS).
 *  - Cada celda ocupa un área (columna, fila, ancho, alto) — celdas fusionables.
 *  - `proporcionesFilas`/`proporcionesColumnas` guardan el % de cada línea
 *    divisoria para el redimensionamiento (ej.: [50,50] = mitad/mitad).
 */

import {useCallback, useEffect, useMemo} from 'react';
import {useLocalStorage} from './useLocalStorage';
import {obtenerIdsPaneles, obtenerPanel} from '../config/registroPaneles';
import type {PanelId} from './useConfiguracionLayout';
import {
    type Vista, type CeldaVista, type ConfiguracionVistas, type VistaNueva,
    MAX_PANELES_VISTA, MAX_COLUMNAS_VISTA, MAX_FILAS_VISTA
} from '../types/vistas';

/* Clave de localStorage (se añade a CLAVES_PREFERENCIAS para persistencia BD) */
export const CLAVE_VISTAS = 'glory_config_vistas';

/* Paneles por defecto de la vista "Principal" (los 4 principales visibles) */
export const PANELES_VISTA_DEFECTO: PanelId[] = ['ejecucion', 'focoPrioritario', 'proyectos', 'scratchpad'];

/* Generar un id único corto */
function generarIdVista(): string {
    return `vista-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* Generar un id de celda único */
function generarIdCelda(): string {
    return `celda-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* Distribución por defecto según cantidad de paneles:
 *  1 → 1x1
 *  2 → 2 columnas (1x2)
 *  3 → 2 arriba + 1 abajo (2 filas, 2 cols; tercero ocupa toda la fila inferior)
 *  4 → 2x2
 * Devuelve las celdas + totalColumnas/totalFilas + proporciones. */
export function crearCeldasDistribucion(paneles: PanelId[]): {celdas: CeldaVista[]; totalColumnas: number; totalFilas: number} {
    const celdas: CeldaVista[] = [];
    const n = Math.min(paneles.length, MAX_PANELES_VISTA);
    const ids = paneles.slice(0, n);

    if (n <= 0) {
        return {celdas, totalColumnas: 1, totalFilas: 1};
    }

    if (n === 1) {
        celdas.push({id: generarIdCelda(), panelId: ids[0], columna: 1, fila: 1, ancho: 1, alto: 1});
        return {celdas, totalColumnas: 1, totalFilas: 1};
    }

    if (n === 2) {
        celdas.push({id: generarIdCelda(), panelId: ids[0], columna: 1, fila: 1, ancho: 1, alto: 1});
        celdas.push({id: generarIdCelda(), panelId: ids[1], columna: 2, fila: 1, ancho: 1, alto: 1});
        return {celdas, totalColumnas: 2, totalFilas: 1};
    }

    if (n === 3) {
        /* 2 arriba + 1 abajo (todo el ancho) */
        celdas.push({id: generarIdCelda(), panelId: ids[0], columna: 1, fila: 1, ancho: 1, alto: 1});
        celdas.push({id: generarIdCelda(), panelId: ids[1], columna: 2, fila: 1, ancho: 1, alto: 1});
        celdas.push({id: generarIdCelda(), panelId: ids[2], columna: 1, fila: 2, ancho: 2, alto: 1});
        return {celdas, totalColumnas: 2, totalFilas: 2};
    }

    /* n === 4: 2x2 */
    celdas.push({id: generarIdCelda(), panelId: ids[0], columna: 1, fila: 1, ancho: 1, alto: 1});
    celdas.push({id: generarIdCelda(), panelId: ids[1], columna: 2, fila: 1, ancho: 1, alto: 1});
    celdas.push({id: generarIdCelda(), panelId: ids[2], columna: 1, fila: 2, ancho: 1, alto: 1});
    celdas.push({id: generarIdCelda(), panelId: ids[3], columna: 2, fila: 2, ancho: 1, alto: 1});
    return {celdas, totalColumnas: 2, totalFilas: 2};
}

/* Crear la vista por defecto */
export function crearVistaDefecto(nombre = 'Principal'): Vista {
    const {celdas, totalColumnas, totalFilas} = crearCeldasDistribucion(PANELES_VISTA_DEFECTO);
    return {
        id: generarIdVista(),
        nombre,
        celdas,
        totalColumnas,
        totalFilas,
        proporcionesFilas: Array.from({length: totalFilas}, () => 1),
        proporcionesColumnas: Array.from({length: totalColumnas}, () => 1)
    };
}

/* Configuración por defecto */
export function crearConfigVistasDefecto(): ConfiguracionVistas {
    const principal = crearVistaDefecto();
    return {
        vistaActivaId: principal.id,
        vistas: [principal]
    };
}

/* Normalizar una vista (migración/saneado): garantiza invariantes:
 *  - máx MAX_PANELES_VISTA celdas
 *  - paneles existentes en el registro (o se descartan)
 *  - totalColumnas/totalFilas válidos
 *  - proporciones con longitud correcta */
function normalizarVista(vista: Partial<Vista> | undefined, panelesRegistrados: string[]): Vista | null {
    if (!vista || !Array.isArray(vista.celdas)) return null;

    const celdas = (vista.celdas as CeldaVista[])
        .filter(c => c && typeof c.panelId === 'string' && panelesRegistrados.includes(c.panelId))
        .slice(0, MAX_PANELES_VISTA)
        .map(c => ({
            id: c.id || generarIdCelda(),
            panelId: c.panelId,
            columna: Math.max(1, Math.min(MAX_COLUMNAS_VISTA, Number(c.columna) || 1)),
            fila: Math.max(1, Math.min(MAX_FILAS_VISTA, Number(c.fila) || 1)),
            ancho: Math.max(1, Math.min(MAX_COLUMNAS_VISTA, Number(c.ancho) || 1)),
            alto: Math.max(1, Math.min(MAX_FILAS_VISTA, Number(c.alto) || 1))
        }));

    if (celdas.length === 0) return null;

    const totalColumnas = Math.max(1, Math.min(MAX_COLUMNAS_VISTA, Number(vista.totalColumnas) || 1));
    const totalFilas = Math.max(1, Math.min(MAX_FILAS_VISTA, Number(vista.totalFilas) || 1));

    const normProporciones = (arr: unknown, len: number): number[] => {
        if (!Array.isArray(arr) || arr.length !== len) return Array.from({length: len}, () => 1);
        return arr.slice(0, len).map((v: unknown) => {
            const num = Number(v);
            return Number.isFinite(num) && num > 0 ? Math.max(0.1, Math.min(10, num)) : 1;
        });
    };

    return {
        id: vista.id || generarIdVista(),
        nombre: typeof vista.nombre === 'string' && vista.nombre.trim() ? vista.nombre.slice(0, 40) : 'Vista',
        celdas,
        totalColumnas,
        totalFilas,
        proporcionesFilas: normProporciones(vista.proporcionesFilas, totalFilas),
        proporcionesColumnas: normProporciones(vista.proporcionesColumnas, totalColumnas)
    };
}

/* Normalizar la configuración completa */
function normalizarConfiguracion(valor: unknown, panelesRegistrados: string[]): ConfiguracionVistas {
    const defecto = crearConfigVistasDefecto();

    if (!valor || typeof valor !== 'object') return defecto;

    const obj = valor as Record<string, unknown>;
    const vistas = Array.isArray(obj.vistas)
        ? (obj.vistas as unknown[]).map(v => normalizarVista(v as Partial<Vista>, panelesRegistrados)).filter((v): v is Vista => v !== null)
        : [];

    if (vistas.length === 0) return defecto;

    /* Si no hay celdas visibles en la vista activa, elegir la primera */
    let vistaActivaId = typeof obj.vistaActivaId === 'string' ? obj.vistaActivaId : defecto.vistaActivaId;
    if (!vistas.some(v => v.id === vistaActivaId)) {
        vistaActivaId = vistas[0].id;
    }

    return {vistaActivaId, vistas};
}

export function useConfiguracionVistas() {
    const panelesRegistrados = useMemo(() => obtenerIdsPaneles(), []);

    const configDefecto = useMemo(() => crearConfigVistasDefecto(), []);

    const {valor, setValor} = useLocalStorage<ConfiguracionVistas>(CLAVE_VISTAS, {
        valorPorDefecto: configDefecto
    });

    const configuracionNormalizada = useMemo(() => {
        return normalizarConfiguracion(valor, panelesRegistrados);
    }, [valor, panelesRegistrados]);

    /* Persistir normalización SOLO si la migración reparó algo real.
     * [318A-2] Comparación profunda: `normalizarConfiguracion` crea un objeto
     * nuevo cada vez, por lo que una comparación por referencia (`!==`)
     * causaría un loop infinito de setValor → useEffect → setValor
     * ("Maximum update depth exceeded"). */
    const requierePersistir = useMemo(() => {
        return JSON.stringify(configuracionNormalizada) !== JSON.stringify(valor);
    }, [configuracionNormalizada, valor]);

    useEffect(() => {
        if (requierePersistir) {
            setValor(configuracionNormalizada);
        }
    }, [requierePersistir, configuracionNormalizada, setValor]);

    const vistas = configuracionNormalizada.vistas;
    const vistaActiva = useMemo(
        () => vistas.find(v => v.id === configuracionNormalizada.vistaActivaId) || vistas[0],
        [vistas, configuracionNormalizada.vistaActivaId]
    );

    /* Seleccionar vista activa */
    const seleccionarVista = useCallback((vistaId: string) => {
        setValor(prev => ({...prev, vistaActivaId: vistaId}));
    }, [setValor]);

    /* Crear una vista nueva a partir de una lista de paneles */
    const crearVista = useCallback(({nombre, paneles}: VistaNueva): string => {
        const nueva = crearVistaDefecto(nombre || 'Nueva vista');
        const {celdas, totalColumnas, totalFilas} = crearCeldasDistribucion(paneles);
        nueva.celdas = celdas;
        nueva.totalColumnas = totalColumnas;
        nueva.totalFilas = totalFilas;
        nueva.proporcionesFilas = Array.from({length: totalFilas}, () => 1);
        nueva.proporcionesColumnas = Array.from({length: totalColumnas}, () => 1);

        setValor(prev => ({
            vistaActivaId: nueva.id,
            vistas: [...prev.vistas, nueva]
        }));
        return nueva.id;
    }, [setValor]);

    /* Renombrar una vista */
    const renombrarVista = useCallback((vistaId: string, nombre: string) => {
        setValor(prev => ({
            ...prev,
            vistas: prev.vistas.map(v => v.id === vistaId ? {...v, nombre: nombre.slice(0, 40) || v.nombre} : v)
        }));
    }, [setValor]);

    /* Eliminar una vista (mín 1 vista) */
    const eliminarVista = useCallback((vistaId: string) => {
        setValor(prev => {
            if (prev.vistas.length <= 1) return prev;
            const restantes = prev.vistas.filter(v => v.id !== vistaId);
            const nuevaActiva = prev.vistaActivaId === vistaId ? restantes[0].id : prev.vistaActivaId;
            return {vistaActivaId: nuevaActiva, vistas: restantes};
        });
    }, [setValor]);

    /* Duplicar una vista */
    const duplicarVista = useCallback((vistaId: string) => {
        setValor(prev => {
            const origen = prev.vistas.find(v => v.id === vistaId);
            if (!origen) return prev;
            const copia: Vista = {
                ...origen,
                id: generarIdVista(),
                nombre: `${origen.nombre} (copia)`,
                celdas: origen.celdas.map(c => ({...c, id: generarIdCelda()}))
            };
            return {vistaActivaId: copia.id, vistas: [...prev.vistas, copia]};
        });
    }, [setValor]);

    /* Elegir qué panel muestra una celda */
    const cambiarPanelCelda = useCallback((vistaId: string, celdaId: string, panelId: PanelId) => {
        setValor(prev => ({
            ...prev,
            vistas: prev.vistas.map(v => {
                if (v.id !== vistaId) return v;
                return {
                    ...v,
                    celdas: v.celdas.map(c => c.id === celdaId ? {...c, panelId} : c)
                };
            })
        }));
    }, [setValor]);

    /* Añadir un panel a la vista (máx 4) — agrega una celda en la primera
     * posición libre del grid */
    const agregarPanelVista = useCallback((vistaId: string, panelId: PanelId) => {
        setValor(prev => ({
            ...prev,
            vistas: prev.vistas.map(v => {
                if (v.id !== vistaId) return v;
                if (v.celdas.length >= MAX_PANELES_VISTA) return v;
                if (v.celdas.some(c => c.panelId === panelId)) return v;
                /* Recalcular distribución con los paneles actuales + el nuevo */
                const paneles = [...v.celdas.map(c => c.panelId), panelId];
                const {celdas, totalColumnas, totalFilas} = crearCeldasDistribucion(paneles);
                return {
                    ...v,
                    celdas,
                    totalColumnas,
                    totalFilas,
                    proporcionesFilas: Array.from({length: totalFilas}, () => 1),
                    proporcionesColumnas: Array.from({length: totalColumnas}, () => 1)
                };
            })
        }));
    }, [setValor]);

    /* Quitar un panel de la vista (mín 1 panel) */
    const quitarPanelVista = useCallback((vistaId: string, panelId: PanelId) => {
        setValor(prev => ({
            ...prev,
            vistas: prev.vistas.map(v => {
                if (v.id !== vistaId) return v;
                if (v.celdas.length <= 1) return v;
                const paneles = v.celdas.filter(c => c.panelId !== panelId).map(c => c.panelId);
                const {celdas, totalColumnas, totalFilas} = crearCeldasDistribucion(paneles);
                return {
                    ...v,
                    celdas,
                    totalColumnas,
                    totalFilas,
                    proporcionesFilas: Array.from({length: totalFilas}, () => 1),
                    proporcionesColumnas: Array.from({length: totalColumnas}, () => 1)
                };
            })
        }));
    }, [setValor]);

    /* Reordenar paneles de la vista: intercambia el panel de la celda origen
     * con el de la celda destino (o mueve si el destino está vacío). */
    const moverPanelVista = useCallback((vistaId: string, celdaOrigenId: string, celdaDestinoId: string) => {
        setValor(prev => ({
            ...prev,
            vistas: prev.vistas.map(v => {
                if (v.id !== vistaId) return v;
                const origen = v.celdas.find(c => c.id === celdaOrigenId);
                const destino = v.celdas.find(c => c.id === celdaDestinoId);
                if (!origen || !destino || origen.id === destino.id) return v;
                return {
                    ...v,
                    celdas: v.celdas.map(c => {
                        if (c.id === origen.id) return {...c, panelId: destino.panelId};
                        if (c.id === destino.id) return {...c, panelId: origen.panelId};
                        return c;
                    })
                };
            })
        }));
    }, [setValor]);

    /* Actualizar proporciones de filas (redimensionamiento) */
    const ajustarProporcionesFilas = useCallback((vistaId: string, nuevasProporciones: number[]) => {
        setValor(prev => ({
            ...prev,
            vistas: prev.vistas.map(v => v.id === vistaId ? {...v, proporcionesFilas: nuevasProporciones} : v)
        }));
    }, [setValor]);

    /* Actualizar proporciones de columnas (redimensionamiento) */
    const ajustarProporcionesColumnas = useCallback((vistaId: string, nuevasProporciones: number[]) => {
        setValor(prev => ({
            ...prev,
            vistas: prev.vistas.map(v => v.id === vistaId ? {...v, proporcionesColumnas: nuevasProporciones} : v)
        }));
    }, [setValor]);

    /* Restablecer la distribución de una vista a su default */
    const restablecerDistribucionVista = useCallback((vistaId: string) => {
        setValor(prev => ({
            ...prev,
            vistas: prev.vistas.map(v => {
                if (v.id !== vistaId) return v;
                const paneles = v.celdas.map(c => c.panelId);
                const {celdas, totalColumnas, totalFilas} = crearCeldasDistribucion(paneles);
                return {
                    ...v,
                    celdas,
                    totalColumnas,
                    totalFilas,
                    proporcionesFilas: Array.from({length: totalFilas}, () => 1),
                    proporcionesColumnas: Array.from({length: totalColumnas}, () => 1)
                };
            })
        }));
    }, [setValor]);

    /* Obtener paneles disponibles (no usados en la vista) para añadir */
    const obtenerPanelesDisponiblesVista = useCallback((vistaId: string): PanelId[] => {
        const vista = vistas.find(v => v.id === vistaId);
        const usados = new Set(vista?.celdas.map(c => c.panelId) ?? []);
        return panelesRegistrados.filter(id => !usados.has(id));
    }, [vistas, panelesRegistrados]);

    return {
        configuracion: configuracionNormalizada,
        vistas,
        vistaActiva,
        seleccionarVista,
        crearVista,
        renombrarVista,
        eliminarVista,
        duplicarVista,
        cambiarPanelCelda,
        agregarPanelVista,
        quitarPanelVista,
        moverPanelVista,
        ajustarProporcionesFilas,
        ajustarProporcionesColumnas,
        restablecerDistribucionVista,
        obtenerPanelesDisponiblesVista,
        MAX_PANELES_VISTA
    };
}

export type UseConfiguracionVistas = ReturnType<typeof useConfiguracionVistas>;

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
import {obtenerIdsPaneles} from '../config/registroPaneles';
import type {PanelId} from './useConfiguracionLayout';
import type {ConfiguracionVistas, VistaNueva, Vista} from '../types/vistas';
import {MAX_PANELES_VISTA} from '../types/vistas';
/* [029A-1] Lógica pura en vistasDistribucion.ts (limite-lineas). Se re-exporta
 * para no romper imports existentes (DashboardIsland importa el default). */
import {
    CLAVE_VISTAS, PANELES_VISTA_DEFECTO, crearCeldasDistribucion, crearConfigVistasDefecto,
    crearVistaDefecto, generarIdCelda, generarIdVista, normalizarConfiguracion
} from './vistasDistribucion';
export {CLAVE_VISTAS, PANELES_VISTA_DEFECTO, crearCeldasDistribucion, crearConfigVistasDefecto, crearVistaDefecto};

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

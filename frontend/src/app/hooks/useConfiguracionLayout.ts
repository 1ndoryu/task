/*
 * useConfiguracionLayout
 * Hook para manejar la configuración del layout del dashboard
 * Modo de columnas, anchos personalizados, paneles visibles y orden de paneles
 *
 * Refactor OCP - Fase 2: Ahora usa el registro de paneles para configuración dinámica
 */

import {useLocalStorage} from './useLocalStorage';
import {useCallback, useEffect, useMemo} from 'react';
import {obtenerIdsPaneles, obtenerIdBase} from '../config/registroPaneles';
import type {ModoColumnas, OrdenPanel, AnchoColumnas, ConfiguracionLayout, TipoLayout} from '../types/paneles';
import {generarConfigLayoutDefecto, generarOrdenPanelesDefecto, PRESETS_ANCHOS, ANCHO_MINIMO_COLUMNA, ANCHO_MAXIMO_COLUMNA} from '../utils/layoutFactory';
import {migrarConfiguracion, reordenarPanelEn, moverPanelEn, moverPanelAColumnaEn, crearDuplicadoPanel, eliminarPanelDuplicado, crearDivisionPanel} from '../utils/layoutLogica';
import {sanitizarAltura} from '../utils/alturasPanel';

/* Re-exportar tipos para compatibilidad hacia atrás */
export type {ModoColumnas, OrdenPanel, AnchoColumnas, ConfiguracionLayout, TipoLayout} from '../types/paneles';

/*
 * PanelId ahora es string para permitir paneles dinámicos
 * Los paneles válidos se determinan en runtime desde el registro
 */
export type PanelId = string;

/* Configuración de visibilidad de paneles (ahora dinámica) */
export type VisibilidadPaneles = Record<string, boolean>;

/* Configuración de alturas de paneles (ahora dinámica) */
export type AlturasPaneles = Record<string, string>;

/*
 * Re-exportar constantes y funciones desde el factory
 * Mantiene compatibilidad hacia atrás
 */
export {ANCHO_MINIMO_COLUMNA, ANCHO_MAXIMO_COLUMNA, PRESETS_ANCHOS} from '../utils/layoutFactory';

export {obtenerOrdenPanelesDefecto, obtenerConfigLayoutDefecto, ORDEN_PANELES_DEFECTO, CONFIG_LAYOUT_DEFECTO} from '../utils/layoutFactory';

/*
 * Obtener lista de todos los paneles registrados
 * Reemplaza la constante hardcodeada TODOS_LOS_PANELES
 */
export function obtenerTodosLosPaneles(): string[] {
    return obtenerIdsPaneles();
}

/* Para compatibilidad hacia atrás, exportamos como constante que se evalúa dinámicamente */
export const TODOS_LOS_PANELES: string[] = [];

export function useConfiguracionLayout() {
    /* Obtener configuración por defecto dinámicamente */
    const configDefecto = useMemo(() => generarConfigLayoutDefecto(), []);
    const ordenDefecto = useMemo(() => generarOrdenPanelesDefecto(), []);
    const todosLosPaneles = useMemo(() => obtenerIdsPaneles(), []);

    const {valor, setValor} = useLocalStorage<ConfiguracionLayout>('glory_config_layout', {
        valorPorDefecto: configDefecto
    });

    /*
     * Migración automática delegada a lógica pura
     */
    const configuracionNormalizada = useMemo(() => {
        return migrarConfiguracion(valor, todosLosPaneles);
    }, [valor, todosLosPaneles]);

    /*
     * [30-08-2026] Persistir la normalización: si la migración reparó algo
     * (p. ej. alturas corruptas tipo "2px" que colapsan el panel), devuelve un
     * objeto distinto y lo guardamos de vuelta en localStorage. migrarConfiguracion
     * devuelve la misma referencia cuando no hay cambios, así este efecto no
     * entra en loop de escrituras.
     */
    useEffect(() => {
        if (configuracionNormalizada !== valor) {
            setValor(configuracionNormalizada);
        }
    }, [configuracionNormalizada, valor, setValor]);

    /* Cambiar modo de columnas (1, 2 o 3) */
    const cambiarModoColumnas = useCallback(
        (modo: ModoColumnas) => {
            setValor(prev => {
                /* Al cambiar modo, redistribuir paneles según preset */
                const nuevoOrden = ordenDefecto[modo].map(preset => {
                    /* Mantener visibilidad del panel actual */
                    const panelActual = prev.ordenPaneles?.find(p => p.id === preset.id);
                    return panelActual ? {...preset} : preset;
                });

                return {
                    ...prev,
                    modoColumnas: modo,
                    anchos: PRESETS_ANCHOS[modo],
                    ordenPaneles: nuevoOrden
                };
            });
        },
        [setValor, ordenDefecto]
    );

    /* Ajustar ancho de una columna específica */
    const ajustarAnchoColumna = useCallback(
        (columna: keyof AnchoColumnas, ancho: number) => {
            const anchoValidado = Math.min(Math.max(ancho, ANCHO_MINIMO_COLUMNA), ANCHO_MAXIMO_COLUMNA);
            setValor(prev => ({
                ...prev,
                anchos: {
                    ...prev.anchos,
                    [columna]: anchoValidado
                }
            }));
        },
        [setValor]
    );

    /* Ajustar múltiples anchos a la vez (para resize handles) */
    const ajustarAnchos = useCallback(
        (nuevosAnchos: Partial<AnchoColumnas>) => {
            setValor(prev => {
                const anchosActualizados = {...prev.anchos};
                Object.entries(nuevosAnchos).forEach(([columna, ancho]) => {
                    if (ancho !== undefined) {
                        anchosActualizados[columna as keyof AnchoColumnas] = Math.min(Math.max(ancho, ANCHO_MINIMO_COLUMNA), ANCHO_MAXIMO_COLUMNA);
                    }
                });
                return {...prev, anchos: anchosActualizados};
            });
        },
        [setValor]
    );

    /* Toggle de visibilidad de un panel */
    const toggleVisibilidadPanel = useCallback(
        (panel: PanelId) => {
            setValor(prev => ({
                ...prev,
                visibilidad: {
                    ...prev.visibilidad,
                    [panel]: !prev.visibilidad[panel]
                }
            }));
        },
        [setValor]
    );

    /* Mostrar un panel oculto */
    const mostrarPanel = useCallback(
        (panel: PanelId) => {
            setValor(prev => ({
                ...prev,
                visibilidad: {
                    ...prev.visibilidad,
                    [panel]: true
                }
            }));
        },
        [setValor]
    );

    /* Ocultar un panel */
    const ocultarPanel = useCallback(
        (panel: PanelId) => {
            setValor(prev => {
                /* [19-08-2026] Un panel dividido/duplicado (id con sufijo -N) no
                 * debe poder ocultarse: sin presencia en la lista base desaparecería
                 * de todos lados y el flag de división quedaría huérfano, bloqueando
                 * futuras divisiones. Ocultar un duplicado equivale a cerrarlo. */
                if (panel !== obtenerIdBase(panel)) {
                    return eliminarPanelDuplicado(prev, panel);
                }
                return {
                    ...prev,
                    visibilidad: {
                        ...prev.visibilidad,
                        [panel]: false
                    }
                };
            });
        },
        [setValor]
    );

    /*
     * Reordenar un panel a una nueva posición y/o columna
     * Recalcula las posiciones de todos los paneles afectados
     */
    const reordenarPanel = useCallback(
        (panelId: PanelId, nuevaColumna: 1 | 2 | 3, nuevaPosicion: number) => {
            setValor(prev => reordenarPanelEn(prev, ordenDefecto, panelId, nuevaColumna, nuevaPosicion));
        },
        [setValor, ordenDefecto]
    );

    /* Mover un panel una posición hacia arriba dentro de su columna */
    const moverPanelArriba = useCallback(
        (panelId: PanelId) => setValor(prev => moverPanelEn(prev, ordenDefecto, panelId, -1)),
        [setValor, ordenDefecto]
    );

    /* Mover un panel una posición hacia abajo dentro de su columna */
    const moverPanelAbajo = useCallback(
        (panelId: PanelId) => setValor(prev => moverPanelEn(prev, ordenDefecto, panelId, +1)),
        [setValor, ordenDefecto]
    );

    /* Cambiar un panel a otra columna (al final de esa columna) */
    const moverPanelAColumna = useCallback(
        (panelId: PanelId, columnaDestino: 1 | 2 | 3) => {
            setValor(prev => moverPanelAColumnaEn(prev, ordenDefecto, panelId, columnaDestino));
        },
        [setValor, ordenDefecto]
    );

    /*
     * Obtener paneles de una columna específica, ordenados por posición
     * Retorna solo los IDs de paneles visibles
     */
    const obtenerPanelesColumna = useCallback(
        (columna: 1 | 2 | 3): PanelId[] => {
            const orden = configuracionNormalizada.ordenPaneles || ordenDefecto[configuracionNormalizada.modoColumnas];

            return orden
                .filter(p => p.columna === columna && configuracionNormalizada.visibilidad[p.id])
                .sort((a, b) => a.posicion - b.posicion)
                .map(p => p.id);
        },
        [configuracionNormalizada, ordenDefecto]
    );

    /* Obtener información completa de orden de un panel */
    const obtenerOrdenPanel = useCallback(
        (panelId: PanelId): OrdenPanel | undefined => {
            const orden = configuracionNormalizada.ordenPaneles || ordenDefecto[configuracionNormalizada.modoColumnas];
            return orden.find(p => p.id === panelId);
        },
        [configuracionNormalizada, ordenDefecto]
    );

    /* Restaurar orden por defecto para el modo actual */
    const resetearOrdenPaneles = useCallback(() => {
        setValor(prev => ({
            ...prev,
            ordenPaneles: ordenDefecto[prev.modoColumnas]
        }));
    }, [setValor, ordenDefecto]);

    /* Reset a configuración por defecto */
    const resetearLayout = useCallback(() => {
        setValor(configDefecto);
    }, [setValor, configDefecto]);

    /* [263A-3] Duplicar un panel: crea una instancia con ID sufijo (e.g., scratchpad-1) */
    const duplicarPanel = useCallback(
        (baseId: string) => {
            setValor(prev => crearDuplicadoPanel(prev, baseId, ordenDefecto));
        },
        [setValor, ordenDefecto]
    );

    /* Dividir un panel lado a lado dentro de la misma columna */
    const dividirPanel = useCallback(
        (baseId: string) => {
            setValor(prev => crearDivisionPanel(prev, baseId));
        },
        [setValor]
    );

    /* [263A-3] Cerrar (eliminar) un panel duplicado del layout */
    const cerrarPanelDuplicado = useCallback(
        (instanceId: string) => {
            setValor(prev => eliminarPanelDuplicado(prev, instanceId));
        },
        [setValor]
    );

    /* Cambiar altura de un panel específico */
    const cambiarAlturaPanel = useCallback(
        (panel: PanelId, altura: string) => {
            /* [30-08-2026] Nunca persistir alturas inválidas: sanitizarAltura
             * sube al mínimo (120px) valores corruptos tipo "2px" que colapsan
             * el panel a una franja invisible. */
            const alturaSegura = sanitizarAltura(altura);
            setValor(prev => ({
                ...prev,
                alturas: {
                    ...(prev.alturas || configDefecto.alturas),
                    [panel]: alturaSegura
                }
            }));
        },
        [setValor, configDefecto.alturas]
    );

    /* Obtener altura de un panel */
    const obtenerAlturaPanel = useCallback(
        (panel: PanelId): string => {
            const altura = configuracionNormalizada.alturas?.[panel] || configDefecto.alturas[panel] || 'auto';
            return sanitizarAltura(altura);
        },
        [configuracionNormalizada, configDefecto.alturas]
    );

    /* Obtener paneles ocultos */
    const panelesOcultos = Object.entries(configuracionNormalizada.visibilidad)
        .filter(([, visible]) => !visible)
        .map(([panel]) => panel as PanelId);

    /* Obtener cantidad de paneles visibles */
    const cantidadPanelesVisibles = Object.values(configuracionNormalizada.visibilidad).filter(Boolean).length;

    /* [300A-1] Cambiar tipo de layout (grid ↔ sidebar) */
    const cambiarTipoLayout = useCallback(
        (tipo: TipoLayout) => {
            setValor(prev => ({
                ...prev,
                tipoLayout: tipo
            }));
        },
        [setValor]
    );

    /* Cambiar ancho total del grid */
    const cambiarAnchoTotal = useCallback(
        (ancho: number) => {
            const anchoValidado = Math.min(100, Math.max(60, ancho));
            setValor(prev => ({
                ...prev,
                anchoTotal: anchoValidado
            }));
        },
        [setValor]
    );

    return {
        configuracion: configuracionNormalizada,
        tipoLayout: configuracionNormalizada.tipoLayout || 'grid',
        modoColumnas: configuracionNormalizada.modoColumnas,
        anchos: configuracionNormalizada.anchos,
        anchoTotal: configuracionNormalizada.anchoTotal ?? 100,
        visibilidad: configuracionNormalizada.visibilidad,
        ordenPaneles: configuracionNormalizada.ordenPaneles,
        alturas: configuracionNormalizada.alturas || configDefecto.alturas,
        panelesOcultos,
        cantidadPanelesVisibles,
        cambiarModoColumnas,
        ajustarAnchoColumna,
        ajustarAnchos,
        cambiarAnchoTotal,
        toggleVisibilidadPanel,
        mostrarPanel,
        ocultarPanel,
        reordenarPanel,
        moverPanelArriba,
        moverPanelAbajo,
        moverPanelAColumna,
        obtenerPanelesColumna,
        obtenerOrdenPanel,
        resetearOrdenPaneles,
        resetearLayout,
        duplicarPanel,
        dividirPanel,
        cerrarPanelDuplicado,
        cambiarAlturaPanel,
        obtenerAlturaPanel,
        cambiarTipoLayout,
        actualizarConfiguracion: setValor
    };
}

/*
 * useConfiguracionLayout
 * Hook para manejar la configuración del layout del dashboard
 * Modo de columnas, anchos personalizados, paneles visibles y orden de paneles
 *
 * Refactor OCP - Fase 2: Ahora usa el registro de paneles para configuración dinámica
 */

import {useLocalStorage} from './useLocalStorage';
import {useCallback, useMemo} from 'react';
import {obtenerIdsPaneles, generarVisibilidadDefecto, generarAlturasDefecto, generarOrdenDefecto} from '../config/registroPaneles';
import type {ModoColumnas, OrdenPanel, AnchoColumnas, ConfiguracionLayout} from '../types/paneles';

/* Re-exportar tipos para compatibilidad hacia atrás */
export type {ModoColumnas, OrdenPanel, AnchoColumnas, ConfiguracionLayout} from '../types/paneles';

/*
 * PanelId ahora es string para permitir paneles dinámicos
 * Los paneles válidos se determinan en runtime desde el registro
 */
export type PanelId = string;

/* Configuración de visibilidad de paneles (ahora dinámica) */
export type VisibilidadPaneles = Record<string, boolean>;

/* Configuración de alturas de paneles (ahora dinámica) */
export type AlturasPaneles = Record<string, string>;

/* Valores por defecto */
export const ANCHO_MINIMO_COLUMNA = 20;
export const ANCHO_MAXIMO_COLUMNA = 60;

/*
 * Obtener lista de todos los paneles registrados
 * Reemplaza la constante hardcodeada TODOS_LOS_PANELES
 */
export function obtenerTodosLosPaneles(): string[] {
    return obtenerIdsPaneles();
}

/* Para compatibilidad hacia atrás, exportamos como constante que se evalúa dinámicamente */
export const TODOS_LOS_PANELES: string[] = [];

/*
 * Generar orden por defecto desde el registro
 * Reemplaza ORDEN_PANELES_DEFECTO hardcodeado
 */
function generarOrdenPanelesDefecto(): Record<ModoColumnas, OrdenPanel[]> {
    return {
        1: generarOrdenDefecto(1),
        2: generarOrdenDefecto(2),
        3: generarOrdenDefecto(3)
    };
}

/*
 * Generar configuración por defecto desde el registro
 * Reemplaza CONFIG_LAYOUT_DEFECTO hardcodeado
 */
function generarConfigLayoutDefecto(): ConfiguracionLayout {
    return {
        modoColumnas: 2,
        anchos: {
            columna1: 58,
            columna2: 42,
            columna3: 0
        },
        anchoTotal: 100,
        visibilidad: generarVisibilidadDefecto(),
        ordenPaneles: generarOrdenDefecto(2),
        alturas: generarAlturasDefecto()
    };
}

/* Presets de anchos según modo de columnas */
export const PRESETS_ANCHOS: Record<ModoColumnas, AnchoColumnas> = {
    1: {columna1: 100, columna2: 0, columna3: 0},
    2: {columna1: 58, columna2: 42, columna3: 0},
    3: {columna1: 35, columna2: 35, columna3: 30}
};

/*
 * Exportaciones para compatibilidad hacia atrás
 * Estas se calculan dinámicamente en el primer uso
 */
let _ordenPanelesDefectoCache: Record<ModoColumnas, OrdenPanel[]> | null = null;
let _configLayoutDefectoCache: ConfiguracionLayout | null = null;

export function obtenerOrdenPanelesDefecto(): Record<ModoColumnas, OrdenPanel[]> {
    if (!_ordenPanelesDefectoCache) {
        _ordenPanelesDefectoCache = generarOrdenPanelesDefecto();
    }
    return _ordenPanelesDefectoCache;
}

export function obtenerConfigLayoutDefecto(): ConfiguracionLayout {
    if (!_configLayoutDefectoCache) {
        _configLayoutDefectoCache = generarConfigLayoutDefecto();
    }
    return _configLayoutDefectoCache;
}

/*
 * Alias para compatibilidad hacia atrás (deprecated)
 * Usar las funciones obtenerOrdenPanelesDefecto() y obtenerConfigLayoutDefecto() en su lugar
 *
 * Nota: Estos se evalúan de forma lazy al primer acceso
 */
export const ORDEN_PANELES_DEFECTO: Record<ModoColumnas, OrdenPanel[]> = {
    get 1() {
        return obtenerOrdenPanelesDefecto()[1];
    },
    get 2() {
        return obtenerOrdenPanelesDefecto()[2];
    },
    get 3() {
        return obtenerOrdenPanelesDefecto()[3];
    }
};

export const CONFIG_LAYOUT_DEFECTO: ConfiguracionLayout = {
    get modoColumnas() {
        return obtenerConfigLayoutDefecto().modoColumnas;
    },
    get anchos() {
        return obtenerConfigLayoutDefecto().anchos;
    },
    get anchoTotal() {
        return obtenerConfigLayoutDefecto().anchoTotal;
    },
    get visibilidad() {
        return obtenerConfigLayoutDefecto().visibilidad;
    },
    get ordenPaneles() {
        return obtenerConfigLayoutDefecto().ordenPaneles;
    },
    get alturas() {
        return obtenerConfigLayoutDefecto().alturas;
    }
};

export function useConfiguracionLayout() {
    /* Obtener configuración por defecto dinámicamente */
    const configDefecto = useMemo(() => generarConfigLayoutDefecto(), []);
    const ordenDefecto = useMemo(() => generarOrdenPanelesDefecto(), []);
    const todosLosPaneles = useMemo(() => obtenerIdsPaneles(), []);

    const {valor, setValor} = useLocalStorage<ConfiguracionLayout>('glory_config_layout', {
        valorPorDefecto: configDefecto
    });

    /*
     * Migración automática: asegura compatibilidad con usuarios existentes
     * - Si no existe ordenPaneles, generarlo
     * - Si no existen alturas, usar valores por defecto
     * - Si hay paneles nuevos en el registro, agregarlos
     */
    const configuracionNormalizada = useMemo(() => {
        let config = {...valor};

        /* Migrar ordenPaneles si no existe */
        if (!config.ordenPaneles || config.ordenPaneles.length === 0) {
            config = {
                ...config,
                ordenPaneles: ordenDefecto[config.modoColumnas]
            };
        }

        /* Verificar que todos los paneles del registro existan en el orden */
        const panelesExistentes = new Set(config.ordenPaneles.map(p => p.id));
        const panelesFaltantes = todosLosPaneles.filter(id => !panelesExistentes.has(id));

        if (panelesFaltantes.length > 0) {
            const ultimaPosicion = Math.max(...config.ordenPaneles.filter(p => p.columna === 1).map(p => p.posicion), -1);
            const panelesNuevos = panelesFaltantes.map((id, idx) => ({
                id,
                columna: 1 as const,
                posicion: ultimaPosicion + 1 + idx
            }));
            config = {
                ...config,
                ordenPaneles: [...config.ordenPaneles, ...panelesNuevos]
            };
        }

        /* Migrar visibilidad para paneles nuevos */
        const visibilidadDefecto = generarVisibilidadDefecto();
        const visibilidadActualizada = {...config.visibilidad};
        todosLosPaneles.forEach(id => {
            if (visibilidadActualizada[id] === undefined) {
                visibilidadActualizada[id] = visibilidadDefecto[id] ?? false;
            }
        });
        config = {...config, visibilidad: visibilidadActualizada};

        /* Migrar alturas si no existen o faltan paneles */
        const alturasDefecto = generarAlturasDefecto();
        if (!config.alturas) {
            config = {...config, alturas: alturasDefecto};
        } else {
            const alturasActualizadas = {...config.alturas};
            todosLosPaneles.forEach(id => {
                if (alturasActualizadas[id] === undefined) {
                    alturasActualizadas[id] = alturasDefecto[id] ?? 'auto';
                }
            });
            config = {...config, alturas: alturasActualizadas};
        }

        /* Migrar anchoTotal si no existe */
        if (config.anchoTotal === undefined) {
            config = {
                ...config,
                anchoTotal: configDefecto.anchoTotal
            };
        }

        return config;
    }, [valor, ordenDefecto, todosLosPaneles, configDefecto]);

    /*
     * Normalizar posiciones dentro de una columna
     * Asegura que las posiciones sean consecutivas (0, 1, 2...)
     */
    const normalizarPosiciones = useCallback((paneles: OrdenPanel[]): OrdenPanel[] => {
        const porColumna: Record<number, OrdenPanel[]> = {1: [], 2: [], 3: []};

        paneles.forEach(p => {
            porColumna[p.columna].push(p);
        });

        /* Ordenar cada columna por posición y reasignar índices */
        const resultado: OrdenPanel[] = [];
        [1, 2, 3].forEach(col => {
            porColumna[col]
                .sort((a, b) => a.posicion - b.posicion)
                .forEach((panel, idx) => {
                    resultado.push({...panel, posicion: idx});
                });
        });

        return resultado;
    }, []);

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
            setValor(prev => ({
                ...prev,
                visibilidad: {
                    ...prev.visibilidad,
                    [panel]: false
                }
            }));
        },
        [setValor]
    );

    /*
     * Reordenar un panel a una nueva posición y/o columna
     * Recalcula las posiciones de todos los paneles afectados
     */
    const reordenarPanel = useCallback(
        (panelId: PanelId, nuevaColumna: 1 | 2 | 3, nuevaPosicion: number) => {
            /* Usar configuracionNormalizada para asegurar que paneles migrados esten incluidos */
            const paneles = [...configuracionNormalizada.ordenPaneles];
            const indicePanel = paneles.findIndex(p => p.id === panelId);

            if (indicePanel === -1) return;

            const panelActual = paneles[indicePanel];

            /* Remover panel de su posición actual */
            paneles.splice(indicePanel, 1);

            /* Ajustar posiciones en la columna origen */
            paneles
                .filter(p => p.columna === panelActual.columna && p.posicion > panelActual.posicion)
                .forEach(p => {
                    p.posicion--;
                });

            /* Ajustar posiciones en la columna destino para hacer espacio */
            paneles
                .filter(p => p.columna === nuevaColumna && p.posicion >= nuevaPosicion)
                .forEach(p => {
                    p.posicion++;
                });

            /* Insertar panel en nueva posición */
            paneles.push({
                id: panelId,
                columna: nuevaColumna,
                posicion: nuevaPosicion
            });

            setValor(prev => ({
                ...prev,
                ordenPaneles: normalizarPosiciones(paneles)
            }));
        },
        [setValor, normalizarPosiciones, configuracionNormalizada.ordenPaneles]
    );

    /* Mover un panel una posición hacia arriba dentro de su columna */
    const moverPanelArriba = useCallback(
        (panelId: PanelId) => {
            setValor(prev => {
                const paneles = [...(prev.ordenPaneles || ordenDefecto[prev.modoColumnas])];
                const panel = paneles.find(p => p.id === panelId);

                if (!panel || panel.posicion === 0) return prev;

                /* Encontrar el panel que está arriba */
                const panelArriba = paneles.find(p => p.columna === panel.columna && p.posicion === panel.posicion - 1);

                if (!panelArriba) return prev;

                /* Intercambiar posiciones */
                const nuevasPosiciones = paneles.map(p => {
                    if (p.id === panelId) return {...p, posicion: p.posicion - 1};
                    if (p.id === panelArriba.id) return {...p, posicion: p.posicion + 1};
                    return p;
                });

                return {...prev, ordenPaneles: nuevasPosiciones};
            });
        },
        [setValor, ordenDefecto]
    );

    /* Mover un panel una posición hacia abajo dentro de su columna */
    const moverPanelAbajo = useCallback(
        (panelId: PanelId) => {
            setValor(prev => {
                const paneles = [...(prev.ordenPaneles || ordenDefecto[prev.modoColumnas])];
                const panel = paneles.find(p => p.id === panelId);

                if (!panel) return prev;

                /* Encontrar máxima posición en esta columna */
                const maxPosicion = Math.max(...paneles.filter(p => p.columna === panel.columna).map(p => p.posicion));

                if (panel.posicion >= maxPosicion) return prev;

                /* Encontrar el panel que está abajo */
                const panelAbajo = paneles.find(p => p.columna === panel.columna && p.posicion === panel.posicion + 1);

                if (!panelAbajo) return prev;

                /* Intercambiar posiciones */
                const nuevasPosiciones = paneles.map(p => {
                    if (p.id === panelId) return {...p, posicion: p.posicion + 1};
                    if (p.id === panelAbajo.id) return {...p, posicion: p.posicion - 1};
                    return p;
                });

                return {...prev, ordenPaneles: nuevasPosiciones};
            });
        },
        [setValor, ordenDefecto]
    );

    /* Cambiar un panel a otra columna (al final de esa columna) */
    const moverPanelAColumna = useCallback(
        (panelId: PanelId, columnaDestino: 1 | 2 | 3) => {
            setValor(prev => {
                const paneles = [...(prev.ordenPaneles || ordenDefecto[prev.modoColumnas])];
                const panel = paneles.find(p => p.id === panelId);

                if (!panel || panel.columna === columnaDestino) return prev;

                /* Calcular nueva posición (al final de la columna destino) */
                const panelsEnDestino = paneles.filter(p => p.columna === columnaDestino);
                const nuevaPosicion = panelsEnDestino.length > 0 ? Math.max(...panelsEnDestino.map(p => p.posicion)) + 1 : 0;

                /* Actualizar panel */
                const nuevasPosiciones = paneles.map(p => {
                    if (p.id === panelId) {
                        return {...p, columna: columnaDestino, posicion: nuevaPosicion};
                    }
                    /* Ajustar posiciones en columna origen */
                    if (p.columna === panel.columna && p.posicion > panel.posicion) {
                        return {...p, posicion: p.posicion - 1};
                    }
                    return p;
                });

                return {...prev, ordenPaneles: normalizarPosiciones(nuevasPosiciones)};
            });
        },
        [setValor, normalizarPosiciones, ordenDefecto]
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

    /* Cambiar altura de un panel específico */
    const cambiarAlturaPanel = useCallback(
        (panel: PanelId, altura: string) => {
            setValor(prev => ({
                ...prev,
                alturas: {
                    ...(prev.alturas || configDefecto.alturas),
                    [panel]: altura
                }
            }));
        },
        [setValor, configDefecto.alturas]
    );

    /* Obtener altura de un panel */
    const obtenerAlturaPanel = useCallback(
        (panel: PanelId): string => {
            return configuracionNormalizada.alturas?.[panel] || configDefecto.alturas[panel] || 'auto';
        },
        [configuracionNormalizada, configDefecto.alturas]
    );

    /* Obtener paneles ocultos */
    const panelesOcultos = Object.entries(configuracionNormalizada.visibilidad)
        .filter(([, visible]) => !visible)
        .map(([panel]) => panel as PanelId);

    /* Obtener cantidad de paneles visibles */
    const cantidadPanelesVisibles = Object.values(configuracionNormalizada.visibilidad).filter(Boolean).length;

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
        cambiarAlturaPanel,
        obtenerAlturaPanel,
        actualizarConfiguracion: setValor
    };
}

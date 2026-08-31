/**
 * layoutLogica.ts
 *
 * [H-F15-01] Lógica de negocio pura para la gestión del layout.
 * Aquí: migración de configuraciones antiguas. Las operaciones de
 * duplicado/división viven en duplicadosPanel.ts y la normalización de
 * posiciones en normalizarLayout.ts (se re-exportan para no romper
 * importadores).
 *
 * @package App/React/utils
 */

import {generarVisibilidadDefecto, generarAlturasDefecto} from '../config/registroPaneles';
import {generarOrdenPanelesDefecto, generarConfigLayoutDefecto} from './layoutFactory';
import {sanitizarAltura} from './alturasPanel';
import {normalizarPosiciones} from './normalizarLayout';
import type {ConfiguracionLayout} from '../types/paneles';

/*
 * Migración automática: asegura compatibilidad con usuarios existentes
 * - Si no existe ordenPaneles, generarlo
 * - Si no existen alturas, usar valores por defecto
 * - Si hay paneles nuevos en el registro, agregarlos
 */
export function migrarConfiguracion(valorActual: ConfiguracionLayout, todosLosPaneles: string[]): ConfiguracionLayout {
    let config = {...valorActual};
    let cambio = false;
    const ordenDefecto = generarOrdenPanelesDefecto();
    const configDefecto = generarConfigLayoutDefecto();

    /* Migrar ordenPaneles si no existe */
    if (!config.ordenPaneles || config.ordenPaneles.length === 0) {
        config = {
            ...config,
            ordenPaneles: ordenDefecto[config.modoColumnas]
        };
        cambio = true;
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
        cambio = true;
    }

    /* Migrar visibilidad para paneles nuevos */
    const visibilidadDefecto = generarVisibilidadDefecto();
    const visibilidadActualizada = {...config.visibilidad};
    todosLosPaneles.forEach(id => {
        if (visibilidadActualizada[id] === undefined) {
            visibilidadActualizada[id] = visibilidadDefecto[id] ?? false;
            cambio = true;
        }
    });
    config = {...config, visibilidad: visibilidadActualizada};

    /* Migrar alturas si no existen o faltan paneles */
    const alturasDefecto = generarAlturasDefecto();
    if (!config.alturas) {
        config = {...config, alturas: alturasDefecto};
        cambio = true;
    } else {
        const alturasActualizadas = {...config.alturas};
        todosLosPaneles.forEach(id => {
            if (alturasActualizadas[id] === undefined) {
                alturasActualizadas[id] = alturasDefecto[id] ?? 'auto';
                cambio = true;
            } else {
                /* [30-08-2026] Sanear alturas corruptas persistidas (p. ej.
                 * "2px" por un resize previo): subir al mínimo 120px evita que
                 * un panel quede colapsado a una franja invisible. */
                const alturaSegura = sanitizarAltura(alturasActualizadas[id]);
                if (alturaSegura !== alturasActualizadas[id]) {
                    alturasActualizadas[id] = alturaSegura;
                    cambio = true;
                }
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
        cambio = true;
    }

    /* [300A-1] Migrar tipoLayout: configs viejas sin el campo van a 'grid' (default histórico) */
    if (!config.tipoLayout) {
        config = {
            ...config,
            tipoLayout: 'grid'
        };
        cambio = true;
    }

    /* [30-08-2026] Si nada cambió, devolver la misma referencia para que el
     * consumidor pueda detectar "sin migración pendiente" y no re-persistir
     * (evita loops de escritura en localStorage). */
    return cambio ? config : valorActual;
}

/*
 * Reordenamientos puros: reciben el estado previo y devuelven el nuevo orden.
 * Están separadas del hook para que la lógica sea testeable y el archivo del
 * hook quede dentro del límite de líneas.
 */

export function reordenarPanelEn(config: ConfiguracionLayout, ordenDefecto: Record<number, OrdenPanelMini[]>, panelId: string, nuevaColumna: 1 | 2 | 3, nuevaPosicion: number): ConfiguracionLayout {
    const paneles = [...(config.ordenPaneles || [])];
    const indicePanel = paneles.findIndex(p => p.id === panelId);
    if (indicePanel === -1) return config;

    const panelActual = paneles[indicePanel];
    paneles.splice(indicePanel, 1);

    paneles
        .filter(p => p.columna === panelActual.columna && p.posicion > panelActual.posicion)
        .forEach(p => { p.posicion--; });
    paneles
        .filter(p => p.columna === nuevaColumna && p.posicion >= nuevaPosicion)
        .forEach(p => { p.posicion++; });

    paneles.push({id: panelId, columna: nuevaColumna, posicion: nuevaPosicion});
    return {...config, ordenPaneles: normalizarPosiciones(paneles)};
}

export function moverPanelEn(config: ConfiguracionLayout, ordenDefecto: Record<number, OrdenPanelMini[]>, panelId: string, delta: number): ConfiguracionLayout {
    const paneles = [...(config.ordenPaneles || [])];
    const panel = paneles.find(p => p.id === panelId);
    if (!panel) return config;

    const columna = panel.columna;
    const posiciones = paneles.filter(p => p.columna === columna).map(p => p.posicion);
    const maxPosicion = Math.max(...posiciones);
    const objetivo = panel.posicion + delta;
    const destino = paneles.find(p => p.columna === columna && p.posicion === objetivo);

    if (!destino || objetivo < 0 || objetivo > maxPosicion) return config;

    const nuevasPosiciones = paneles.map(p => {
        if (p.id === panelId) return {...p, posicion: objetivo};
        if (p.id === destino.id) return {...p, posicion: panel.posicion};
        return p;
    });
    return {...config, ordenPaneles: nuevasPosiciones};
}

export function moverPanelAColumnaEn(config: ConfiguracionLayout, ordenDefecto: Record<number, OrdenPanelMini[]>, panelId: string, columnaDestino: 1 | 2 | 3): ConfiguracionLayout {
    const paneles = [...(config.ordenPaneles || [])];
    const panel = paneles.find(p => p.id === panelId);
    if (!panel || panel.columna === columnaDestino) return config;

    const panelsEnDestino = paneles.filter(p => p.columna === columnaDestino);
    const nuevaPosicion = panelsEnDestino.length > 0 ? Math.max(...panelsEnDestino.map(p => p.posicion)) + 1 : 0;

    const nuevasPosiciones = paneles.map(p => {
        if (p.id === panelId) return {...p, columna: columnaDestino, posicion: nuevaPosicion};
        if (p.columna === panel.columna && p.posicion > panel.posicion) return {...p, posicion: p.posicion - 1};
        return p;
    });
    return {...config, ordenPaneles: normalizarPosiciones(nuevasPosiciones)};
}

type OrdenPanelMini = {id: string; columna: 1 | 2 | 3; posicion: number};

export {normalizarPosiciones} from './normalizarLayout';
export {crearDuplicadoPanel, crearDivisionPanel, eliminarPanelDuplicado} from './duplicadosPanel';

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
import type {ConfiguracionLayout} from '../types/paneles';

/*
 * Migración automática: asegura compatibilidad con usuarios existentes
 * - Si no existe ordenPaneles, generarlo
 * - Si no existen alturas, usar valores por defecto
 * - Si hay paneles nuevos en el registro, agregarlos
 */
export function migrarConfiguracion(valorActual: ConfiguracionLayout, todosLosPaneles: string[]): ConfiguracionLayout {
    let config = {...valorActual};
    const ordenDefecto = generarOrdenPanelesDefecto();
    const configDefecto = generarConfigLayoutDefecto();

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

    /* [300A-1] Migrar tipoLayout: configs viejas sin el campo van a 'grid' (default histórico) */
    if (!config.tipoLayout) {
        config = {
            ...config,
            tipoLayout: 'grid'
        };
    }

    return config;
}

export {normalizarPosiciones} from './normalizarLayout';
export {crearDuplicadoPanel, crearDivisionPanel, eliminarPanelDuplicado} from './duplicadosPanel';

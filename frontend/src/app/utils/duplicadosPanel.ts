/*
 * utils/duplicadosPanel.ts
 * [H-F15-01] Operaciones de duplicado/división de paneles del layout:
 * crearDuplicadoPanel, crearDivisionPanel y eliminarPanelDuplicado.
 * Extraídas de layoutLogica.ts.
 */

import type {ConfiguracionLayout, ModoColumnas, OrdenPanel} from '../types/paneles';
import {normalizarPosiciones} from './normalizarLayout';

/* [263A-3] Crear un panel duplicado con ID sufijo (e.g., scratchpad-1).
 * Se ubica en la misma columna que el original, justo después.
 * Retorna nueva configuración sin mutar la original. */
export function crearDuplicadoPanel(
    prev: ConfiguracionLayout,
    baseId: string,
    ordenDefecto: Record<ModoColumnas, OrdenPanel[]>
): ConfiguracionLayout {
    const paneles = [...(prev.ordenPaneles || ordenDefecto[prev.modoColumnas])];
    const panelOriginal = paneles.find(p => p.id === baseId);
    if (!panelOriginal) return prev;

    /* Siguiente sufijo disponible */
    const existentes = paneles
        .filter(p => p.id.startsWith(baseId + '-'))
        .map(p => {
            const m = p.id.match(/-(\\d+)$/);
            return m ? parseInt(m[1], 10) : 0;
        });
    const siguienteNum = existentes.length > 0 ? Math.max(...existentes) + 1 : 1;
    const nuevoId = `${baseId}-${siguienteNum}`;

    /* Insertar justo después del original */
    const nuevaPosicion = panelOriginal.posicion + 1;
    const panelesActualizados = paneles.map(p => {
        if (p.columna === panelOriginal.columna && p.posicion >= nuevaPosicion) {
            return {...p, posicion: p.posicion + 1};
        }
        return p;
    });
    panelesActualizados.push({id: nuevoId, columna: panelOriginal.columna, posicion: nuevaPosicion});

    return {
        ...prev,
        ordenPaneles: normalizarPosiciones(panelesActualizados),
        visibilidad: {...(prev.visibilidad || {}), [nuevoId]: true},
        alturas: {...(prev.alturas || {}), [nuevoId]: prev.alturas?.[baseId] || 'auto'}
    };
}

/* [263A-3] División lado a lado de un panel en la misma columna (como duplicado
 * pero marca ambos con panelDivisionId). [18-08-2026] Repara estados huérfanos:
 * si el flag de división sobrevive sin compañero real, se limpia y continúa. */
export function crearDivisionPanel(prev: ConfiguracionLayout, baseId: string): ConfiguracionLayout {
    let paneles = [...(prev.ordenPaneles || [])];
    let visibilidad = {...(prev.visibilidad || {})};
    let alturas = {...(prev.alturas || {})};
    const panelOriginal = paneles.find(p => p.id === baseId);
    if (!panelOriginal) return prev;

    const divisionId = `${baseId}-split`;

    /* Evitar múltiples divisiones del mismo panel */
    const yaDividido = paneles.some(p => p.panelDivisionId === divisionId);
    if (yaDividido) {
        /* Reparar estado huérfano: flag presente pero sin panel compañero real
         * (p. ej. el compañero se perdió por restauración parcial o quedó oculto
         * por un minimizar de un duplicado). En vez de quedarse bloqueado, se
         * limpian los flags y se continúa creando la división; los compañeros
         * obsoletos ocultos se eliminan del layout para que no se acumulen. */
        const companeroExiste = paneles.some(
            p => p.panelDivisionId === divisionId && p.id !== baseId && visibilidad[p.id] !== false
        );
        if (companeroExiste) return prev;
        const obsoletos = paneles
            .filter(p => p.panelDivisionId === divisionId && p.id !== baseId)
            .map(p => p.id);
        paneles = paneles
            .filter(p => !obsoletos.includes(p.id))
            .map(p =>
                p.panelDivisionId === divisionId ? {...p, dividido: undefined, panelDivisionId: undefined} : p
            );
        for (const id of obsoletos) {
            delete visibilidad[id];
            delete alturas[id];
        }
    }

    const existentes = paneles
        .filter(p => p.id.startsWith(baseId + '-'))
        .map(p => {
            const m = p.id.match(/-(\\d+)$/);
            return m ? parseInt(m[1], 10) : 0;
        });
    const siguienteNum = existentes.length > 0 ? Math.max(...existentes) + 1 : 1;
    const nuevoId = `${baseId}-${siguienteNum}`;

    const nuevaPosicion = panelOriginal.posicion + 1;
    const panelesActualizados = paneles.map(p => {
        if (p.columna === panelOriginal.columna && p.posicion >= nuevaPosicion) {
            return {...p, posicion: p.posicion + 1};
        }
        return p;
    });
    panelesActualizados.push({
        id: nuevoId,
        columna: panelOriginal.columna,
        posicion: nuevaPosicion,
        dividido: true,
        panelDivisionId: divisionId
    });

    /* Marcar también el original como dividido */
    const conOriginalDividido = panelesActualizados.map(p =>
        p.id === baseId ? {...p, dividido: true, panelDivisionId: divisionId} : p
    );

    return {
        ...prev,
        ordenPaneles: normalizarPosiciones(conOriginalDividido),
        visibilidad: {...visibilidad, [nuevoId]: true},
        alturas: {...alturas, [nuevoId]: prev.alturas?.[baseId] || 'auto'}
    };
}

/* [263A-3] Eliminar un panel duplicado del layout */
export function eliminarPanelDuplicado(prev: ConfiguracionLayout, instanceId: string): ConfiguracionLayout {
    const paneles = (prev.ordenPaneles || []).filter(p => p.id !== instanceId);
    const {[instanceId]: _vis, ...restoVisibilidad} = prev.visibilidad || {};
    const {[instanceId]: _alt, ...restoAlturas} = prev.alturas || {};

    /* Limpiar flags de división si el cerrado era el último del grupo: solo
     * cuentan duplicados reales (id con sufijo), no el base. [19-08-2026] */
    const configEliminado = prev.ordenPaneles?.find(p => p.id === instanceId);
    const divisionId = configEliminado?.panelDivisionId;
    const hayMasDelGrupo = divisionId
        ? paneles.some(p => p.panelDivisionId === divisionId && p.id !== divisionId.replace(/-split$/, ''))
        : false;

    const panelesLimpios = divisionId && !hayMasDelGrupo
        ? paneles.map(p => (p.panelDivisionId === divisionId ? {...p, dividido: undefined, panelDivisionId: undefined} : p))
        : paneles;

    return {
        ...prev,
        ordenPaneles: normalizarPosiciones(panelesLimpios),
        visibilidad: restoVisibilidad,
        alturas: restoAlturas
    };
}

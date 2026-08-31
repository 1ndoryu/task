/*
 * SelectorPanelCelda
 *
 * [318A-2] Selector de panel para una celda del Modo Vistas.
 * Se abre al pulsar "Elegir panel" en una celda: muestra la lista de paneles
 * existentes (registro) para elegir cuál muestra esa celda.
 *
 * [318A-2 fb] Reutiliza el sistema estándar de menú contextual (MenuContextual
 * + menuContextual.css) en lugar de estilos propios, para mantener coherencia
 * visual con el resto de menús del dashboard. El menú se cierra con click
 * fuera, Escape o al elegir una opción.
 */

import {useCallback, useMemo} from 'react';
import {obtenerIdsPaneles, obtenerPanel} from '../../../config/registroPaneles';
import type {PanelId} from '../../../hooks/useConfiguracionLayout';
import {MenuContextual} from '../../shared';
import type {OpcionMenu} from '../../shared';

interface SelectorPanelCeldaProps {
    celdaId: string;
    posicionX: number;
    posicionY: number;
    onSeleccionar: (celdaId: string, panelId: PanelId) => void;
    onCerrar: () => void;
}

export function SelectorPanelCelda({celdaId, posicionX, posicionY, onSeleccionar, onCerrar}: SelectorPanelCeldaProps): JSX.Element {
    const paneles = useMemo(() => obtenerIdsPaneles(), []);

    /* Un item del menú por panel registrado (título + icono del registro) */
    const opciones = useMemo<OpcionMenu[]>(() => paneles.map(panelId => {
        const def = obtenerPanel(panelId);
        return {
            id: panelId,
            etiqueta: def?.titulo ?? panelId,
            icono: def?.icono
        };
    }), [paneles]);

    const handleSeleccionar = useCallback((opcionId: string) => {
        onSeleccionar(celdaId, opcionId as PanelId);
    }, [celdaId, onSeleccionar]);

    return (
        <MenuContextual
            opciones={opciones}
            posicionX={posicionX}
            posicionY={posicionY}
            onSeleccionar={handleSeleccionar}
            onCerrar={onCerrar}
        />
    );
}

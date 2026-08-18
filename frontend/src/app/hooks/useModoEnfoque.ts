/*
 * useModoEnfoque
 * Hook para gestionar el modo enfoque de paneles
 *
 * Permite expandir un panel para que ocupe toda la pantalla
 * con el fondo difuminado, ideal para concentrarse en una tarea
 */

import {useState, useCallback} from 'react';
import type {PanelId} from './useConfiguracionLayout';

interface UseModoEnfoqueRetorno {
    panelEnfocado: PanelId | null;
    estaEnModoEnfoque: boolean;
    enfocarPanel: (panelId: PanelId) => void;
    salirModoEnfoque: () => void;
    toggleModoEnfoque: (panelId: PanelId) => void;
    esPanelEnfocado: (panelId: PanelId) => boolean;
}

export function useModoEnfoque(): UseModoEnfoqueRetorno {
    const [panelEnfocado, setPanelEnfocado] = useState<PanelId | null>(null);

    const estaEnModoEnfoque = panelEnfocado !== null;

    const enfocarPanel = useCallback((panelId: PanelId) => {
        setPanelEnfocado(panelId);
        document.body.style.overflow = 'hidden';
    }, []);

    const salirModoEnfoque = useCallback(() => {
        setPanelEnfocado(null);
        document.body.style.overflow = '';
    }, []);

    const toggleModoEnfoque = useCallback(
        (panelId: PanelId) => {
            if (panelEnfocado === panelId) {
                salirModoEnfoque();
            } else {
                enfocarPanel(panelId);
            }
        },
        [panelEnfocado, enfocarPanel, salirModoEnfoque]
    );

    const esPanelEnfocado = useCallback(
        (panelId: PanelId) => {
            return panelEnfocado === panelId;
        },
        [panelEnfocado]
    );

    return {
        panelEnfocado,
        estaEnModoEnfoque,
        enfocarPanel,
        salirModoEnfoque,
        toggleModoEnfoque,
        esPanelEnfocado
    };
}

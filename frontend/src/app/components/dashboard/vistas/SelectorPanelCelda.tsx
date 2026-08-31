/*
 * SelectorPanelCelda
 *
 * [318A-2] Selector de panel para una celda del Modo Vistas.
 * Se abre al pulsar "Elegir panel" en una celda: muestra la lista de paneles
 * disponibles (registro) para elegir cuál muestra esa celda.
 *
 * Reutiliza el registro de paneles (obtenerIdsPaneles) para listar los
 * paneles existentes; solo se permite elegir paneles distintos a los ya
 * usados en la vista (opcional — el hook valida el máx de 4).
 */

import {useCallback, useMemo} from 'react';
import {X} from 'lucide-react';
import {obtenerIdsPaneles, obtenerPanel} from '../../../config/registroPaneles';
import type {PanelId} from '../../../hooks/useConfiguracionLayout';
import {Boton} from '../../ui';

interface SelectorPanelCeldaProps {
    vistaId: string;
    celdaId: string;
    onSeleccionar: (celdaId: string, panelId: PanelId) => void;
    onCerrar: () => void;
}

export function SelectorPanelCelda({vistaId, celdaId, onSeleccionar, onCerrar}: SelectorPanelCeldaProps): JSX.Element {
    const paneles = useMemo(() => obtenerIdsPaneles(), []);

    const handleSeleccionar = useCallback((panelId: PanelId) => {
        onSeleccionar(celdaId, panelId);
    }, [celdaId, onSeleccionar]);

    return (
        <div className="selectorPanelCelda">
            <div className="selectorPanelCeldaEncabezado">
                <span className="selectorPanelCeldaTitulo">Elegir panel</span>
                <Boton variante="badge" soloIcono onClick={onCerrar} icono={<X size={12} />} title="Cerrar" />
            </div>
            <div className="selectorPanelCeldaLista">
                {paneles.map(panelId => {
                    const def = obtenerPanel(panelId);
                    if (!def) return null;
                    return (
                        <Boton
                            key={panelId}
                            variante="opcion"
                            onClick={() => handleSeleccionar(panelId)}
                            icono={def.icono}
                            title={def.titulo}
                        >
                            {def.titulo}
                        </Boton>
                    );
                })}
            </div>
        </div>
    );
}

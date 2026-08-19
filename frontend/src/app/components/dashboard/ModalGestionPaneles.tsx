/*
 * ModalGestionPaneles
 * [18-08-2026] Modal de activar/desactivar paneles del dashboard (incluye los
 * minimizados). Reemplaza la sección "Visibilidad de Paneles" del modal de
 * layout, que solo listaba 5 paneles hardcodeados y no reflejaba plugins ni el
 * estado real. Aquí la lista es dinámica (registro de paneles + plugins
 * activos) y cada fila muestra si el panel está visible o minimizado.
 */

import {PanelTop} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {ToggleSwitch} from '../shared/ToggleSwitch';
import {obtenerInfoPanel} from '../shared/BarraPanelesOcultos';
import {obtenerIdsPaneles, obtenerIdBase, panelPuedeMostrarse} from '../../config/registroPaneles';
import {obtenerPluginsVisibles, obtenerTodosPlugins, obtenerPlugin} from '../../config/registroPlugins';
import {usePluginsStore} from '../../stores/pluginsStore';
import type {PanelId} from '../../hooks/useConfiguracionLayout';

interface ModalGestionPanelesProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    visibilidad: Record<string, boolean>;
    onTogglePanel: (panel: PanelId) => void;
}

export function ModalGestionPaneles({estaAbierto, onCerrar, visibilidad, onTogglePanel}: ModalGestionPanelesProps): JSX.Element {
    const pluginsActivos = usePluginsStore(s => s.pluginsActivos);

    /* Paneles de plugin activos (misma semántica que la antigua barra de ocultos):
     * un panel de plugin solo se ofrece si su plugin está activado. */
    const panelesDePluginActivos = new Set(
        obtenerPluginsVisibles()
            .filter(plugin => pluginsActivos.includes(plugin.id))
            .flatMap(plugin => plugin.panelesIds)
    );
    const panelesDePluginRegistrados = new Set(obtenerTodosPlugins().flatMap(plugin => plugin.panelesIds));

    /* Solo paneles base (sin instancias duplicadas/divididas con sufijo numérico). */
    const paneles = obtenerIdsPaneles()
        .filter(id => obtenerIdBase(id) === id && panelPuedeMostrarse(id))
        .filter(id => {
            if (!panelesDePluginRegistrados.has(id)) return true;
            return panelesDePluginActivos.has(id);
        })
        .sort((a, b) => {
            const visibleA = visibilidad[a] !== false ? 0 : 1;
            const visibleB = visibilidad[b] !== false ? 0 : 1;
            return visibleA - visibleB;
        });

    const visibles = paneles.filter(id => visibilidad[id] !== false);
    const minimizados = paneles.filter(id => visibilidad[id] === false);

    const pluginDePanel = (panelId: string): string | undefined => {
        for (const plugin of obtenerTodosPlugins()) {
            if (plugin.panelesIds.includes(panelId)) return plugin.nombre;
        }
        return undefined;
    };

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Paneles del Dashboard">
            <div className="gestionPanelesContenido">

                {minimizados.length > 0 && (
                    <div className="gestionPanelesSeccion">
                        <h4 className="gestionPanelesSeccionTitulo">Minimizados ({minimizados.length})</h4>
                        <div className="gestionPanelesLista">
                            {minimizados.map(panelId => {
                                const info = obtenerInfoPanel(panelId);
                                const plugin = pluginDePanel(panelId);
                                return (
                                    <div key={panelId} className="gestionPanelesItem">
                                        <div className="gestionPanelesItemInfo">
                                            <span className="gestionPanelesItemIcono">{info.icono}</span>
                                            <div className="gestionPanelesItemTexto">
                                                <span className="gestionPanelesItemNombre">
                                                    {info.nombre}
                                                    <span className="gestionPanelesBadgeMinimizado">Minimizado</span>
                                                </span>
                                                {plugin && <span className="gestionPanelesItemPlugin">Plugin: {plugin}</span>}
                                            </div>
                                        </div>
                                        <ToggleSwitch checked={false} onChange={() => onTogglePanel(panelId)} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {visibles.length > 0 && (
                    <div className="gestionPanelesSeccion">
                        <h4 className="gestionPanelesSeccionTitulo">Visibles ({visibles.length})</h4>
                        <div className="gestionPanelesLista">
                            {visibles.map(panelId => {
                                const info = obtenerInfoPanel(panelId);
                                const plugin = pluginDePanel(panelId);
                                return (
                                    <div key={panelId} className="gestionPanelesItem">
                                        <div className="gestionPanelesItemInfo">
                                            <span className="gestionPanelesItemIcono">{info.icono}</span>
                                            <div className="gestionPanelesItemTexto">
                                                <span className="gestionPanelesItemNombre">{info.nombre}</span>
                                                {plugin && <span className="gestionPanelesItemPlugin">Plugin: {plugin}</span>}
                                            </div>
                                        </div>
                                        <ToggleSwitch checked={true} onChange={() => onTogglePanel(panelId)} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {paneles.length === 0 && (
                    <div className="gestionPanelesVacio">
                        <PanelTop size={28} />
                        <p>No hay paneles disponibles.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}

/* [233A-70] Sección de plugins para el modal de configuración global.
 * Muestra lista de plugins registrados con toggle de activación.
 * Plugins con requiereConfiguracion muestran formulario inline al entrar.
 * Reutiliza stores y registro existentes — no depende de ModalPlugins.tsx. */

import {useCallback, useMemo, useState} from 'react';
import {Settings, ChevronLeft} from 'lucide-react';
import {Boton} from '../../ui/Boton';
import {obtenerPluginsVisibles, obtenerPanelesDePlugin, pluginPuedeMostrarse} from '../../../config/registroPlugins';
import {usePluginsStore} from '../../../stores/pluginsStore';
import {useHabitosStore} from '../../../stores/habitosStore';
import {useConfiguracionLayout} from '../../../hooks/useConfiguracionLayout';
import {ConfigDeficitCalorico} from '../../dashboard/ConfigDeficitCalorico';
import type {DefinicionPlugin} from '../../../types/plugins';

/* Mapa de componentes de configuración por pluginId */
const COMPONENTES_CONFIG: Record<string, React.ComponentType<{onCerrar: () => void}>> = {
    'deficit-calorico': ConfigDeficitCalorico
};

function FilaPlugin({plugin, onToggle, onAbrirConfig}: {plugin: DefinicionPlugin; onToggle: (pluginId: string) => void; onAbrirConfig?: (pluginId: string) => void}): JSX.Element {
    const pluginsActivos = usePluginsStore(s => s.pluginsActivos);
    const estaActivo = pluginsActivos.includes(plugin.id);

    return (
        <div className={`modalPluginsFila ${estaActivo ? 'modalPluginsFila--activo' : ''}`}>
            <div className="modalPluginsInfo">
                <div className="modalPluginsIcono">{plugin.icono}</div>
                <div className="modalPluginsTexto">
                    <span className="modalPluginsNombre">{plugin.nombre}</span>
                    <span className="modalPluginsDescripcion">{plugin.descripcion}</span>
                    <span className="modalPluginsVersion">v{plugin.version}</span>
                </div>
            </div>
            <div className="modalPluginsAcciones">
                {plugin.requiereConfiguracion && estaActivo && onAbrirConfig && (
                    <Boton type="button" claseAdicional="modalPluginsBotonConfig" onClick={() => onAbrirConfig(plugin.id)} title="Configurar plugin">
                        <Settings size={14} />
                    </Boton>
                )}
                <Boton type="button" claseAdicional={`modalPluginsToggle ${estaActivo ? 'modalPluginsToggle--activo' : ''}`} onClick={() => onToggle(plugin.id)} aria-label={estaActivo ? 'Desactivar plugin' : 'Activar plugin'}>
                    <span className="modalPluginsToggleIndicador" />
                </Boton>
            </div>
        </div>
    );
}

export function SeccionConfigPlugins(): JSX.Element {
    const pluginsActivos = usePluginsStore(s => s.pluginsActivos);
    const togglePlugin = usePluginsStore(s => s.togglePlugin);
    const guardarConfiguracion = usePluginsStore(s => s.guardarConfiguracion);
    const habitos = useHabitosStore(s => s.habitos);
    const {mostrarPanel, ocultarPanel} = useConfiguracionLayout();
    const [configAbierta, setConfigAbierta] = useState<string | null>(null);

    const plugins = useMemo(() => obtenerPluginsVisibles(), []);

    const manejarToggle = useCallback(
        (pluginId: string) => {
            if (!pluginPuedeMostrarse(pluginId)) return;

            const estabaActivo = pluginsActivos.includes(pluginId);
            togglePlugin(pluginId);

            if (!estabaActivo && pluginId === 'ayuno') {
                const configActual = usePluginsStore.getState().configuracionPlugins['ayuno'] as unknown as {habitoId?: number} | undefined;
                const habitoId = configActual?.habitoId;
                const existePorId = !!(habitoId && habitos.some(h => h.id === habitoId));

                if (!existePorId) {
                    const existente = habitos.find(h => h.nombre.trim().toLowerCase() === 'ayuno');
                    const habito = existente ?? useHabitosStore.getState().crearHabito({
                        nombre: 'Ayuno',
                        importancia: 'Media',
                        tags: [],
                        frecuencia: {tipo: 'diario'},
                        descripcion: 'Hábito especial generado por el plugin de ayuno'
                    });
                    guardarConfiguracion('ayuno', {habitoId: habito.id});
                }
            }

            /* [105A-3] Los plugins solo-admin se filtran antes del toggle.
             * Evita que un usuario normal reactive paneles sensibles desde localStorage.
             * [303A-8] Mostrar/ocultar paneles al activar/desactivar plugin desde config global.
             * Antes solo se cambiaba el estado del store pero el panel seguía visible. */
            const panelesIds = obtenerPanelesDePlugin(pluginId);
            panelesIds.forEach(panelId => {
                if (estabaActivo) {
                    ocultarPanel(panelId);
                } else {
                    mostrarPanel(panelId);
                }
            });
        },
        [pluginsActivos, togglePlugin, guardarConfiguracion, habitos, mostrarPanel, ocultarPanel]
    );

    const ComponenteConfig = configAbierta ? COMPONENTES_CONFIG[configAbierta] : null;

    if (ComponenteConfig) {
        return (
            <div className="modalPluginsCuerpo">
                <Boton type="button" variante="ghost" onClick={() => setConfigAbierta(null)} claseAdicional="configGlobalBotonVolver">
                    <ChevronLeft size={14} />
                    <span>Volver a plugins</span>
                </Boton>
                <ComponenteConfig onCerrar={() => setConfigAbierta(null)} />
            </div>
        );
    }

    return (
        <div className="modalPluginsCuerpo">
            {plugins.length === 0
                ? <p className="modalPluginsVacio">No hay plugins disponibles.</p>
                : plugins.map(plugin => (
                    <FilaPlugin
                        key={plugin.id}
                        plugin={plugin}
                        onToggle={manejarToggle}
                        onAbrirConfig={pluginId => setConfigAbierta(pluginId)}
                    />
                ))
            }
        </div>
    );
}

/*
 * ModalPlugins.tsx
 * Modal para activar/desactivar plugins del dashboard
 * Muestra todos los plugins registrados con toggle de activación
 * Al activar un plugin, muestra sus paneles; al desactivar, los oculta
 * Plugins con requiereConfiguracion muestran botón de ajustes
 */

import {useCallback, useEffect, useMemo, useState} from 'react';
import {Settings} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {obtenerTodosPlugins, obtenerPanelesDePlugin} from '../../config/registroPlugins';
import {usePluginsStore} from '../../stores/pluginsStore';
import {useHabitosStore} from '../../stores/habitosStore';
import {ConfigDeficitCalorico} from './ConfigDeficitCalorico';
import type {DefinicionPlugin} from '../../types/plugins';

interface ModalPluginsProps {
    abierto: boolean;
    pluginConfigInicial?: string | null;
    onCerrar: () => void;
    onMostrarPanel?: (panelId: string) => void;
    onOcultarPanel?: (panelId: string) => void;
}

/*
 * Mapa de componentes de configuración por pluginId
 * Cada plugin con requiereConfiguracion debe tener su componente aquí
 */
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
                    <button type="button" className="modalPluginsBotonConfig" onClick={() => onAbrirConfig(plugin.id)} title="Configurar plugin">
                        <Settings size={14} />
                    </button>
                )}
                <button type="button" className={`modalPluginsToggle ${estaActivo ? 'modalPluginsToggle--activo' : ''}`} onClick={() => onToggle(plugin.id)} aria-label={estaActivo ? 'Desactivar plugin' : 'Activar plugin'}>
                    <span className="modalPluginsToggleIndicador" />
                </button>
            </div>
        </div>
    );
}

export function ModalPlugins({abierto, pluginConfigInicial = null, onCerrar, onMostrarPanel, onOcultarPanel}: ModalPluginsProps): JSX.Element | null {
    const {pluginsActivos, togglePlugin} = usePluginsStore();
    const guardarConfiguracion = usePluginsStore(s => s.guardarConfiguracion);
    const habitos = useHabitosStore(s => s.habitos);
    const [configAbierta, setConfigAbierta] = useState<string | null>(null);

    const plugins = useMemo(() => {
        return abierto ? obtenerTodosPlugins() : [];
    }, [abierto]);

    /* Resetear la vista de config al cerrar el modal */
    useEffect(() => {
        if (!abierto) {
            setConfigAbierta(null);
        }
    }, [abierto]);

    /* Si se abre el modal desde un panel (botón configuración), entrar directo a la config del plugin */
    useEffect(() => {
        if (!abierto) return;
        if (!pluginConfigInicial) return;

        /* Solo abrir si existe componente de config para este plugin */
        if (COMPONENTES_CONFIG[pluginConfigInicial]) {
            setConfigAbierta(pluginConfigInicial);
        }
    }, [abierto, pluginConfigInicial]);

    const manejarToggle = useCallback(
        (pluginId: string) => {
            const estabaActivo = pluginsActivos.includes(pluginId);
            togglePlugin(pluginId);

            /* Plugin Ayuno: asegurar hábito especial y guardar su id para abrir configuración desde el panel */
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

            const panelesIds = obtenerPanelesDePlugin(pluginId);
            panelesIds.forEach(panelId => {
                if (estabaActivo) {
                    onOcultarPanel?.(panelId);
                } else {
                    onMostrarPanel?.(panelId);
                }
            });
        },
        [pluginsActivos, togglePlugin, onMostrarPanel, onOcultarPanel, guardarConfiguracion, habitos]
    );

    const manejarAbrirConfig = useCallback((pluginId: string) => {
        setConfigAbierta(pluginId);
    }, []);

    const manejarCerrarConfig = useCallback(() => {
        setConfigAbierta(null);
    }, []);

    /* Renderizar componente de configuración si está abierto */
    const ComponenteConfig = configAbierta ? COMPONENTES_CONFIG[configAbierta] : null;

    /*
     * Lógica de cierre unificada:
     * Si hay config abierta, volver a la lista.
     * Si no, cerrar el modal.
     */
    const manejarCierreUnificado = useCallback(() => {
        if (configAbierta) {
            manejarCerrarConfig();
        } else {
            onCerrar();
        }
    }, [configAbierta, manejarCerrarConfig, onCerrar]);

    const tituloModal = configAbierta ? `Configurar ${plugins.find(p => p.id === configAbierta)?.nombre ?? 'Plugin'}` : 'Plugins';

    if (!abierto) return null;

    return (
        <Modal estaAbierto={abierto} onCerrar={manejarCierreUnificado} titulo={tituloModal} claseExtra="modalPlugins">
            <div className="modalPluginsCuerpo">{ComponenteConfig ? <ComponenteConfig onCerrar={manejarCerrarConfig} /> : plugins.length === 0 ? <p className="modalPluginsVacio">No hay plugins disponibles.</p> : plugins.map(plugin => <FilaPlugin key={plugin.id} plugin={plugin} onToggle={manejarToggle} onAbrirConfig={manejarAbrirConfig} />)}</div>
        </Modal>
    );
}

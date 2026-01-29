/*
 * PanelScratchpad
 * Componente que renderiza el panel de notas rápidas (Scratchpad)
 * Nota: En móvil el header del panel se oculta via CSS (Fase 10.8.3)
 *
 * Sistema de notas persistentes con autoguardado:
 * - Siempre hay una nota activa siendo editada
 * - Los cambios se guardan automáticamente después de 2 segundos de inactividad
 * - El título se extrae de la primera línea con #
 */

import {useState} from 'react';
import {Eraser, Settings, FolderOpen, Plus, Maximize2} from 'lucide-react';
import {SeccionEncabezado, Scratchpad, ModalNotasExpandido} from '../dashboard';
import {OverlayEnfoque} from '../shared';
import {useNotasStore} from '../../stores/notasStore';
import {extraerTitulo} from '../../utils/notasUtils';
import type {ConfiguracionScratchpad} from '../../hooks/useConfiguracionScratchpad';
import {useAlertas} from '../../hooks/useAlertas';

interface PanelScratchpadProps {
    configuracion: ConfiguracionScratchpad;
    onAbrirModalConfigScratchpad: () => void;
    onCambiarAltura: (altura: string) => void;
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
}

export function PanelScratchpad({configuracion, onAbrirModalConfigScratchpad, onCambiarAltura, renderHandleArrastre, handleMinimizar}: PanelScratchpadProps): JSX.Element {
    const [modalNotasExpandidoAbierto, setModalNotasExpandidoAbierto] = useState(false);
    const [modoEnfoque, setModoEnfoque] = useState(false);

    /* Estado global de notas */
    const notaActiva = useNotasStore(s => s.notaActiva);
    const crearNuevaNota = useNotasStore(s => s.crearNuevaNota);
    const actualizarContenido = useNotasStore(s => s.actualizarContenidoNotaActiva);
    const guardarNotaActiva = useNotasStore(s => s.guardarNotaActiva);

    const {mostrarExito} = useAlertas();

    const manejarNuevaNota = () => {
        crearNuevaNota();
        mostrarExito('Nueva nota creada');
    };

    const manejarLimpiar = () => {
        crearNuevaNota();
    };

    /* Guardar la nota activa antes de abrir el modal de notas guardadas
     * para evitar que la nota editándose aparezca desincronizada */
    const manejarAbrirCarpeta = async () => {
        /* Si hay contenido modificado, guardarlo primero */
        if (notaActiva.modificada && notaActiva.contenido.trim()) {
            await guardarNotaActiva();
        }
        setModalNotasExpandidoAbierto(true);
    };

    /* Título de la nota activa para mostrar en el encabezado */
    const tituloActivo = extraerTitulo(notaActiva.contenido);
    const esNotaNueva = notaActiva.id === null;

    return (
        <div className="panelDashboard internaColumna">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Notas') as any}
                subtitulo={esNotaNueva ? 'Nueva nota' : tituloActivo}
                variante="panelHeader"
                acciones={
                    <>
                        {/* Botón nueva nota */}
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={manejarNuevaNota} title="Nueva nota">
                            <span className="selectorBadgeIcono">
                                <Plus size={12} />
                            </span>
                        </button>
                        {/* Botón abrir notas guardadas */}
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={manejarAbrirCarpeta} title="Ver notas guardadas">
                            <span className="selectorBadgeIcono">
                                <FolderOpen size={12} />
                            </span>
                        </button>
                        {/* Botón limpiar */}
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={manejarLimpiar} title="Limpiar / Nueva nota">
                            <span className="selectorBadgeIcono">
                                <Eraser size={12} />
                            </span>
                        </button>
                        {/* Botón configuración */}
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalConfigScratchpad} title="Configuración">
                            <span className="selectorBadgeIcono">
                                <Settings size={12} />
                            </span>
                        </button>
                        {/* Botón modo enfoque */}
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setModoEnfoque(true)} title="Modo enfoque">
                            <span className="selectorBadgeIcono">
                                <Maximize2 size={12} />
                            </span>
                        </button>
                        {handleMinimizar}
                    </>
                }
            />
            <Scratchpad valorInicial={notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={configuracion.tamanoFuente} altura={configuracion.altura} delayGuardado={configuracion.autoGuardadoIntervalo} onCambiarAltura={onCambiarAltura} />

            <ModalNotasExpandido abierto={modalNotasExpandidoAbierto} onCerrar={() => setModalNotasExpandidoAbierto(false)} tamanoFuente={configuracion.tamanoFuente} delayGuardado={configuracion.autoGuardadoIntervalo} />

            {/* Overlay modo enfoque */}
            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo={esNotaNueva ? 'Nueva nota' : tituloActivo}>
                <Scratchpad valorInicial={notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={configuracion.tamanoFuente} altura="100%" delayGuardado={configuracion.autoGuardadoIntervalo} mostrarResizeHandle={false} />
            </OverlayEnfoque>
        </div>
    );
}

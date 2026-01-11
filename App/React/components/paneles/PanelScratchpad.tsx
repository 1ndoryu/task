/*
 * PanelScratchpad
 * Componente que renderiza el panel de notas rápidas (Scratchpad)
 *
 * Sistema de notas persistentes con autoguardado:
 * - Siempre hay una nota activa siendo editada
 * - Los cambios se guardan automáticamente después de 2 segundos de inactividad
 * - El título se extrae de la primera línea con #
 */

import {useState} from 'react';
import {Eraser, Settings, FolderOpen, Plus, Maximize2} from 'lucide-react';
import {SeccionEncabezado, Scratchpad, ModalNotasGuardadas} from '../dashboard';
import {OverlayEnfoque} from '../shared';
import {useNotas} from '../../hooks';
import type {Nota} from '../../hooks';
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
    const [modalNotasAbierto, setModalNotasAbierto] = useState(false);
    const [modoEnfoque, setModoEnfoque] = useState(false);
    const {estado, seleccionarNota, crearNuevaNota, actualizarContenido, obtenerTituloDeContenido, guardarNotaActiva} = useNotas();
    const {mostrarExito} = useAlertas();

    const {notaActiva} = estado;

    const manejarSeleccionarNota = (nota: Nota) => {
        seleccionarNota(nota);
        setModalNotasAbierto(false);
        mostrarExito(`Editando: ${nota.titulo}`);
    };

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
        setModalNotasAbierto(true);
    };

    /* Título de la nota activa para mostrar en el encabezado */
    const tituloActivo = obtenerTituloDeContenido(notaActiva.contenido);
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

            {/* Modal de notas guardadas */}
            <ModalNotasGuardadas abierto={modalNotasAbierto} onCerrar={() => setModalNotasAbierto(false)} onSeleccionarNota={manejarSeleccionarNota} />

            {/* Overlay modo enfoque */}
            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo={esNotaNueva ? 'Nueva nota' : tituloActivo}>
                <Scratchpad valorInicial={notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={configuracion.tamanoFuente} altura="100%" delayGuardado={configuracion.autoGuardadoIntervalo} />
            </OverlayEnfoque>
        </div>
    );
}

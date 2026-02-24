/*
 * PanelScratchpad
 * Componente que renderiza el panel de notas rápidas (Scratchpad)
 * Nota: En móvil el header del panel se oculta via CSS (Fase 10.8.3)
 *
 * Sistema de notas persistentes con autoguardado:
 * - Siempre hay una nota activa siendo editada
 * - Los cambios se guardan automáticamente después de 2 segundos de inactividad
 * - El título se extrae de la primera línea con #
 *
 * Fase 15.6: Se añadió autoguardado debounced y restauración de última nota
 */

import {Eraser, Settings, FolderOpen, Plus, Maximize2} from 'lucide-react';
import {SeccionEncabezado, Scratchpad, ModalNotasExpandido} from '../dashboard';
import {OverlayEnfoque} from '../shared';
import {Boton} from '../ui';
import type {ConfiguracionScratchpad} from '../../hooks/useConfiguracionScratchpad';
import {usePanelScratchpad} from '../../hooks/paneles/usePanelScratchpad';

interface PanelScratchpadProps {
    configuracion: ConfiguracionScratchpad;
    onAbrirModalConfigScratchpad: () => void;
    onCambiarAltura: (altura: string) => void;
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
}

export function PanelScratchpad({configuracion, onAbrirModalConfigScratchpad, onCambiarAltura, renderHandleArrastre, handleMinimizar}: PanelScratchpadProps): JSX.Element {
    const {modalNotasExpandidoAbierto, setModalNotasExpandidoAbierto, modoEnfoque, setModoEnfoque, notaActiva, actualizarContenido, tituloActivo, esNotaNueva, manejarNuevaNota, manejarLimpiar, manejarAbrirCarpeta} = usePanelScratchpad();

    return (
        <div className="panelDashboard internaColumna internaColumna--notas">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Notas')}
                subtitulo={esNotaNueva ? 'Nueva nota' : tituloActivo}
                variante="panelHeader"
                acciones={
                    <>
                        {/* Botón nueva nota */}
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={manejarNuevaNota}
                            icono={<Plus size={12} />}
                            title="Nueva nota"
                        />
                        {/* Botón abrir notas guardadas */}
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={manejarAbrirCarpeta}
                            icono={<FolderOpen size={12} />}
                            title="Ver notas guardadas"
                        />
                        {/* Botón limpiar */}
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={manejarLimpiar}
                            icono={<Eraser size={12} />}
                            title="Limpiar / Nueva nota"
                        />
                        {/* Botón configuración */}
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={onAbrirModalConfigScratchpad}
                            icono={<Settings size={12} />}
                            title="Configuración"
                        />
                        {/* Botón modo enfoque */}
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => setModoEnfoque(true)}
                            icono={<Maximize2 size={12} />}
                            title="Modo enfoque"
                        />
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

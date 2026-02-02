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

import {useState, useEffect, useRef} from 'react';
import {Eraser, Settings, FolderOpen, Plus, Maximize2} from 'lucide-react';
import {SeccionEncabezado, Scratchpad, ModalNotasExpandido} from '../dashboard';
import {OverlayEnfoque} from '../shared';
import {useNotasStore} from '../../stores/notasStore';
import {extraerTitulo, CONTENIDO_NOTA_NUEVA} from '../../utils/notasUtils';
import type {ConfiguracionScratchpad} from '../../hooks/useConfiguracionScratchpad';
import {useAlertas} from '../../hooks/useAlertas';

interface PanelScratchpadProps {
    configuracion: ConfiguracionScratchpad;
    onAbrirModalConfigScratchpad: () => void;
    onCambiarAltura: (altura: string) => void;
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
}

/* Constante para delay de autoguardado (ms) */
const DELAY_AUTOGUARDADO = 2000;

export function PanelScratchpad({configuracion, onAbrirModalConfigScratchpad, onCambiarAltura, renderHandleArrastre, handleMinimizar}: PanelScratchpadProps): JSX.Element {
    const [modalNotasExpandidoAbierto, setModalNotasExpandidoAbierto] = useState(false);
    const [modoEnfoque, setModoEnfoque] = useState(false);

    /* Estado global de notas */
    const notaActiva = useNotasStore(s => s.notaActiva);
    const notas = useNotasStore(s => s.notas);
    const crearNuevaNota = useNotasStore(s => s.crearNuevaNota);
    const actualizarContenido = useNotasStore(s => s.actualizarContenidoNotaActiva);
    const guardarNotaActiva = useNotasStore(s => s.guardarNotaActiva);
    const cargarNotas = useNotasStore(s => s.cargarNotas);
    const restaurarNotaActivaGuardada = useNotasStore(s => s.restaurarNotaActivaGuardada);

    /* Refs para autoguardado debounced */
    const timeoutGuardadoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const contenidoAnteriorRef = useRef<string>(notaActiva.contenido);

    const {mostrarExito} = useAlertas();

    /*
     * Efecto 1: Cargar notas al montar el componente
     * Solo se ejecuta una vez al inicio
     */
    useEffect(() => {
        cargarNotas(true);
    }, [cargarNotas]);

    /*
     * Efecto 2: Restaurar última nota activa cuando las notas se cargan
     * Se ejecuta cuando notas.length cambia de 0 a >0 (carga inicial completada)
     */
    useEffect(() => {
        if (notas.length > 0 && notaActiva.id === null && notaActiva.contenido === CONTENIDO_NOTA_NUEVA) {
            restaurarNotaActivaGuardada();
        }
    }, [notas.length, notaActiva.id, notaActiva.contenido, restaurarNotaActivaGuardada]);

    /*
     * Efecto 3: Autoguardado debounced
     * Se activa cuando el contenido cambia y está modificada
     * Usa debounce de 2 segundos para evitar guardar en cada keystroke
     */
    useEffect(() => {
        /* Solo guardar si hay cambio real y contenido válido */
        if (!notaActiva.modificada) return;
        if (notaActiva.contenido === contenidoAnteriorRef.current) return;
        if (notaActiva.contenido === CONTENIDO_NOTA_NUEVA) return;
        if (!notaActiva.contenido.trim()) return;

        /* Limpiar timeout anterior */
        if (timeoutGuardadoRef.current) {
            clearTimeout(timeoutGuardadoRef.current);
        }

        /* Programar nuevo guardado */
        timeoutGuardadoRef.current = setTimeout(() => {
            guardarNotaActiva();
            contenidoAnteriorRef.current = notaActiva.contenido;
        }, DELAY_AUTOGUARDADO);

        /* Cleanup al desmontar o cambiar */
        return () => {
            if (timeoutGuardadoRef.current) {
                clearTimeout(timeoutGuardadoRef.current);
            }
        };
    }, [notaActiva.contenido, notaActiva.modificada, guardarNotaActiva]);

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
        <div className="panelDashboard internaColumna internaColumna--notas">
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

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

import {useState, useRef, useCallback, useMemo} from 'react';
import {Eraser, Settings, FolderOpen, Plus, Maximize2, X, Copy, FileText, Columns} from 'lucide-react';
import {SeccionEncabezado, Scratchpad, ModalNotasExpandido} from '../dashboard';
import {OverlayEnfoque, MenuContextual, TabsPanel} from '../shared';
import {Boton} from '../ui';
import type {ConfiguracionScratchpad} from '../../hooks/useConfiguracionScratchpad';
import {usePanelScratchpad} from '../../hooks/paneles/usePanelScratchpad';
import {useNotasStore} from '../../stores/notasStore';

interface PanelScratchpadProps {
    configuracion: ConfiguracionScratchpad;
    onAbrirModalConfigScratchpad: () => void;
    onCambiarAltura: (altura: string) => void;
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    /* [263A-3] Props para duplicación de panel */
    panelId?: string;
    onDuplicarPanel?: () => void;
    onCerrarPanel?: () => void;
    onDividirPanel?: () => void;
    /* [318A-14] Tabs de notas en el panel (cada nota es una tab). */
    usarTabsNotas?: boolean;
}

export function PanelScratchpad({configuracion, onAbrirModalConfigScratchpad, onCambiarAltura, renderHandleArrastre, handleMinimizar, onDuplicarPanel, onCerrarPanel, onDividirPanel, panelId, usarTabsNotas = false}: PanelScratchpadProps): JSX.Element {
    /* [263A-12] Cada panel usa su propio panelId para notas independientes */
    const panelIdResuelto = panelId ?? 'scratchpad';
    const {modalNotasExpandidoAbierto, setModalNotasExpandidoAbierto, modoEnfoque, setModoEnfoque, notaActiva, actualizarContenido, tituloActivo, esNotaNueva, manejarNuevaNota, manejarLimpiar, manejarAbrirCarpeta} = usePanelScratchpad(panelIdResuelto);

    /* [318A-14] Tabs de notas: se alimentan del store de notas (notas guardadas)
     * + la nota activa del panel. La activa siempre es un tab (la nueva si no
     * está guardada). */
    const notasGuardadas = useNotasStore(s => s.notas);
    const seleccionarNotaStore = useNotasStore(s => s.seleccionarNota);

    /* [318A-14] Cambiar de tab de nota: guarda la nota actual si tiene cambios
     * y luego selecciona la nota destino (mismo patrón que manejarAbrirCarpeta). */
    const cambiarNota = useCallback(async (id: string) => {
        const estado = useNotasStore.getState();
        const notaPanel = estado.notasActivaPorPanel[panelIdResuelto];
        if (notaPanel?.modificada && notaPanel.contenido.trim()) {
            await estado.guardarNotaActiva(panelIdResuelto);
        }
        const notaDestino = useNotasStore.getState().notas.find(n => n.id === id);
        if (notaDestino) {
            seleccionarNotaStore(panelIdResuelto, notaDestino);
        }
    }, [panelIdResuelto, seleccionarNotaStore]);

    /* Tabs: la nota activa primero (si es nueva con id null, se marca con su
     * título derivado), luego las notas guardadas que no sean la activa. */
    const tabsNotas = useMemo(() => {
        const tabs: {id: string; titulo: string}[] = [];
        const idActivo = notaActiva.id;
        if (idActivo) {
            tabs.push({id: idActivo, titulo: tituloActivo || 'Nota'});
        } else {
            /* Nota nueva sin guardar: tab virtual con título derivado */
            tabs.push({id: '__nueva__', titulo: tituloActivo || 'Nueva nota'});
        }
        notasGuardadas.forEach(n => {
            if (n.id !== idActivo) {
                tabs.push({id: n.id, titulo: n.titulo || 'Nota'});
            }
        });
        return tabs;
    }, [notaActiva.id, tituloActivo, notasGuardadas]);

    const tabNotaActivaId = notaActiva.id || '__nueva__';

    /* [253A-10] Submenú del botón + para crear nota en panel o ventana */
    const [menuNuevaNota, setMenuNuevaNota] = useState<{visible: boolean; x: number; y: number}>({visible: false, x: 0, y: 0});
    const btnNuevaNotaRef = useRef<HTMLButtonElement>(null);

    const abrirMenuNuevaNota = () => {
        if (btnNuevaNotaRef.current) {
            const rect = btnNuevaNotaRef.current.getBoundingClientRect();
            setMenuNuevaNota({visible: true, x: rect.left, y: rect.bottom + 4});
        }
    };

    /* [263A-3] Determinar si es un panel duplicado (tiene sufijo numérico) */
    const esDuplicado = !!onCerrarPanel;

    return (
        <div className="internaColumna internaColumna--notas">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Notas')}
                subtitulo={undefined}
                variante="panelHeader"
                acciones={
                    <>
                        {/* [263A-3] Botón nueva nota con submenú (duplicar panel) */}
                        <Boton
                            ref={btnNuevaNotaRef}
                            variante="badge"
                            soloIcono
                            onClick={abrirMenuNuevaNota}
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
                        {/* Botón dividir panel */}
                        {onDividirPanel && (
                            <Boton
                                variante="badge"
                                soloIcono
                                onClick={onDividirPanel}
                                icono={<Columns size={12} />}
                                title="Dividir panel"
                            />
                        )}
                        {/* [263A-3] Botón cerrar para paneles duplicados */}
                        {esDuplicado ? (
                            <Boton
                                variante="badge"
                                soloIcono
                                onClick={onCerrarPanel}
                                icono={<X size={12} />}
                                title="Cerrar panel duplicado"
                            />
                        ) : (
                            handleMinimizar
                        )}
                    </>
                }
            />
            {/* [318A-14] Tabs de notas: cada nota es una tab. Solo navegación
             * (sin renombrar/cerrar aquí; la gestión vive en el modal). */}
            {usarTabsNotas && (
                <TabsPanel
                    tabs={tabsNotas}
                    activaId={tabNotaActivaId}
                    onActivar={id => void cambiarNota(id)}
                />
            )}
            <Scratchpad valorInicial={notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={configuracion.tamanoFuente} altura={configuracion.altura} delayGuardado={configuracion.autoGuardadoIntervalo} onCambiarAltura={onCambiarAltura} />

            <ModalNotasExpandido abierto={modalNotasExpandidoAbierto} onCerrar={() => setModalNotasExpandidoAbierto(false)} tamanoFuente={configuracion.tamanoFuente} delayGuardado={configuracion.autoGuardadoIntervalo} panelId={panelIdResuelto} />

            {/* [263A-3] Submenú nueva nota: aquí o duplicar panel */}
            {menuNuevaNota.visible && (
                <MenuContextual
                    opciones={[
                        {id: 'aqui', etiqueta: 'Nueva nota', icono: <FileText size={12} />},
                        ...(onDuplicarPanel ? [{id: 'duplicar', etiqueta: 'Nota en nuevo panel', icono: <Copy size={12} />}] : [])
                    ]}
                    posicionX={menuNuevaNota.x}
                    posicionY={menuNuevaNota.y}
                    onSeleccionar={(id) => {
                        setMenuNuevaNota(prev => ({...prev, visible: false}));
                        if (id === 'aqui') {
                            manejarNuevaNota();
                        } else if (id === 'duplicar' && onDuplicarPanel) {
                            onDuplicarPanel();
                        }
                    }}
                    onCerrar={() => setMenuNuevaNota(prev => ({...prev, visible: false}))}
                />
            )}

            {/* Overlay modo enfoque */}
            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo={esNotaNueva ? 'Nueva nota' : tituloActivo}>
                <Scratchpad valorInicial={notaActiva.contenido} onChange={actualizarContenido} tamanoFuente={configuracion.tamanoFuente} altura="100%" delayGuardado={configuracion.autoGuardadoIntervalo} mostrarResizeHandle={false} />
            </OverlayEnfoque>
        </div>
    );
}

/*
 * DashboardVistas
 *
 * [318A-2] Modo Vistas: dashboard con vistas configurables.
 *
 * Cada vista es un grid libre de hasta 4 paneles que llenan la pantalla sin
 * scroll exterior (los paneles internos manejan su propio scroll). El grid usa
 * CSS Grid nativo:
 *  - `gridTemplateColumns/Rows` desde las proporciones (pesos → fr)
 *  - Cada celda ocupa un área con `gridColumn/gridRow` + span (fusiones)
 *  - Handles de resize absolutamente posicionados en los límites entre tracks
 *
 * Interacciones:
 *  - Elegir panel que muestra una celda (SelectorPanelCelda)
 *  - Mover/intercambiar paneles entre celdas (clic origen → clic destino)
 *  - Quitar un panel de la vista
 *  - [318A-2 fb] Agregar un panel de vuelta (botón flotante "+" con los
 *    paneles disponibles, menú contextual estándar)
 *  - Redimensionar filas/columnas con los handles
 */

import {useCallback, useMemo, useState} from 'react';
import type {DashboardCompletoRetorno} from '../../hooks/useDashboardCompleto';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import type {CeldaVista, Vista} from '../../types/vistas';
import {VistaCelda} from './vistas/VistaCelda';
import {VistaResizeHandle} from './vistas/VistaResizeHandle';
import {SelectorPanelCelda} from './vistas/SelectorPanelCelda';

interface DashboardVistasProps {
    vista: Vista;
    ctx: DashboardCompletoRetorno;
    onCambiarPanelCelda: (vistaId: string, celdaId: string, panelId: PanelId) => void;
    onQuitarPanel: (vistaId: string, panelId: PanelId) => void;
    onMoverPanel: (vistaId: string, celdaOrigenId: string, celdaDestinoId: string) => void;
    onAgregarPanel: (vistaId: string, panelId: PanelId) => void;
    obtenerPanelesDisponibles: (vistaId: string) => PanelId[];
    onAjustarProporcionesFilas: (vistaId: string, pesos: number[]) => void;
    onAjustarProporcionesColumnas: (vistaId: string, pesos: number[]) => void;
    onDividirPanel?: (baseId: PanelId) => void;
}

/* Estado del selector de panel de una celda: celda + posición del ancla */
interface SelectorEstado {
    celdaId: string;
    x: number;
    y: number;
}

export function DashboardVistas({
    vista,
    ctx,
    onCambiarPanelCelda,
    onQuitarPanel,
    onMoverPanel,
    onAgregarPanel,
    obtenerPanelesDisponibles,
    onAjustarProporcionesFilas,
    onAjustarProporcionesColumnas,
    onDividirPanel
}: DashboardVistasProps): JSX.Element | null {
    const [selectorCelda, setSelectorCelda] = useState<SelectorEstado | null>(null);
    const [celdaOrigenMover, setCeldaOrigenMover] = useState<string | null>(null);

    const celdas = vista.celdas;
    const total = celdas.length;
    if (total === 0) return null;

    /* Estilos del grid desde las proporciones (pesos → fr) */
    const estiloGrid = useMemo(() => ({
        /* sentinel-disable inline-style-prohibido */
        gridTemplateColumns: vista.proporcionesColumnas.map(w => `${w}fr`).join(' '),
        gridTemplateRows: vista.proporcionesFilas.map(w => `${w}fr`).join(' '),
    }), [vista.proporcionesColumnas, vista.proporcionesFilas]);

    /* Handles de resize EN LOS BORDES REALES de cada celda.
     * Cada celda (cuadro) tiene:
     *  - Handle derecho (columna): ajusta el par de pesos de la última columna
     *    que ocupa la celda y la siguiente (índice 0-based = columna+ancho-2).
     *  - Handle inferior (fila): ajusta el par de pesos de la última fila que
     *    ocupa la celda y la siguiente (índice 0-based = fila+alto-2).
     * Solo se muestran si la celda no llega al borde final del grid (así no
     * hay handles duplicados en el límite derecho/inferior exterior). */
    const handlesCelda = useMemo(() => {
        const hs: {celdaId: string; tipo: 'derecha' | 'abajo'; indice: number; eje: 'x' | 'y'}[] = [];
        celdas.forEach(celda => {
            /* Última columna que ocupa la celda (1-based) */
            const colFinal = celda.columna + celda.ancho - 1;
            /* Borde derecho: solo si la celda no llega a la última columna */
            if (colFinal < vista.totalColumnas) {
                hs.push({
                    celdaId: celda.id,
                    tipo: 'derecha',
                    /* Par de pesos [colFinal-1, colFinal] (0-based) */
                    indice: colFinal - 1,
                    eje: 'x'
                });
            }
            /* Última fila que ocupa la celda (1-based) */
            const filaFinal = celda.fila + celda.alto - 1;
            /* Borde inferior: solo si la celda no llega a la última fila */
            if (filaFinal < vista.totalFilas) {
                hs.push({
                    celdaId: celda.id,
                    tipo: 'abajo',
                    /* Par de pesos [filaFinal-1, filaFinal] (0-based) */
                    indice: filaFinal - 1,
                    eje: 'y'
                });
            }
        });
        return hs;
    }, [celdas, vista.totalColumnas, vista.totalFilas]);

    /* Estilo del área de una celda (posición + span de fusión) */
    const estiloArea = useCallback((celda: CeldaVista) => ({
        /* sentinel-disable inline-style-prohibido */
        gridColumn: `${celda.columna} / span ${celda.ancho}`,
        gridRow: `${celda.fila} / span ${celda.alto}`,
    }), []);

    const handleElegir = useCallback((celdaId: string, x: number, y: number) => {
        /* Alternar: si ya está abierto el selector de esta celda, cerrar */
        setSelectorCelda(prev => prev && prev.celdaId === celdaId ? null : {celdaId, x, y});
    }, []);

    const handleMoverClick = useCallback((celdaId: string) => {
        setSelectorCelda(null);
        if (celdaOrigenMover === null) {
            setCeldaOrigenMover(celdaId);
        } else if (celdaOrigenMover === celdaId) {
            setCeldaOrigenMover(null);
        } else {
            onMoverPanel(vista.id, celdaOrigenMover, celdaId);
            setCeldaOrigenMover(null);
        }
    }, [celdaOrigenMover, onMoverPanel, vista.id]);

    const handleQuitar = useCallback((panelId: PanelId) => {
        onQuitarPanel(vista.id, panelId);
    }, [onQuitarPanel, vista.id]);

    /* [318A-4] El botón "agregar panel" (antes flotante aquí) vive ahora en el
     * encabezado nav (DashboardIsland → DashboardEncabezado → EncabezadoAcciones).
     * DashboardVistas solo conserva `onAgregarPanel` para aplicar la selección. */

    return (
        <div className="dashboardVistas" style={estiloGrid}>
            {celdas.map((celda, indice) => (
                <VistaCelda
                    key={celda.id}
                    celdaId={celda.id}
                    panelId={celda.panelId}
                    ctx={ctx}
                    estiloArea={estiloArea(celda)}
                    total={total}
                    indice={indice}
                    estaEligiendo={selectorCelda?.celdaId === celda.id}
                    estaOrigenMover={celdaOrigenMover === celda.id}
                    onElegirPanel={handleElegir}
                    onMover={handleMoverClick}
                    onQuitar={handleQuitar}
                    onDividirPanel={onDividirPanel}
                    /* Handles de resize en los bordes reales de ESTA celda */
                    handles={handlesCelda
                        .filter(h => h.celdaId === celda.id)
                        .map(h => (
                            <VistaResizeHandle
                                key={`${h.celdaId}-${h.tipo}`}
                                eje={h.eje}
                                tipo={h.tipo}
                                proporciones={h.eje === 'x' ? vista.proporcionesColumnas : vista.proporcionesFilas}
                                indice={h.indice}
                                onAjustar={pesos => h.eje === 'x'
                                    ? onAjustarProporcionesColumnas(vista.id, pesos)
                                    : onAjustarProporcionesFilas(vista.id, pesos)}
                            />
                        ))}
                />
            ))}

            {/* Selector de panel para una celda (menú contextual estándar) */}
            {selectorCelda && (
                <SelectorPanelCelda
                    celdaId={selectorCelda.celdaId}
                    posicionX={selectorCelda.x}
                    posicionY={selectorCelda.y}
                    onSeleccionar={(celdaId, panelId) => {
                        onCambiarPanelCelda(vista.id, celdaId, panelId);
                        setSelectorCelda(null);
                    }}
                    onCerrar={() => setSelectorCelda(null)}
                />
            )}
        </div>
    );
}

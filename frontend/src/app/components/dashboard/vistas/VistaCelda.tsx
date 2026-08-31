/*
 * VistaCelda
 *
 * [318A-2] Celda individual del grid libre del Modo Vistas.
 * Renderiza un panel (DashboardPanelView) dentro de un área del grid CSS
 * (columna/fila + span de fusión). Botones de acción en el encabezado del
 * panel: elegir panel (qué muestra), mover (intercambiar), quitar.
 *
 * No tiene scroll propio: el grid contiene el área y el panel interno maneja
 * su propio scroll (dashboardPanelView → panelDashboard → componente).
 */

import {useCallback} from 'react';
import {X, Shuffle, LayoutGrid} from 'lucide-react';
import {DashboardPanelView} from '../DashboardPanelView';
import type {DashboardCompletoRetorno} from '../../../hooks/useDashboardCompleto';
import type {PanelId} from '../../../hooks/useConfiguracionLayout';
import {Boton} from '../../ui';

interface VistaCeldaProps {
    celdaId: string;
    panelId: PanelId;
    ctx: DashboardCompletoRetorno;
    /* Estilos del área en el grid (gridRow/gridColumn con spans) */
    estiloArea: React.CSSProperties;
    /* Si hay más de una celda → se muestran acciones de mover/quitar */
    total: number;
    indice: number;
    /* Estados visuales del flujo de mover/elegir */
    estaEligiendo?: boolean;
    estaOrigenMover?: boolean;
    /* Handles de resize en los bordes reales de esta celda (opcional) */
    handles?: React.ReactNode;
    /* Permitir elegir qué panel muestra esta celda */
    onElegirPanel?: (celdaId: string) => void;
    /* Intercambiar el panel de esta celda con otra */
    onMover?: (celdaId: string) => void;
    /* Quitar el panel de la vista */
    onQuitar?: (panelId: PanelId) => void;
    /* Dividir panel en modo vistas (crea instancia baseId-N) */
    onDividirPanel?: (baseId: PanelId) => void;
}

export function VistaCelda({
    celdaId,
    panelId,
    ctx,
    estiloArea,
    total,
    indice,
    estaEligiendo = false,
    estaOrigenMover = false,
    handles,
    onElegirPanel,
    onMover,
    onQuitar,
    onDividirPanel
}: VistaCeldaProps): JSX.Element {
    const handleQuitar = useCallback(() => {
        onQuitar?.(panelId);
    }, [panelId, onQuitar]);

    /* Acciones extra del panel (en seccionAcciones) */
    const accionesExtra = total > 1 ? (
        <>
            {onElegirPanel && (
                <Boton variante="badge" soloIcono onClick={() => onElegirPanel(celdaId)} icono={<LayoutGrid size={12} />} title="Elegir panel que muestra" />
            )}
            {onMover && (
                <Boton variante="badge" soloIcono onClick={() => onMover(celdaId)} icono={<Shuffle size={12} />} title={estaOrigenMover ? 'Intercambiar con otra celda' : 'Mover / intercambiar'} />
            )}
            {onQuitar && (
                <Boton variante="badge" soloIcono onClick={handleQuitar} icono={<X size={12} />} title="Quitar de la vista" disabled={total <= 1} />
            )}
        </>
    ) : undefined;

    const clases = [
        'dashboardVistasCelda',
        estaEligiendo ? 'dashboardVistasCelda--eligiendo' : '',
        estaOrigenMover ? 'dashboardVistasCelda--origenMover' : ''
    ].filter(Boolean).join(' ');

    return (
        <div className={clases} style={estiloArea}>
            <DashboardPanelView panelId={panelId} ctx={ctx} accionesExtra={accionesExtra} onDividirPanel={onDividirPanel} />
            {/* Handles de resize en los bordes reales de este cuadro */}
            {handles}
        </div>
    );
}

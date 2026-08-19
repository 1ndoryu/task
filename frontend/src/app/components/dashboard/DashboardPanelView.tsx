/*
 * DashboardPanelView
 *
 * [300A-2] Contenedor que renderiza un panel individual en modo sidebar.
 * Reutiliza useDashboardGrid para generar props consistentes con DashboardGrid.
 *
 * Props:
 *  - panelId: ID del panel a renderizar
 *  - ctx: contexto completo del dashboard (useDashboardCompleto)
 *  - esMovil: si está en móvil (redirige al sistema de navegación móvil existente)
 */

import {useEffect, useState} from 'react';
import type {DashboardCompletoRetorno} from '../../hooks/useDashboardCompleto';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import {obtenerPanelOBase, panelPuedeMostrarse, obtenerIdBase, panelManejaAlturaPropia} from '../../config/registroPaneles';
import {useDashboardGrid, obtenerGeneradorPropsPanel} from '../../hooks/dashboard/useDashboardGrid';

interface DashboardPanelViewProps {
    panelId: PanelId;
    ctx: DashboardCompletoRetorno;
    esMovil?: boolean;
    /** [multi-panel-sidebar] Botones extra para renderizar en seccionAcciones
     *  Se inyectan a través de handleMinimizar que los paneles colocan en acciones */
    accionesExtra?: React.ReactNode;
    /** [20-08-2026] Dividir panel en modo sidebar: crea instancia baseId-N en la vista */
    onDividirPanel?: (baseId: string) => void;
}

export function DashboardPanelView({panelId, ctx, esMovil = false, accionesExtra, onDividirPanel}: DashboardPanelViewProps): JSX.Element | null {
    const {propsContexto, manejarToggleTarea, manejarEditarHabitoPorId} = useDashboardGrid(ctx, esMovil);
    const [animando, setAnimando] = useState(false);

    /* Animación de fade al cambiar de panel */
    useEffect(() => {
        setAnimando(true);
        const timer = setTimeout(() => setAnimando(false), 50);
        return () => clearTimeout(timer);
    }, [panelId]);

    const baseId = obtenerIdBase(panelId);
    if (!panelPuedeMostrarse(baseId)) return <div className="dashboardPanelVacio">Panel no disponible</div>;

    const definicionPanel = obtenerPanelOBase(panelId);
    if (!definicionPanel) return <div className="dashboardPanelVacio">Panel no encontrado</div>;

    /* En modo sidebar no hay handles de arrastre ni botón minimizar,
     * pero sí mostramos el título del panel en el encabezado.
     * [multi-panel-sidebar] accionesExtra se inyectan via handleMinimizar
     * para que aparezcan en seccionAcciones de cada panel */
    const noopHandle = (titulo?: string) => titulo ? <span className="handleArrastre__titulo">{titulo}</span> : <></>;
    const handleConAcciones = (<>{accionesExtra}</>);

    const generadorProps = obtenerGeneradorPropsPanel(panelId, baseId);

    /* Generar props según el tipo de panel */
    // sentinel-disable-next-line any-type-explicito — dispatch dinámico por registro de paneles
    let props: any;
    if (baseId === 'ejecucion') {
        props = generadorProps(propsContexto, noopHandle, handleConAcciones, manejarToggleTarea, manejarEditarHabitoPorId, esMovil);
    } else {
        props = generadorProps(propsContexto, noopHandle, handleConAcciones, esMovil);
    }

    /* [20-08-2026] Inyectar panelId a todos los paneles (igual que DashboardGrid):
     * sin esto, las instancias divididas en sidebar (ejecucion-2, scratchpad-1)
     * quedan sin panelId y los selectores por-instancia (grupo de ejecución) no
     * persisten el cambio (cambiarGrupo hace no-op sin panelId). */
    props.panelId = panelId;

    /* [20-08-2026] Dividir panel en modo sidebar: mismo contrato que
     * DashboardGrid (onDividirPanel para ejecución y scratchpad), pero la
     * acción crea una instancia en la grilla sidebar en vez de un split del grid. */
    if ((baseId === 'ejecucion' || baseId === 'scratchpad') && onDividirPanel) {
        props.onDividirPanel = () => onDividirPanel(baseId);
    }

    const Componente = definicionPanel.componente;
    const manejaAltura = panelManejaAlturaPropia(panelId);

    return (
        <div className="dashboardPanelView">
            <div className={`${animando ? 'dashboardSidebarPanel--entrando' : 'dashboardSidebarPanel--visible'}`}>
                {manejaAltura ? (
                    <div className="panelDashboard">
                        <Componente {...props} />
                    </div>
                ) : (
                    <div className="panelDashboard" style={{/* sentinel-disable inline-style-prohibido */ height: '100%'}}>
                        <Componente {...props} />
                    </div>
                )}
            </div>
        </div>
    );
}
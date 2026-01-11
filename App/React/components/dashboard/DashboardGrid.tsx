/*
 * DashboardGrid
 * Componente que renderiza el grid de paneles del Dashboard
 * Extraído para reducir la complejidad de DashboardIsland
 *
 * Fase 10.8.1: En móvil, solo se renderiza el panel correspondiente
 * a la página activa seleccionada desde la navegación inferior
 */

import {useCallback, useMemo, CSSProperties} from 'react';
import {PanelArrastrable, HandleArrastre, BotonMinimizarPanel, ResizeHandlePanel, ResizeHandleColumn} from '../shared';
import {PanelFocoPrioritario, PanelProyectos, PanelEjecucion, PanelScratchpad, PanelActividad} from '../paneles';

import type {DashboardCompletoRetorno} from '../../hooks/useDashboardCompleto';
import type {PanelId} from '../../hooks/useConfiguracionLayout';
import type {PaginaMovil} from '../../hooks/usePaginaMovil';

interface DashboardGridProps {
    ctx: DashboardCompletoRetorno;
    esMovil?: boolean;
    paginaMovilActiva?: PaginaMovil;
}

/* Mapeo de PaginaMovil a PanelId para renderizado selectivo */
const PAGINA_A_PANEL: Record<PaginaMovil, PanelId> = {
    ejecucion: 'ejecucion',
    proyectos: 'proyectos',
    habitos: 'focoPrioritario',
    actividad: 'actividad'
};

export function DashboardGrid({ctx, esMovil = false, paginaMovilActiva = 'ejecucion'}: DashboardGridProps): JSX.Element {
    const {dashboard, modales, compartir, ordenHabitos, filtroTareas, ordenTareas, habitosComoTareas, configTareas, configHabitos, configProyectos, configScratchpad, configActividad, layout, arrastre, opciones, acciones, valorFiltroActual} = ctx;

    /*
     * Handler que intercepta toggles de tareas-hábito
     * Si es una tarea-hábito (ID negativo), llama al toggle del hábito
     * Si es una tarea normal, llama al toggle de tarea
     */
    const manejarToggleTarea = useCallback(
        (id: number) => {
            const fueHabito = habitosComoTareas.manejarToggleTareaHabito(id);
            if (!fueHabito) {
                dashboard.toggleTarea(id);
            }
        },
        [habitosComoTareas, dashboard]
    );

    /*
     * Handler para editar hábito por ID (para tareas-hábito en Ejecución)
     * Busca el hábito completo para pasarlo al modal
     */
    const manejarEditarHabitoPorId = useCallback(
        (habitoId: number) => {
            const habito = dashboard.habitos.find(h => h.id === habitoId);
            if (habito) {
                dashboard.abrirModalEditarHabito(habito);
            }
        },
        [dashboard]
    );

    /* Handler genérico para cambiar altura de paneles */
    const manejarCambiarAlturaPanel = useCallback(
        (panelId: PanelId, altura: string) => {
            layout.cambiarAlturaPanel(panelId, altura);
        },
        [layout]
    );

    const renderizarContenidoPanel = (panelId: PanelId): JSX.Element | null => {
        /* En móvil, no renderizamos handle de arrastre ni botón minimizar */
        const renderHandleArrastre = (titulo?: string) => (esMovil ? null : <HandleArrastre panelId={panelId} onMouseDown={arrastre.iniciarArrastre} estaArrastrando={arrastre.panelArrastrando === panelId} titulo={titulo} />);
        const handleMinimizarElement = esMovil ? null : <BotonMinimizarPanel panelId={panelId} onMinimizar={layout.ocultarPanel} />;

        /* Scratchpad tiene su propio sistema de resize interno y gestiona sus notas */
        if (panelId === 'scratchpad') {
            return <PanelScratchpad configuracion={configScratchpad.configuracion} onAbrirModalConfigScratchpad={modales.abrirModalConfigScratchpad} onCambiarAltura={configScratchpad.cambiarAltura} renderHandleArrastre={renderHandleArrastre} handleMinimizar={handleMinimizarElement} />;
        }

        /* Panel de Actividad */
        if (panelId === 'actividad') {
            return <PanelActividad configuracion={configActividad.configuracion} onAbrirModalConfigActividad={modales.abrirModalConfigActividad} renderHandleArrastre={renderHandleArrastre} handleMinimizar={handleMinimizarElement} />;
        }

        /* Obtener altura del panel desde configuración */
        const alturaPanel = layout.obtenerAlturaPanel(panelId);

        const panelesContenido: Partial<Record<PanelId, (alturaProps: {altura: string; isResizing: boolean; contenedorRef: React.RefObject<HTMLDivElement>; esAuto: boolean}) => JSX.Element>> = {
            focoPrioritario: ({altura, contenedorRef, esAuto}) => (
                <div ref={contenedorRef} className={`panelDashboard ${esMovil ? 'panelDashboard--movil' : ''}`} style={esAuto || esMovil ? undefined : {height: altura}}>
                    <PanelFocoPrioritario habitos={ordenHabitos.habitosOrdenados} modoOrdenHabitos={ordenHabitos.modoActual} opcionesOrdenHabitos={opciones.opcionesOrdenHabitos} configuracion={configHabitos.configuracion} onAbrirModalCrearHabito={() => modales.abrirCreacionRapida('habito')} onAbrirModalConfigHabitos={modales.abrirModalConfigHabitos} onToggleHabito={dashboard.toggleHabito} onEditarHabito={dashboard.abrirModalEditarHabito} onEliminarHabito={dashboard.eliminarHabito} onPosponerHabito={dashboard.posponerHabito} onMarcarDiaHabito={ctx.marcarDiaHabitoConSync} onDesmarcarDiaHabito={ctx.desmarcarDiaHabitoConSync} onCambiarModoHabitos={ordenHabitos.cambiarModo} renderHandleArrastre={renderHandleArrastre} handleMinimizar={handleMinimizarElement} />
                </div>
            ),
            proyectos: ({altura, contenedorRef, esAuto}) => (
                <div ref={contenedorRef} className={`panelDashboard ${esMovil ? 'panelDashboard--movil' : ''}`} style={esAuto || esMovil ? undefined : {height: altura}}>
                    <PanelProyectos
                        proyectos={dashboard.proyectos || []}
                        tareas={dashboard.tareas}
                        configuracion={configProyectos.configuracion}
                        opcionesOrdenProyectos={opciones.opcionesOrdenProyectos}
                        onAbrirModalCrearProyecto={() => modales.abrirCreacionRapida('proyecto')}
                        onAbrirModalEditarProyecto={modales.abrirModalEditarProyecto}
                        onAbrirModalConfigProyectos={modales.abrirModalConfigProyectos}
                        onEliminarProyecto={dashboard.eliminarProyecto}
                        onCambiarEstadoProyecto={dashboard.cambiarEstadoProyecto}
                        onCambiarOrdenProyectos={configProyectos.cambiarOrdenDefecto}
                        onCompartirProyecto={compartir.manejarCompartirProyecto}
                        estaCompartido={compartir.estaCompartidoProyecto}
                        onToggleTarea={dashboard.toggleTarea}
                        onCrearTarea={dashboard.crearTarea}
                        onEditarTarea={dashboard.editarTarea}
                        onEliminarTarea={dashboard.eliminarTarea}
                        onReordenarTareas={dashboard.reordenarTareas}
                        renderHandleArrastre={renderHandleArrastre}
                        handleMinimizar={handleMinimizarElement}
                        modoCompacto={configProyectos.configuracion.modoCompacto}
                    />
                </div>
            ),
            ejecucion: ({altura, contenedorRef, esAuto}) => (
                <div ref={contenedorRef} className={`panelDashboard internaColumna ${esMovil ? 'panelDashboard--movil' : ''}`} style={esAuto || esMovil ? undefined : {height: altura}}>
                    <PanelEjecucion
                        tareas={ordenTareas.tareasOrdenadas}
                        proyectos={dashboard.proyectos || []}
                        proyectoIdActual={filtroTareas.filtroActual.tipo === 'proyecto' ? filtroTareas.filtroActual.proyectoId : undefined}
                        ocultarCompletadas={configTareas.configuracion.ocultarCompletadas}
                        ocultarBadgeProyecto={configTareas.configuracion.ocultarBadgeProyecto}
                        modoOrden={ordenTareas.modoActual}
                        valorFiltroActual={valorFiltroActual}
                        opcionesFiltro={opciones.opcionesFiltro}
                        opcionesOrdenTareas={opciones.opcionesOrdenTareas}
                        esOrdenManual={ordenTareas.esOrdenManual}
                        onAbrirModalNuevaTarea={() => modales.abrirCreacionRapida('tarea')}
                        onAbrirModalConfigTareas={modales.abrirModalConfigTareas}
                        onToggleTarea={manejarToggleTarea}
                        onCrearTarea={dashboard.crearTarea}
                        onEditarTarea={dashboard.editarTarea}
                        onEliminarTarea={dashboard.eliminarTarea}
                        onReordenarTareas={dashboard.reordenarTareas}
                        onCambiarFiltro={acciones.manejarCambioFiltro}
                        onCambiarModoOrden={ordenTareas.cambiarModo}
                        onCompartirTarea={compartir.manejarCompartirTarea}
                        estaCompartida={compartir.estaCompartidaTarea}
                        obtenerParticipantes={compartir.obtenerParticipantesTarea}
                        renderHandleArrastre={renderHandleArrastre}
                        handleMinimizar={handleMinimizarElement}
                        onEditarHabito={manejarEditarHabitoPorId}
                        onEliminarHabito={dashboard.eliminarHabito}
                        onPosponerHabito={dashboard.posponerHabito}
                        modoCompacto={configTareas.configuracion.modoCompacto}
                    />
                </div>
            )
        };

        const renderContenido = panelesContenido[panelId];
        if (!renderContenido) return null;

        /* En móvil no usamos ResizeHandlePanel */
        if (esMovil) {
            return renderContenido({altura: 'auto', isResizing: false, contenedorRef: {current: null} as React.RefObject<HTMLDivElement>, esAuto: true});
        }

        return (
            <ResizeHandlePanel panelId={panelId} alturaInicial={alturaPanel} onCambiarAltura={manejarCambiarAlturaPanel}>
                {renderContenido}
            </ResizeHandlePanel>
        );
    };

    const renderizarPanel = (panelId: PanelId): JSX.Element => (
        <PanelArrastrable key={panelId} panelId={panelId} innerRef={el => arrastre.registrarPanel(panelId, el)} esArrastrando={arrastre.panelArrastrando === panelId} esDestino={arrastre.zonaDropActiva?.panelId === panelId} posicionDestino={arrastre.zonaDropActiva?.panelId === panelId ? arrastre.zonaDropActiva.posicion : null}>
            {renderizarContenidoPanel(panelId)}
        </PanelArrastrable>
    );

    const renderizarColumna = (columna: 1 | 2 | 3): JSX.Element[] => layout.obtenerPanelesColumna(columna).map(renderizarPanel);

    /* Calcular estilos dinámicos con CSS variables para anchos de columna (fr units) */
    const estiloGrid = useMemo((): CSSProperties => {
        const anchos = layout.anchos;
        return {
            '--col1-ancho': `${anchos.columna1}%`,
            '--col2-ancho': `${anchos.columna2}%`,
            '--col3-ancho': `${anchos.columna3}%`,
            '--col1-fr': `${anchos.columna1}fr`,
            '--col2-fr': `${anchos.columna2}fr`,
            '--col3-fr': `${anchos.columna3}fr`
        } as CSSProperties;
    }, [layout.anchos]);

    /*
     * MODO MÓVIL: Renderizamos solo el panel correspondiente a la página activa
     * Layout simplificado sin columnas, handles ni arrastre
     */
    if (esMovil) {
        const panelActivo = PAGINA_A_PANEL[paginaMovilActiva];

        return (
            <div className="dashboardGridContenedor dashboardGridContenedor--movil">
                <div className="dashboardGridMovil">{renderizarContenidoPanel(panelActivo)}</div>
            </div>
        );
    }

    /* MODO DESKTOP: Grid normal con columnas y handles */
    return (
        <div className="dashboardGridContenedor" style={{width: `${layout.anchoTotal}%`}}>
            <div className={`dashboardGridColumnas dashboardGridColumnas--${layout.modoColumnas}col ${arrastre.panelArrastrando ? 'arrastrandoPanel' : ''}`} style={estiloGrid}>
                {/* Columna 1 con handle al final si hay más columnas */}
                <div className="dashboardGridColumna dashboardGridColumna--conHandle">
                    {renderizarColumna(1)}
                    {layout.modoColumnas >= 2 && <ResizeHandleColumn tipo="interno" posicion={1} modoColumnas={layout.modoColumnas} anchos={layout.anchos} anchoTotal={layout.anchoTotal} onCambiarAnchos={layout.ajustarAnchos} onCambiarAnchoTotal={layout.cambiarAnchoTotal} />}
                </div>

                {/* Columna 2 con handle al final si hay 3 columnas */}
                {layout.modoColumnas >= 2 && (
                    <div className="dashboardGridColumna dashboardGridColumna--conHandle">
                        {renderizarColumna(2)}
                        {layout.modoColumnas === 3 && <ResizeHandleColumn tipo="interno" posicion={2} modoColumnas={layout.modoColumnas} anchos={layout.anchos} anchoTotal={layout.anchoTotal} onCambiarAnchos={layout.ajustarAnchos} onCambiarAnchoTotal={layout.cambiarAnchoTotal} />}
                    </div>
                )}

                {/* Columna 3 sin handle */}
                {layout.modoColumnas === 3 && <div className="dashboardGridColumna">{renderizarColumna(3)}</div>}
            </div>

            {/* Handle externo para ancho total */}
            <ResizeHandleColumn tipo="externo" modoColumnas={layout.modoColumnas} anchos={layout.anchos} anchoTotal={layout.anchoTotal} onCambiarAnchos={layout.ajustarAnchos} onCambiarAnchoTotal={layout.cambiarAnchoTotal} />
        </div>
    );
}

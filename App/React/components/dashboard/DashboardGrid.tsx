/*
 * DashboardGrid
 * Componente que renderiza el grid de paneles del Dashboard
 * Extraído para reducir la complejidad de DashboardIsland
 *
 * Refactor OCP - Fase 3: Ahora obtiene componentes dinámicamente del registro
 * ya no hay mapeos hardcodeados de paneles
 */

import {useCallback, useMemo, CSSProperties} from 'react';
import {PanelArrastrable, HandleArrastre, BotonMinimizarPanel, ResizeHandlePanel, ResizeHandleColumn} from '../shared';
import {obtenerPanel, panelManejaAlturaPropia, paginaMovilAPanelId} from '../../config/registroPaneles';

import type {DashboardCompletoRetorno} from '../../hooks/useDashboardCompleto';
import type {PanelId} from '../../hooks/useConfiguracionLayout';

/* Tipo para pages móviles - ahora dinámico desde el registro */
type PaginaMovil = string;

interface DashboardGridProps {
    ctx: DashboardCompletoRetorno;
    esMovil?: boolean;
    paginaMovilActiva?: PaginaMovil;
}

/*
 * Props que se pasan a cada panel según su tipo
 * Centraliza la lógica de qué props necesita cada panel
 */
interface PropsContextoPaneles {
    dashboard: DashboardCompletoRetorno['dashboard'];
    modales: DashboardCompletoRetorno['modales'];
    compartir: DashboardCompletoRetorno['compartir'];
    ordenHabitos: DashboardCompletoRetorno['ordenHabitos'];
    filtroTareas: DashboardCompletoRetorno['filtroTareas'];
    ordenTareas: DashboardCompletoRetorno['ordenTareas'];
    habitosComoTareas: DashboardCompletoRetorno['habitosComoTareas'];
    configTareas: DashboardCompletoRetorno['configTareas'];
    configHabitos: DashboardCompletoRetorno['configHabitos'];
    configProyectos: DashboardCompletoRetorno['configProyectos'];
    configScratchpad: DashboardCompletoRetorno['configScratchpad'];
    configActividad: DashboardCompletoRetorno['configActividad'];
    opciones: DashboardCompletoRetorno['opciones'];
    acciones: DashboardCompletoRetorno['acciones'];
    valorFiltroActual: DashboardCompletoRetorno['valorFiltroActual'];
    marcarDiaHabitoConSync: DashboardCompletoRetorno['marcarDiaHabitoConSync'];
    desmarcarDiaHabitoConSync: DashboardCompletoRetorno['desmarcarDiaHabitoConSync'];
}

/*
 * Factory para generar las props específicas de cada panel
 * Esto permite que DashboardGrid no necesite conocer los detalles de cada panel
 */
function generarPropsPanelEjecucion(ctx: PropsContextoPaneles, renderHandleArrastre: (titulo?: string) => JSX.Element, handleMinimizar: JSX.Element, manejarToggleTarea: (id: number) => void, manejarEditarHabitoPorId: (habitoId: number) => void) {
    const {dashboard, modales, compartir, filtroTareas, ordenTareas, configTareas, opciones, acciones, valorFiltroActual} = ctx;
    return {
        tareas: ordenTareas.tareasOrdenadas,
        proyectos: dashboard.proyectos || [],
        proyectoIdActual: filtroTareas.filtroActual.tipo === 'proyecto' ? filtroTareas.filtroActual.proyectoId : undefined,
        ocultarCompletadas: configTareas.configuracion.ocultarCompletadas,
        ocultarBadgeProyecto: configTareas.configuracion.ocultarBadgeProyecto,
        modoOrden: ordenTareas.modoActual,
        valorFiltroActual: valorFiltroActual,
        opcionesFiltro: opciones.opcionesFiltro,
        opcionesOrdenTareas: opciones.opcionesOrdenTareas,
        esOrdenManual: ordenTareas.esOrdenManual,
        onAbrirModalNuevaTarea: () => modales.abrirCreacionRapida('tarea'),
        onAbrirModalConfigTareas: modales.abrirModalConfigTareas,
        onToggleTarea: manejarToggleTarea,
        onCrearTarea: dashboard.crearTarea,
        onEditarTarea: dashboard.editarTarea,
        onEliminarTarea: dashboard.eliminarTarea,
        onReordenarTareas: dashboard.reordenarTareas,
        onCambiarFiltro: acciones.manejarCambioFiltro,
        onCambiarModoOrden: ordenTareas.cambiarModo,
        onCompartirTarea: compartir.manejarCompartirTarea,
        estaCompartida: compartir.estaCompartidaTarea,
        obtenerParticipantes: compartir.obtenerParticipantesTarea,
        renderHandleArrastre,
        handleMinimizar,
        onEditarHabito: manejarEditarHabitoPorId,
        onEliminarHabito: dashboard.eliminarHabito,
        onPosponerHabito: dashboard.posponerHabito,
        modoCompacto: configTareas.configuracion.modoCompacto,
        onConfigurarTarea: modales.abrirModalEditarTarea
    };
}

function generarPropsPanelFocoPrioritario(ctx: PropsContextoPaneles, renderHandleArrastre: (titulo?: string) => JSX.Element, handleMinimizar: JSX.Element) {
    const {dashboard, modales, ordenHabitos, configHabitos, opciones} = ctx;
    return {
        habitos: ordenHabitos.habitosOrdenados,
        modoOrdenHabitos: ordenHabitos.modoActual,
        opcionesOrdenHabitos: opciones.opcionesOrdenHabitos,
        configuracion: configHabitos.configuracion,
        onAbrirModalCrearHabito: () => modales.abrirCreacionRapida('habito'),
        onAbrirModalConfigHabitos: modales.abrirModalConfigHabitos,
        onToggleHabito: dashboard.toggleHabito,
        onEditarHabito: dashboard.abrirModalEditarHabito,
        onEliminarHabito: dashboard.eliminarHabito,
        onPosponerHabito: dashboard.posponerHabito,
        onPausarHabito: dashboard.pausarHabito,
        onMarcarDiaHabito: ctx.marcarDiaHabitoConSync,
        onDesmarcarDiaHabito: ctx.desmarcarDiaHabitoConSync,
        onCambiarModoHabitos: ordenHabitos.cambiarModo,
        renderHandleArrastre,
        handleMinimizar
    };
}

function generarPropsPanelProyectos(ctx: PropsContextoPaneles, renderHandleArrastre: (titulo?: string) => JSX.Element, handleMinimizar: JSX.Element) {
    const {dashboard, modales, compartir, configProyectos, opciones} = ctx;
    return {
        proyectos: dashboard.proyectos || [],
        tareas: dashboard.tareas,
        configuracion: configProyectos.configuracion,
        opcionesOrdenProyectos: opciones.opcionesOrdenProyectos,
        onAbrirModalCrearProyecto: () => modales.abrirCreacionRapida('proyecto'),
        onAbrirModalEditarProyecto: modales.abrirModalEditarProyecto,
        onAbrirModalConfigProyectos: modales.abrirModalConfigProyectos,
        onEliminarProyecto: dashboard.eliminarProyecto,
        onCambiarEstadoProyecto: dashboard.cambiarEstadoProyecto,
        onCambiarOrdenProyectos: configProyectos.cambiarOrdenDefecto,
        onCompartirProyecto: compartir.manejarCompartirProyecto,
        estaCompartido: compartir.estaCompartidoProyecto,
        onToggleTarea: dashboard.toggleTarea,
        onCrearTarea: dashboard.crearTarea,
        onEditarTarea: dashboard.editarTarea,
        onEliminarTarea: dashboard.eliminarTarea,
        onReordenarTareas: dashboard.reordenarTareas,
        renderHandleArrastre,
        handleMinimizar,
        modoCompacto: configProyectos.configuracion.modoCompacto
    };
}

function generarPropsPanelScratchpad(ctx: PropsContextoPaneles, renderHandleArrastre: (titulo?: string) => JSX.Element, handleMinimizar: JSX.Element) {
    const {modales, configScratchpad} = ctx;
    return {
        configuracion: configScratchpad.configuracion,
        onAbrirModalConfigScratchpad: modales.abrirModalConfigScratchpad,
        onCambiarAltura: configScratchpad.cambiarAltura,
        renderHandleArrastre,
        handleMinimizar
    };
}

function generarPropsPanelActividad(ctx: PropsContextoPaneles, renderHandleArrastre: (titulo?: string) => JSX.Element, handleMinimizar: JSX.Element) {
    const {modales, configActividad} = ctx;
    return {
        configuracion: configActividad.configuracion,
        onAbrirModalConfigActividad: modales.abrirModalConfigActividad,
        onAbrirUpgrade: modales.abrirModalUpgrade,
        renderHandleArrastre,
        handleMinimizar
    };
}

/*
 * Mapeo de panelId a función generadora de props
 * TO-DO: En el futuro, cada panel podría registrar su propia función generadora
 */
const GENERADORES_PROPS: Record<string, Function> = {
    ejecucion: generarPropsPanelEjecucion,
    focoPrioritario: generarPropsPanelFocoPrioritario,
    proyectos: generarPropsPanelProyectos,
    scratchpad: generarPropsPanelScratchpad,
    actividad: generarPropsPanelActividad
};

export function DashboardGrid({ctx, esMovil = false, paginaMovilActiva = 'ejecucion'}: DashboardGridProps): JSX.Element {
    const {dashboard, modales, compartir, ordenHabitos, filtroTareas, ordenTareas, habitosComoTareas, configTareas, configHabitos, configProyectos, configScratchpad, configActividad, layout, arrastre, opciones, acciones, valorFiltroActual} = ctx;

    /* Contexto de props compartido para los generadores */
    const propsContexto: PropsContextoPaneles = {
        dashboard,
        modales,
        compartir,
        ordenHabitos,
        filtroTareas,
        ordenTareas,
        habitosComoTareas,
        configTareas,
        configHabitos,
        configProyectos,
        configScratchpad,
        configActividad,
        opciones,
        acciones,
        valorFiltroActual,
        marcarDiaHabitoConSync: ctx.marcarDiaHabitoConSync,
        desmarcarDiaHabitoConSync: ctx.desmarcarDiaHabitoConSync
    };

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

    /*
     * Renderiza el contenido de un panel usando el registro
     * Obtiene el componente y genera las props dinámicamente
     */
    const renderizarContenidoPanel = (panelId: PanelId): JSX.Element | null => {
        const definicionPanel = obtenerPanel(panelId);
        if (!definicionPanel) {
            console.warn(`Panel "${panelId}" no encontrado en el registro`);
            return null;
        }

        /* En móvil, no renderizamos handle de arrastre ni botón minimizar */
        const renderHandleArrastre = (titulo?: string) => (esMovil ? <></> : <HandleArrastre panelId={panelId} onMouseDown={arrastre.iniciarArrastre} estaArrastrando={arrastre.panelArrastrando === panelId} titulo={titulo} />);
        const handleMinimizarElement = esMovil ? <></> : <BotonMinimizarPanel panelId={panelId} onMinimizar={layout.ocultarPanel} />;

        /* Obtener el generador de props para este panel */
        const generadorProps = GENERADORES_PROPS[panelId];
        if (!generadorProps) {
            console.warn(`No hay generador de props para panel "${panelId}"`);
            return null;
        }

        /* Generar props según el tipo de panel */
        let props: any;
        if (panelId === 'ejecucion') {
            props = generadorProps(propsContexto, renderHandleArrastre, handleMinimizarElement, manejarToggleTarea, manejarEditarHabitoPorId);
        } else {
            props = generadorProps(propsContexto, renderHandleArrastre, handleMinimizarElement);
        }

        const Componente = definicionPanel.componente;
        const manejaAltura = panelManejaAlturaPropia(panelId);

        /* Paneles que manejan su propia altura (scratchpad, actividad) */
        if (manejaAltura) {
            return <Componente {...props} />;
        }

        /* Obtener altura del panel desde configuración */
        const alturaPanel = layout.obtenerAlturaPanel(panelId);

        /* Función de renderizado para ResizeHandlePanel */
        const renderConContenedor = ({altura, contenedorRef, esAuto}: {altura: string; isResizing: boolean; contenedorRef: React.RefObject<HTMLDivElement>; esAuto: boolean}) => (
            <div ref={contenedorRef} className={`panelDashboard ${esMovil ? 'panelDashboard--movil' : ''}`} style={esAuto || esMovil ? undefined : {height: altura}}>
                <Componente {...props} />
            </div>
        );

        /* En móvil no usamos ResizeHandlePanel */
        if (esMovil) {
            return renderConContenedor({altura: 'auto', isResizing: false, contenedorRef: {current: null} as React.RefObject<HTMLDivElement>, esAuto: true});
        }

        return (
            <ResizeHandlePanel panelId={panelId} alturaInicial={alturaPanel} onCambiarAltura={manejarCambiarAlturaPanel}>
                {renderConContenedor}
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
        /* Obtener el panelId desde la página móvil usando el registro */
        const panelActivo = paginaMovilAPanelId(paginaMovilActiva) || 'ejecucion';

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

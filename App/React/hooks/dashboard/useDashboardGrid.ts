/*
 * useDashboardGrid
 * Hook que encapsula la lógica del grid de paneles del Dashboard
 * Maneja: construcción de contexto de props, callbacks de interacción,
 * generadores de props por panel, estilos del grid y refresh móvil
 *
 * Los generadores de props son funciones puras exportadas para que
 * el componente DashboardGrid los use al renderizar cada panel
 */

import {useCallback, useMemo, useRef, type CSSProperties} from 'react';
import type {DashboardCompletoRetorno} from '../useDashboardCompleto';
import type {PanelId} from '../useConfiguracionLayout';
import {usePluginsStore} from '../../stores/pluginsStore';
import type {DatosEdicionTarea, Tarea, Habito} from '../../types/dashboard';

/*
 * Props que se pasan a cada panel según su tipo
 * Centraliza la lógica de qué props necesita cada panel
 */
export interface PropsContextoPaneles {
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
    limites: DashboardCompletoRetorno['limites'];
}

/*
 * Generadores de props para cada tipo de panel
 * Son funciones puras que reciben el contexto y parámetros de renderizado,
 * y devuelven el objeto de props para el componente del panel
 */

export function generarPropsPanelEjecucion(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element,
    manejarToggleTarea: (id: number) => void,
    manejarEditarHabitoPorId: (habitoId: number) => void,
    esMovilActual: boolean
) {
    const {dashboard, modales, compartir, filtroTareas, ordenTareas, configTareas, opciones, acciones, valorFiltroActual, limites} = ctx;

    const crearTareaConLimite = (datos: DatosEdicionTarea) => {
        const tareasActivas = dashboard.tareas.filter((t: Tarea) => !t.completado).length;
        if (!limites.verificarYMostrar('tareasActivas', tareasActivas)) return;
        dashboard.crearTarea(datos);
    };

    const manejarConfigurarTarea = (tarea: Tarea) => {
        if (esMovilActual) {
            modales.abrirEdicionTareaMovil(tarea);
        } else {
            modales.abrirModalEditarTarea(tarea);
        }
    };

    return {
        tareas: ordenTareas.tareasOrdenadas,
        proyectos: dashboard.proyectos || [],
        proyectoIdActual: filtroTareas.filtroActual.tipo === 'proyecto' ? filtroTareas.filtroActual.proyectoId : undefined,
        ocultarCompletadas: configTareas.configuracion.ocultarCompletadas,
        ocultarBadgeProyecto: configTareas.configuracion.ocultarBadgeProyecto,
        ocultarSubtareasAutomaticamente: configTareas.configuracion.ocultarSubtareasAutomaticamente,
        modoOrden: ordenTareas.modoActual,
        valorFiltroActual: valorFiltroActual,
        opcionesFiltro: opciones.opcionesFiltro,
        opcionesOrdenTareas: opciones.opcionesOrdenTareas,
        esOrdenManual: ordenTareas.esOrdenManual,
        onAbrirModalNuevaTarea: () => modales.abrirCreacionRapida('tarea'),
        onAbrirModalConfigTareas: modales.abrirModalConfigTareas,
        onToggleTarea: manejarToggleTarea,
        onCrearTarea: crearTareaConLimite,
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
        onToggleHabito: dashboard.toggleHabito,
        onPosponerHabito: dashboard.posponerHabito,
        onPausarHabito: dashboard.pausarHabito,
        onActualizarHabito: dashboard.editarHabito,
        modoCompacto: configTareas.configuracion.modoCompacto,
        onConfigurarTarea: manejarConfigurarTarea
    };
}

export function generarPropsPanelFocoPrioritario(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element,
    esMovilActual: boolean
) {
    const {dashboard, modales, ordenHabitos, configHabitos, opciones} = ctx;

    const manejarEditarHabito = (habito: Habito) => {
        if (esMovilActual) {
            modales.abrirEdicionHabitoMovil(habito);
        } else {
            dashboard.abrirModalEditarHabito(habito);
        }
    };

    return {
        habitos: ordenHabitos.habitosOrdenados,
        modoOrdenHabitos: ordenHabitos.modoActual,
        opcionesOrdenHabitos: opciones.opcionesOrdenHabitos,
        configuracion: configHabitos.configuracion,
        onAbrirModalCrearHabito: () => modales.abrirCreacionRapida('habito'),
        onAbrirModalConfigHabitos: modales.abrirModalConfigHabitos,
        onToggleHabito: dashboard.toggleHabito,
        onEditarHabito: manejarEditarHabito,
        onEliminarHabito: dashboard.eliminarHabito,
        onPosponerHabito: dashboard.posponerHabito,
        onPausarHabito: dashboard.pausarHabito,
        onMarcarDiaHabito: ctx.marcarDiaHabitoConSync,
        onDesmarcarDiaHabito: ctx.desmarcarDiaHabitoConSync,
        onActualizarHabito: dashboard.editarHabito,
        onCambiarModoHabitos: ordenHabitos.cambiarModo,
        renderHandleArrastre,
        handleMinimizar
    };
}

export function generarPropsPanelProyectos(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    const {dashboard, modales, compartir, configProyectos, opciones, limites} = ctx;

    const crearTareaConLimite = (datos: DatosEdicionTarea) => {
        const tareasActivas = dashboard.tareas.filter((t: Tarea) => !t.completado).length;
        if (!limites.verificarYMostrar('tareasActivas', tareasActivas)) return;
        dashboard.crearTarea(datos);
    };

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
        onCrearTarea: crearTareaConLimite,
        onEditarTarea: dashboard.editarTarea,
        onEliminarTarea: dashboard.eliminarTarea,
        onReordenarTareas: dashboard.reordenarTareas,
        renderHandleArrastre,
        handleMinimizar,
        modoCompacto: configProyectos.configuracion.modoCompacto,
        onAbrirModalCrearTarea: (proyectoId: number) => modales.abrirCreacionRapida('tarea', {proyectoId})
    };
}

export function generarPropsPanelScratchpad(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    const {modales, configScratchpad} = ctx;
    return {
        configuracion: configScratchpad.configuracion,
        onAbrirModalConfigScratchpad: modales.abrirModalConfigScratchpad,
        onCambiarAltura: configScratchpad.cambiarAltura,
        renderHandleArrastre,
        handleMinimizar
    };
}

export function generarPropsPanelActividad(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    const {modales, configActividad} = ctx;
    return {
        configuracion: configActividad.configuracion,
        onAbrirModalConfigActividad: modales.abrirModalConfigActividad,
        onAbrirUpgrade: modales.abrirModalUpgrade,
        renderHandleArrastre,
        handleMinimizar
    };
}

export function generarPropsPanelAyuno(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element,
    esMovilActual = false
) {
    const {dashboard, modales} = ctx;

    const configAyuno = usePluginsStore.getState().configuracionPlugins['ayuno'] as unknown as {habitoId?: number} | undefined;
    const habitoAyuno = configAyuno?.habitoId ? dashboard.habitos.find((h: Habito) => h.id === configAyuno.habitoId) : undefined;

    return {
        renderHandleArrastre,
        handleMinimizar,
        onAbrirConfiguracion: () => {
            if (!habitoAyuno) return;
            if (esMovilActual) {
                modales.abrirEdicionHabitoMovil(habitoAyuno);
            } else {
                dashboard.abrirModalEditarHabito(habitoAyuno);
            }
        }
    };
}

export function generarPropsPanelDeficitCalorico(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    const {modales} = ctx;
    return {
        renderHandleArrastre,
        handleMinimizar,
        onAbrirConfiguracion: modales.abrirModalConfigDeficitCalorico
    };
}

/*
 * Mapeo de panelId a función generadora de props
 * TO-DO: En el futuro, cada panel podría registrar su propia función generadora
 */
export const GENERADORES_PROPS: Record<string, Function> = {
    ejecucion: generarPropsPanelEjecucion,
    focoPrioritario: generarPropsPanelFocoPrioritario,
    proyectos: generarPropsPanelProyectos,
    scratchpad: generarPropsPanelScratchpad,
    actividad: generarPropsPanelActividad,
    ayuno: generarPropsPanelAyuno,
    'deficit-calorico': generarPropsPanelDeficitCalorico
};

/*
 * Hook principal que encapsula la lógica del DashboardGrid
 */
export function useDashboardGrid(ctx: DashboardCompletoRetorno, esMovil: boolean) {
    const {
        dashboard, modales, compartir, ordenHabitos, filtroTareas,
        ordenTareas, habitosComoTareas, configTareas, configHabitos,
        configProyectos, configScratchpad, configActividad,
        layout, opciones, acciones, valorFiltroActual, limites
    } = ctx;

    /* Ref nula para el path móvil donde contenedorRef no se usa realmente */
    const refMovilNula = useRef<HTMLDivElement>(null);

    /* Contexto de props compartido para los generadores */
    const propsContexto: PropsContextoPaneles = useMemo(() => ({
        dashboard, modales, compartir, ordenHabitos, filtroTareas,
        ordenTareas, habitosComoTareas, configTareas, configHabitos,
        configProyectos, configScratchpad, configActividad,
        opciones, acciones, valorFiltroActual,
        marcarDiaHabitoConSync: ctx.marcarDiaHabitoConSync,
        desmarcarDiaHabitoConSync: ctx.desmarcarDiaHabitoConSync,
        limites
    }), [
        dashboard, modales, compartir, ordenHabitos, filtroTareas,
        ordenTareas, habitosComoTareas, configTareas, configHabitos,
        configProyectos, configScratchpad, configActividad,
        opciones, acciones, valorFiltroActual,
        ctx.marcarDiaHabitoConSync, ctx.desmarcarDiaHabitoConSync, limites
    ]);

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
     * Adaptativo móvil/desktop
     */
    const manejarEditarHabitoPorId = useCallback(
        (habitoId: number) => {
            const habito = dashboard.habitos.find((h: Habito) => h.id === habitoId);
            if (habito) {
                if (esMovil) {
                    modales.abrirEdicionHabitoMovil(habito);
                } else {
                    dashboard.abrirModalEditarHabito(habito);
                }
            }
        },
        [dashboard, modales, esMovil]
    );

    /* Handler genérico para cambiar altura de paneles */
    const manejarCambiarAlturaPanel = useCallback(
        (panelId: PanelId, altura: string) => {
            layout.cambiarAlturaPanel(panelId, altura);
        },
        [layout]
    );

    /* Calcular estilos dinámicos con CSS variables para anchos de columna */
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
     * Callback de pull-to-refresh: sincroniza datos desde el servidor
     */
    const manejarRefreshMovil = useCallback(async () => {
        await dashboard.sincronizacion.sincronizarAhora();
    }, [dashboard.sincronizacion]);

    return {
        refMovilNula,
        propsContexto,
        manejarToggleTarea,
        manejarEditarHabitoPorId,
        manejarCambiarAlturaPanel,
        estiloGrid,
        manejarRefreshMovil
    };
}

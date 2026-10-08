/*
 * useDashboardGrid
 * Hook que encapsula la lógica del grid de paneles del Dashboard
 * Maneja: construcción de contexto de props, callbacks de interacción,
 * estilos del grid y refresh móvil
 *
 * Los generadores de props se encuentran en generadoresPropsPanel.ts
 */

import {useCallback, useMemo, useRef} from 'react';
import type {DashboardCompletoRetorno} from '../useDashboardCompleto';
import type {PanelId} from '../useConfiguracionLayout';
import type {Habito} from '../../types/dashboard';
import type {PropsContextoPaneles} from './generadoresPropsPanel';

/* Re-exportar para que DashboardGrid los use sin cambiar su import */
export {GENERADORES_PROPS, obtenerGeneradorPropsPanel} from './generadoresPropsPanel';

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

    /* Anchos de columna como texto (porcentajes y pesos fr): el contenedor los
     * publica inline como --col*-ancho/--col*-fr (seam CSS, antes objeto style directo) */
    const anchosColumna = useMemo(() => {
        const anchos = layout.anchos;
        return {
            col1Ancho: `${anchos.columna1}%`,
            col2Ancho: `${anchos.columna2}%`,
            col3Ancho: `${anchos.columna3}%`,
            col1Fr: `${anchos.columna1}fr`,
            col2Fr: `${anchos.columna2}fr`,
            col3Fr: `${anchos.columna3}fr`
        };
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
        anchosColumna,
        manejarRefreshMovil
    };
}

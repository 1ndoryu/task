/*
 * generadoresPropsPanel.ts
 * Funciones generadoras de props para los paneles del Dashboard que requieren
 * contexto amplio del dashboard (ejecución, foco prioritario, proyectos).
 *
 * Los generadores ligeros viven en generadoresPropsLigeros.ts (mismo patrón
 * puro, extraídos aquí abajo para respetar el límite de líneas).
 */

import type {DashboardCompletoRetorno} from '../useDashboardCompleto';
import {useHabitosStore} from '../../stores/habitosStore';
import type {DatosEdicionTarea, DatosNuevoHabito, Tarea, Habito} from '../../types/dashboard';
import {
    generarPropsPanelBase,
    generarPropsPanelScratchpad,
    generarPropsPanelActividad,
    generarPropsPanelAyuno,
    generarPropsPanelDeficitCalorico,
    generarPropsPanelIA,
    generarPropsPanelRecordatorios,
    generarPropsPanelGruposFb,
    generarPropsPanelExp
} from './generadoresPropsLigeros';

/* Fragmentos cohesivos de PropsContextoPaneles: el nombre exportado se mantiene
 * (composición por extends), los call-sites ven la misma forma plana. */
export interface PropsContextoPanelesNucleo {
    dashboard: DashboardCompletoRetorno['dashboard'];
    modales: DashboardCompletoRetorno['modales'];
    compartir: DashboardCompletoRetorno['compartir'];
    ordenHabitos: DashboardCompletoRetorno['ordenHabitos'];
    filtroTareas: DashboardCompletoRetorno['filtroTareas'];
    ordenTareas: DashboardCompletoRetorno['ordenTareas'];
    habitosComoTareas: DashboardCompletoRetorno['habitosComoTareas'];
    configTareas: DashboardCompletoRetorno['configTareas'];
    configHabitos: DashboardCompletoRetorno['configHabitos'];
}

export interface PropsContextoPanelesConfig {
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

export interface PropsContextoPaneles extends PropsContextoPanelesNucleo, PropsContextoPanelesConfig {}

export function generarPropsPanelEjecucion(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element,
    manejarToggleTarea: (id: number) => void,
    manejarEditarHabitoPorId: (habitoId: number) => void,
    esMovilActual: boolean
) {
    const {dashboard, modales, compartir, filtroTareas, ordenTareas, configTareas, opciones, acciones, valorFiltroActual, limites, habitosComoTareas} = ctx;

    const crearTareaConLimite = (datos: DatosEdicionTarea) => {
        const tareasActivas = dashboard.tareas.filter((t: Tarea) => !t.completado).length;
        if (!limites.verificarYMostrar('tareasActivas', tareasActivas)) return;
        dashboard.crearTarea(datos);
    };

    const manejarConfigurarTarea = (tarea: Tarea) => {
        /* [243A-19] Tareas virtuales de hábito (IDs negativos) no existen en BD.
         * - Hábito principal: -habitoId - 10000 → ID ∈ (-100000, -10000]
         * - Sub-hábito:       -(habitoId*1000+subId) - 100000 → ID < -100000 */
        if (tarea.id < -100000) {
            const habitoId = Math.floor(-(tarea.id + 100000) / 1000);
            manejarEditarHabitoPorId(habitoId);
            return;
        }
        if (tarea.id <= -10000 && tarea.id >= -100000) {
            const habitoId = -(tarea.id + 10000);
            manejarEditarHabitoPorId(habitoId);
            return;
        }
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
        valorFiltroActual,
        opcionesFiltro: opciones.opcionesFiltro,
        opcionesOrdenTareas: opciones.opcionesOrdenTareas,
        esOrdenManual: ordenTareas.esOrdenManual,
        onAbrirModalNuevaTarea: (valoresIniciales?: {grupoEjecucion?: string | null}) => modales.abrirCreacionRapida('tarea', valoresIniciales),
        onAbrirModalCrearHabito: () => modales.abrirCreacionRapida('habito'),
        onAbrirModalConfigTareas: () => modales.abrirModalConfigGlobal('tareas'),
        onToggleTarea: manejarToggleTarea,
        onCrearTarea: crearTareaConLimite,
        onEditarTarea: dashboard.editarTarea,
        /* [263A-2] Interceptar subhábitos virtuales (IDs negativos). */
        onEliminarTarea: (id: number) => {
            const fueSubhabito = habitosComoTareas.manejarEliminarTareaHabito(id);
            if (!fueSubhabito) dashboard.eliminarTarea(id);
        },
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
        onPosponerHabitoConTiempo: dashboard.posponerHabitoConTiempo,
        onPausarHabito: dashboard.pausarHabito,
        /* [21-08-2026] onActualizarHabito va directo al store (undefined = no tocar). */
        onActualizarHabito: (id: number, datos: Partial<Habito>) => useHabitosStore.getState().editarHabito(id, datos as DatosNuevoHabito),
        /* [207A-3] Subhábitos: store directo para toggle y eliminar */
        onToggleSubHabito: useHabitosStore.getState().toggleSubHabito,
        onEliminarSubHabito: useHabitosStore.getState().eliminarSubHabito,
        /* [217A-4] Subhábitos: posponer via dashboard wrapper (con mensaje + undo) */
        onPosponerSubHabitoConTiempo: dashboard.posponerSubHabitoConTiempo,
        onActualizarSubHabito: useHabitosStore.getState().editarSubHabito,
        onConfigurarSubHabito: dashboard.abrirModalEditarSubHabito,
        modoCompacto: configTareas.configuracion.modoCompacto,
        onConfigurarTarea: manejarConfigurarTarea,
        /* [218A-2] Orden de hábitos desde drag en panel de ejecución. */
        onReordenarHabitos: (ordenes: Map<number, number>) => {
            useHabitosStore.getState().actualizarOrdenEjecucionHabitos(ordenes);
        }
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
        tareas: dashboard.tareas,
        modoOrdenHabitos: ordenHabitos.modoActual,
        opcionesOrdenHabitos: opciones.opcionesOrdenHabitos,
        /* [218A-1] Orden manual para hábitos */
        esOrdenManual: ordenHabitos.esOrdenManual,
        onReordenarHabitos: dashboard.reordenarHabitos,
        configuracion: configHabitos.configuracion,
        onAbrirModalCrearHabito: () => modales.abrirCreacionRapida('habito'),
        onAbrirModalConfigHabitos: () => modales.abrirModalConfigGlobal('habitos'),
        onToggleHabito: dashboard.toggleHabito,
        onEditarHabito: manejarEditarHabito,
        onEliminarHabito: dashboard.eliminarHabito,
        onPosponerHabito: dashboard.posponerHabito,
        onPosponerHabitoConTiempo: dashboard.posponerHabitoConTiempo,
        onPausarHabito: dashboard.pausarHabito,
        onMarcarDiaHabito: ctx.marcarDiaHabitoConSync,
        onDesmarcarDiaHabito: ctx.desmarcarDiaHabitoConSync,
        /* [21-08-2026] Parche parcial directo al store (ver ejecucion) */
        onActualizarHabito: (id: number, datos: Partial<Habito>) => useHabitosStore.getState().editarHabito(id, datos as DatosNuevoHabito),
        onCambiarModoHabitos: ordenHabitos.cambiarModo,
        /* [217A-5] Subhábitos en panel de hábitos */
        onToggleSubHabito: useHabitosStore.getState().toggleSubHabito,
        onConfigurarSubHabito: dashboard.abrirModalEditarSubHabito,
        onPosponerSubHabitoConTiempo: dashboard.posponerSubHabitoConTiempo,
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
        onAbrirModalConfigProyectos: () => modales.abrirModalConfigGlobal('proyectos'),
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

/* [H-F12-11] Tipo concreto del generador: ctx + helpers de renderizado comunes
 * y props extra posicionales por tipo de panel. Sustituye a `Function` (any). */
export type GeneradorPropsPanel = (
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element,
    ...rest: unknown[]
) => unknown;

/* Mapeo de panelId a función generadora de props. Los generadores con argumentos
 * extra se asignan con cast acotado: sus params específicos son subtipos de
 * `unknown` y el chequeo real ocurre en el caller (dispatch por tipo de panel). */
export const GENERADORES_PROPS: Record<string, GeneradorPropsPanel> = {
    ejecucion: generarPropsPanelEjecucion as GeneradorPropsPanel,
    focoPrioritario: generarPropsPanelFocoPrioritario as GeneradorPropsPanel,
    proyectos: generarPropsPanelProyectos as GeneradorPropsPanel,
    scratchpad: generarPropsPanelScratchpad as GeneradorPropsPanel,
    actividad: generarPropsPanelActividad as GeneradorPropsPanel,
    ayuno: generarPropsPanelAyuno as GeneradorPropsPanel,
    'deficit-calorico': generarPropsPanelDeficitCalorico as GeneradorPropsPanel,
    ia: generarPropsPanelIA as GeneradorPropsPanel,
    /* [253A-11] Panel Grupos FB — solo necesita props base */
    gruposFb: generarPropsPanelGruposFb as GeneradorPropsPanel,
    /* [27-08-2026] Panel EXP (Game) — helpers base + abrir config del plugin */
    exp: generarPropsPanelExp as GeneradorPropsPanel,
    recordatorios: generarPropsPanelRecordatorios as GeneradorPropsPanel
};

export function obtenerGeneradorPropsPanel(panelId: string, baseId: string): GeneradorPropsPanel {
    return GENERADORES_PROPS[panelId] || GENERADORES_PROPS[baseId] || generarPropsPanelBase;
}
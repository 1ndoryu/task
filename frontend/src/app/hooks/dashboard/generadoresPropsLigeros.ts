/*
 * generadoresPropsLigeros.ts
 * Generadores de props sencillos, extraídos de generadoresPropsPanel.ts para
 * que ese archivo quede dentro del límite de líneas. Solo importan tipos del
 * original (sin runtime) y no se re-exportan: el mapa GENERADORES_PROPS los
 * usa internamente.
 */

import type {PropsContextoPaneles, GeneradorPropsPanel} from './generadoresPropsPanel';
import {usePluginsStore} from '../../stores/pluginsStore';

export function generarPropsPanelBase(
    _ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    return {renderHandleArrastre, handleMinimizar};
}

export function generarPropsPanelScratchpad(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    const {modales, configScratchpad} = ctx;
    return {
        configuracion: configScratchpad.configuracion,
        onAbrirModalConfigScratchpad: () => modales.abrirModalConfigGlobal('notas'),
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
        onAbrirModalConfigActividad: () => modales.abrirModalConfigGlobal('actividad'),
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
    const habitoAyuno = configAyuno?.habitoId ? dashboard.habitos.find((h: {id: number}) => h.id === configAyuno.habitoId) : undefined;

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
        onAbrirConfiguracion: () => modales.abrirModalConfigGlobal('deficitCalorico')
    };
}

/* [233A-69] Panel IA: props base + ejecutores de tareas para acciones del LLM. */
export function generarPropsPanelIA(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    return {
        renderHandleArrastre,
        handleMinimizar,
        crearTarea: ctx.dashboard.crearTarea,
        toggleTarea: ctx.dashboard.toggleTarea,
        editarTarea: ctx.dashboard.editarTarea,
        eliminarTarea: ctx.dashboard.eliminarTarea,
        tareas: ctx.dashboard.tareas,
        onAbrirConfigIA: () => ctx.modales.abrirModalConfigGlobal('panelIA')
    };
}

export function generarPropsPanelRecordatorios(
    _ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    return {renderHandleArrastre, handleMinimizar};
}

export function generarPropsPanelGruposFb(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    return {
        renderHandleArrastre,
        handleMinimizar,
        onAbrirConfigGruposFb: () => ctx.modales.abrirModalConfigGlobal('gruposFb')
    };
}

export function generarPropsPanelExp(
    ctx: PropsContextoPaneles,
    renderHandleArrastre: (titulo?: string) => JSX.Element,
    handleMinimizar: JSX.Element
) {
    return {
        renderHandleArrastre,
        handleMinimizar,
        onAbrirConfig: () => ctx.modales.abrirModalPluginsConConfig('exp')
    };
}

export type GeneradorPropsPanelLigero = GeneradorPropsPanel;
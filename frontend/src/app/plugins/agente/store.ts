/*
 * plugins/agente/store.ts
 * Store Zustand del plugin de agente: tabs (conversaciones) + mensajes +
 * estado de streaming. La fuente de verdad de las conversaciones y mensajes
 * es el SERVIDOR (persistencia multinavegador); este store es la sesión del
 * navegador actual (tab activa, mensajes en memoria, streaming en curso).
 * Al abrir una tab se carga el historial de BD (cargarHistorial).
 *
 * [039A-1/FASE-FINAL] Composición de slices por dominio (tiposAgente,
 * ayudasAgente, turnoAgente, sliceTabs, sliceTurnos, sliceTareas).
 */
import {create} from 'zustand';
import {cargarConfig} from './configAgente';
import {crearSliceTabs} from './sliceTabs';
import {crearSliceTurnos} from './sliceTurnos';
import {crearSliceTareas} from './sliceTareas';
import type {EstadoAgente, TabAgente} from './tiposAgente';

export type {EstadoAgente, EstadoAgenteAccionesConversacion, EstadoAgenteAccionesTabs, EstadoAgenteAccionesTurnos, EstadoAgenteAccionesTareas, EstadoAgenteDatos, MensajeTabAgente, TabAgente} from './tiposAgente';

export const useAgenteStore = create<EstadoAgente>()((set, get, store) => ({
    tabs: [],
    tabActivaId: null,
    conversacionesCargadas: false,
    cargandoLista: false,
    errorLista: null,
    config: cargarConfig(),
    tareasProgramadas: [],
    cargandoTareas: false,
    errorTareas: null,
    ...crearSliceTabs(set, get, store),
    ...crearSliceTurnos(set, get, store),
    ...crearSliceTareas(set, get, store),
}));

/* Selector: la tab activa completa (para el panel). */
export function useTabActivaAgente(): TabAgente | null {
    return useAgenteStore(s => {
        const tabId = s.tabActivaId;
        return s.tabs.find(t => t.conversacion.id === tabId) ?? null;
    });
}

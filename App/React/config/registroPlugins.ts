/*
 * config/registroPlugins.ts
 * Registro central de plugins disponibles
 * Patrón OCP: los plugins se auto-registran sin modificar este archivo
 * Similar a registroPaneles.ts pero para módulos opcionales
 */

import type {DefinicionPlugin} from '../types/plugins';

/* Mapa interno del registro de plugins */
const _registroPlugins: Map<string, DefinicionPlugin> = new Map();

/*
 * Registra un plugin en el sistema
 */
export function registrarPlugin(definicion: DefinicionPlugin): void {
    if (_registroPlugins.has(definicion.id)) {
        console.warn(`[Plugins] Plugin "${definicion.id}" ya registrado, sobrescribiendo...`);
    }
    _registroPlugins.set(definicion.id, definicion);
}

/*
 * Obtiene un plugin por su ID
 */
export function obtenerPlugin(id: string): DefinicionPlugin | undefined {
    return _registroPlugins.get(id);
}

/*
 * Obtiene todos los plugins registrados
 */
export function obtenerTodosPlugins(): DefinicionPlugin[] {
    return Array.from(_registroPlugins.values());
}

/*
 * Obtiene los IDs de todos los plugins registrados
 */
export function obtenerIdsPlugins(): string[] {
    return Array.from(_registroPlugins.keys());
}

/*
 * Verifica si un plugin está registrado
 */
export function pluginEstaRegistrado(id: string): boolean {
    return _registroPlugins.has(id);
}

/*
 * Obtiene los IDs de paneles de un plugin
 */
export function obtenerPanelesDePlugin(pluginId: string): string[] {
    const plugin = _registroPlugins.get(pluginId);
    return plugin?.panelesIds ?? [];
}

/* [034A-11] Dado un panelId, retorna el pluginId al que pertenece (si pertenece a alguno).
 * Retorna undefined si el panel no es de ningun plugin (es un panel base del dashboard). */
export function obtenerPluginDePanelId(panelId: string): string | undefined {
    for (const [pluginId, def] of _registroPlugins) {
        if (def.panelesIds.includes(panelId)) return pluginId;
    }
    return undefined;
}

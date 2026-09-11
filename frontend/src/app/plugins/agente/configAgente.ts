/*
 * plugins/agente/configAgente.ts
 * [039A-1/FASE-FINAL] Persistencia de la configuración del agente en
 * localStorage (defaults + normalización + carga), extraída de store.ts para
 * respetar el límite de líneas. Solo la usa el store.
 */

import type {ConfigAgente} from './service';

/* Configuración del agente persistida en localStorage y enviada en cada turno. */
const CLAVE_CONFIG = 'glory-agente-config';

/* Guarda la configuración en localStorage. Si el almacenamiento no está
 * disponible, la config se mantiene solo en memoria (sin fallo). */
export function guardarConfig(config: ConfigAgente): void {
    try {
        localStorage.setItem(CLAVE_CONFIG, JSON.stringify(config));
    } catch {
        /* almacenamiento no disponible: la config se mantiene solo en memoria */
    }
}

export const CONFIG_DEFECTO: ConfigAgente = {
    modo: 'predeterminado', modelo: 'commandcode', provider: 'glory', temperatura: 0.2, maxTokens: 2048,
    nivelRazonamiento: 'medium', idioma: 'es', incluirNotas: false, incluirTareasCompletadas: false,
    incluirHabitosPausados: false, permitirBusquedaWeb: true,
    permitirRecordatorios: true, promptSistema: '', maxTurns: 10,
    timeoutToolSecs: 15, incluirMemoria: true, incluirSkills: true,
    estilo: 'conciso', preferencias: '', workspace: '',
    maxVentana: 128000, umbralCompactacion: 0.5,
};

export function normalizarConfig(config: Partial<ConfigAgente>): ConfigAgente {
    const base = {...CONFIG_DEFECTO, ...config};
    return {
        ...base,
        provider: typeof base.provider === 'string' && base.provider.trim() ? base.provider.trim() : 'glory',
        modelo: (typeof base.modelo === 'string' ? base.modelo.trim().replace(/^glory\//, '') : '') || 'commandcode',
        temperatura: Math.max(0, Math.min(2, Number(base.temperatura) || 0)),
        maxTokens: Math.max(64, Math.min(4096, Math.round(Number(base.maxTokens) || 2048))),
        nivelRazonamiento: base.nivelRazonamiento === 'low' || base.nivelRazonamiento === 'high' ? base.nivelRazonamiento : 'medium',
        maxTurns: Math.max(1, Math.min(10, Math.round(Number(base.maxTurns) || 10))),
        timeoutToolSecs: Math.max(1, Math.min(15, Math.round(Number(base.timeoutToolSecs) || 15))),
        promptSistema: typeof base.promptSistema === 'string' ? base.promptSistema.trim().slice(0, 4000) : '',
        idioma: ['es', 'en', 'pt', 'fr'].includes(base.idioma) ? base.idioma : 'es',
        incluirMemoria: Boolean(base.incluirMemoria),
        incluirSkills: Boolean(base.incluirSkills),
        estilo: base.estilo === 'detallado' || base.estilo === 'amable' ? base.estilo : 'conciso',
        preferencias: typeof base.preferencias === 'string' ? base.preferencias.trim().slice(0, 2000) : '',
        workspace: typeof base.workspace === 'string' ? base.workspace.trim() : '',
        maxVentana: Math.max(8192, Math.min(512000, Math.round(Number(base.maxVentana) || 128000))),
        umbralCompactacion: Math.max(0.1, Math.min(0.9, Number(base.umbralCompactacion) || 0.5)),
    };
}

export function cargarConfig(): ConfigAgente {
    try {
        const crudo = localStorage.getItem(CLAVE_CONFIG);
        if (crudo) {
            const parsed = JSON.parse(crudo) as Partial<ConfigAgente>;
            return normalizarConfig({
                ...CONFIG_DEFECTO,
                ...parsed,
                modo: parsed.modo === 'meta' || parsed.modo === 'autonomo' || parsed.modo === 'predeterminado' ? parsed.modo : 'predeterminado',
                provider: typeof parsed.provider === 'string' && parsed.provider.trim() ? parsed.provider.trim() : 'glory',
                modelo: typeof parsed.modelo === 'string' && parsed.modelo.trim() ? parsed.modelo.replace(/^glory\//, '') : CONFIG_DEFECTO.modelo,
                temperatura: typeof parsed.temperatura === 'number' ? Math.max(0, Math.min(2, parsed.temperatura)) : CONFIG_DEFECTO.temperatura,
                maxTokens: typeof parsed.maxTokens === 'number' ? Math.max(64, Math.min(4096, Math.round(parsed.maxTokens))) : CONFIG_DEFECTO.maxTokens,
                nivelRazonamiento: parsed.nivelRazonamiento === 'low' || parsed.nivelRazonamiento === 'high' ? parsed.nivelRazonamiento : 'medium',
                maxTurns: typeof parsed.maxTurns === 'number' ? Math.max(1, Math.min(10, Math.round(parsed.maxTurns))) : CONFIG_DEFECTO.maxTurns,
                timeoutToolSecs: typeof parsed.timeoutToolSecs === 'number' ? Math.max(1, Math.min(15, Math.round(parsed.timeoutToolSecs))) : CONFIG_DEFECTO.timeoutToolSecs,
                idioma: parsed.idioma === 'es' || parsed.idioma === 'en' || parsed.idioma === 'pt' || parsed.idioma === 'fr' ? parsed.idioma : 'es',
                promptSistema: typeof parsed.promptSistema === 'string' ? parsed.promptSistema.slice(0, 4000) : '',
                incluirMemoria: typeof parsed.incluirMemoria === 'boolean' ? parsed.incluirMemoria : true,
                incluirSkills: typeof parsed.incluirSkills === 'boolean' ? parsed.incluirSkills : true,
                estilo: parsed.estilo === 'detallado' || parsed.estilo === 'amable' ? parsed.estilo : 'conciso',
                preferencias: typeof parsed.preferencias === 'string' ? parsed.preferencias.slice(0, 2000) : '',
                workspace: typeof parsed.workspace === 'string' ? parsed.workspace.trim() : '',
                maxVentana: typeof parsed.maxVentana === 'number' ? Math.max(8192, Math.min(512000, Math.round(parsed.maxVentana))) : CONFIG_DEFECTO.maxVentana,
                umbralCompactacion: typeof parsed.umbralCompactacion === 'number' ? Math.max(0.1, Math.min(0.9, parsed.umbralCompactacion)) : CONFIG_DEFECTO.umbralCompactacion,
            });
        }
    } catch {
        /* configuración corrupta: usar defaults */
    }
    return {...CONFIG_DEFECTO};
}

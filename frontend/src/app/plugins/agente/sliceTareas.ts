/* [039A-1/FASE-FINAL] Slice de tareas programadas + config del agente.
 * `establecerConfig` vive aquí (sección del panel) aunque su firma pertenece
 * a las acciones de turnos. */
import type {StateCreator} from 'zustand';
import {crearTareaProgramada, eliminarTareaProgramada, guardarConfigConversacion, listarTareasProgramadas} from './service';
import {guardarConfig} from './configAgente';
import {configDeTab} from './ayudasAgente';
import type {EstadoAgente, EstadoAgenteAccionesTareas, EstadoAgenteAccionesTurnos} from './tiposAgente';

export const crearSliceTareas: StateCreator<EstadoAgente, [], [], EstadoAgenteAccionesTareas & Pick<EstadoAgenteAccionesTurnos, 'establecerConfig'>> = (set, get) => ({
    cargarTareasProgramadas: async () => {
        set({cargandoTareas: true, errorTareas: null});
        try {
            const tareas = await listarTareasProgramadas();
            set({tareasProgramadas: tareas, cargandoTareas: false});
        } catch (error) {
            set({
                cargandoTareas: false,
                errorTareas: error instanceof Error ? error.message : 'No se pudieron cargar las tareas programadas',
            });
        }
    },

    crearTarea: async (datos) => {
        set({errorTareas: null});
        try {
            const tarea = await crearTareaProgramada(datos);
            set(state => ({tareasProgramadas: [tarea, ...state.tareasProgramadas]}));
        } catch (error) {
            set({errorTareas: error instanceof Error ? error.message : 'No se pudo crear la tarea programada'});
        }
    },

    eliminarTarea: async (id) => {
        set({errorTareas: null});
        try {
            await eliminarTareaProgramada(id);
            set(state => ({tareasProgramadas: state.tareasProgramadas.filter(t => t.id !== id)}));
        } catch (error) {
            set({errorTareas: error instanceof Error ? error.message : 'No se pudo eliminar la tarea programada'});
        }
    },

    establecerConfig: (config) => {
        const tabId = get().tabActivaId;
        /* [318A-8] La base es la config de la conversación activa (fuente de
         * verdad), no la global: así cada conversación conserva sus propios
         * valores y el selector no arrastra los de otra conversación. */
        const base = configDeTab(get(), tabId);
        const nueva = {...base, ...config};
        nueva.provider = (nueva.provider ?? '').trim() || 'glory';
        nueva.modelo = nueva.modelo.trim().replace(/^glory\//, '') || 'commandcode';
        nueva.temperatura = Math.max(0, Math.min(2, Number(nueva.temperatura) || 0));
        nueva.maxTokens = Math.max(64, Math.min(4096, Math.round(Number(nueva.maxTokens) || 2048)));
        nueva.nivelRazonamiento = nueva.nivelRazonamiento === 'low' || nueva.nivelRazonamiento === 'high' ? nueva.nivelRazonamiento : 'medium';
        nueva.maxTurns = Math.max(1, Math.min(10, Math.round(Number(nueva.maxTurns) || 10)));
        nueva.timeoutToolSecs = Math.max(1, Math.min(15, Math.round(Number(nueva.timeoutToolSecs) || 15)));
        nueva.promptSistema = nueva.promptSistema.trim().slice(0, 4000);
        nueva.idioma = ['es', 'en', 'pt', 'fr'].includes(nueva.idioma) ? nueva.idioma : 'es';
        nueva.incluirMemoria = Boolean(nueva.incluirMemoria);
        nueva.incluirSkills = Boolean(nueva.incluirSkills);
        nueva.estilo = nueva.estilo === 'detallado' || nueva.estilo === 'amable' ? nueva.estilo : 'conciso';
        nueva.preferencias = (nueva.preferencias ?? '').trim().slice(0, 2000);
        nueva.workspace = (nueva.workspace ?? '').trim();
        nueva.maxVentana = Math.max(8192, Math.min(512000, Math.round(Number(nueva.maxVentana) || 128000)));
        nueva.umbralCompactacion = Math.max(0.1, Math.min(0.9, Number(nueva.umbralCompactacion) || 0.5));
        if (nueva.modo !== 'predeterminado' && nueva.modo !== 'meta' && nueva.modo !== 'autonomo') {
            nueva.modo = 'predeterminado';
        }
        guardarConfig(nueva);
        set(state => ({
            config: nueva,
            tabs: state.tabs.map(t => t.conversacion.id === tabId ? {...t, config: nueva, conversacion: {...t.conversacion, config: nueva}} : t),
        }));
        if (tabId) void guardarConfigConversacion(tabId, nueva).catch(error => {
            set(state => ({tabs: state.tabs.map(t => t.conversacion.id === tabId ? {...t, error: error instanceof Error ? error.message : 'No se pudo guardar la configuración'} : t)}));
        });
    },
});

/* [253A-11] Store Zustand para Grupos de Facebook
 * Gestiona el estado de grupos detectados por la extensión fb-group-manager.
 * Fetch desde API WordPress, no persiste localmente (los datos viven en el servidor). */

import {create} from 'zustand';
import {devtools} from 'zustand/middleware';
import {gruposFbService} from '../services/gruposFbService';
import type {GrupoFb, CategoriaGrupoFb, EstadisticasGruposFb} from '../services/gruposFbService';

export type {GrupoFb, CategoriaGrupoFb, EstadisticasGruposFb};

interface GruposFbState {
    grupos: GrupoFb[];
    categorias: CategoriaGrupoFb[];
    estadisticas: EstadisticasGruposFb | null;
    cargando: boolean;
    error: string | null;
    inicializado: boolean;

    /* Filtros activos */
    filtros: {
        busqueda: string;
        categoria: string;
        importancia: string;
        mostrarOcultos: boolean;
    };
}

interface GruposFbActions {
    cargar: () => Promise<void>;
    cargarCategorias: () => Promise<void>;
    guardarCategorias: (categorias: Omit<CategoriaGrupoFb, 'id' | 'orden'>[]) => Promise<void>;
    actualizarGrupo: (id: number, datos: Partial<Pick<GrupoFb, 'categoria' | 'importancia' | 'oculto' | 'notas'>>) => Promise<void>;
    eliminarGrupo: (id: number) => Promise<void>;
    marcarPublicado: (id: number) => Promise<void>;
    setFiltro: (campo: keyof GruposFbState['filtros'], valor: string | boolean) => void;
    limpiarFiltros: () => void;
}

export type GruposFbStore = GruposFbState & GruposFbActions;

const FILTROS_INICIALES: GruposFbState['filtros'] = {
    busqueda: '',
    categoria: '',
    importancia: '',
    mostrarOcultos: false
};

export const useGruposFbStore = create<GruposFbStore>()(
    devtools(
        (set, get) => ({
            /* Estado inicial */
            grupos: [],
            categorias: [],
            estadisticas: null,
            cargando: false,
            error: null,
            inicializado: false,
            filtros: {...FILTROS_INICIALES},

            /* Cargar grupos desde API
             * [024A-9] Logs para diagnosticar por qué no se detectan grupos */
            cargar: async () => {
                if (get().cargando) return;
                set({cargando: true, error: null}, false, 'cargar/inicio');
                console.log('[GruposFb] Iniciando carga de grupos...');

                try {
                    const [grupos, estadisticas] = await Promise.all([
                        gruposFbService.listar(),
                        gruposFbService.estadisticas()
                    ]);

                    console.log('[GruposFb] Carga exitosa:', {total: grupos.length, estadisticas});

                    set({
                        grupos,
                        estadisticas,
                        cargando: false,
                        inicializado: true
                    }, false, 'cargar/exito');
                } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Error desconocido';
                    console.error('[GruposFb] Error al cargar:', msg, e);
                    set({cargando: false, error: msg, inicializado: true}, false, 'cargar/error');
                }
            },

            /* Cargar categorías */
            cargarCategorias: async () => {
                try {
                    const categorias = await gruposFbService.listarCategorias();
                    set({categorias}, false, 'cargarCategorias');
                } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Error cargando categorías';
                    set({error: msg}, false, 'cargarCategorias/error');
                }
            },

            /* [024A-30] Guardar categorías (replace-all) y recargar */
            guardarCategorias: async (nuevas) => {
                try {
                    const categorias = await gruposFbService.guardarCategorias(nuevas);
                    set({categorias}, false, 'guardarCategorias');
                } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Error guardando categorías';
                    set({error: msg}, false, 'guardarCategorias/error');
                    throw e;
                }
            },

            /* Actualizar grupo (optimista) */
            actualizarGrupo: async (id, datos) => {
                const estadoAnterior = get().grupos;

                /* Update optimista */
                set(state => ({
                    grupos: state.grupos.map(g => g.id === id ? {...g, ...datos} : g)
                }), false, 'actualizarGrupo/optimista');

                try {
                    const actualizado = await gruposFbService.actualizar(id, datos);
                    set(state => ({
                        grupos: state.grupos.map(g => g.id === id ? actualizado : g)
                    }), false, 'actualizarGrupo/confirmado');
                } catch (e) {
                    /* Rollback */
                    set({grupos: estadoAnterior}, false, 'actualizarGrupo/rollback');
                    throw e;
                }
            },

            /* Eliminar grupo (optimista) */
            eliminarGrupo: async (id) => {
                const estadoAnterior = get().grupos;

                set(state => ({
                    grupos: state.grupos.filter(g => g.id !== id)
                }), false, 'eliminarGrupo/optimista');

                try {
                    await gruposFbService.eliminar(id);
                } catch (e) {
                    set({grupos: estadoAnterior}, false, 'eliminarGrupo/rollback');
                    throw e;
                }
            },

            /* [034A-2] Toggle publicado: usa la respuesta del servidor para reflejar el estado real */
            marcarPublicado: async (id) => {
                const estadoAnterior = get().grupos;
                const grupoActual = estadoAnterior.find(g => g.id === id);
                if (!grupoActual) return;

                /* Optimista: toggle el estado local */
                const estabaPublicado = grupoActual.ultimaPublicacion && esPublicadoReciente(grupoActual.ultimaPublicacion);
                const nuevaPublicacion = estabaPublicado ? null : new Date().toISOString().replace('T', ' ').substring(0, 19);

                set(state => ({
                    grupos: state.grupos.map(g => g.id === id ? {...g, ultimaPublicacion: nuevaPublicacion} : g)
                }), false, 'togglePublicado/optimista');

                try {
                    const resultado = await gruposFbService.marcarPublicado(id);
                    /* Aplicar el estado real del servidor */
                    set(state => ({
                        grupos: state.grupos.map(g => g.id === id ? {...g, ultimaPublicacion: resultado.ultimaPublicacion} : g)
                    }), false, 'togglePublicado/confirmado');
                } catch {
                    /* Rollback */
                    set({grupos: estadoAnterior}, false, 'togglePublicado/rollback');
                }
            },

            /* Filtros */
            setFiltro: (campo, valor) => {
                set(state => ({
                    filtros: {...state.filtros, [campo]: valor}
                }), false, 'setFiltro');
            },

            limpiarFiltros: () => {
                set({filtros: {...FILTROS_INICIALES}}, false, 'limpiarFiltros');
            }
        }),
        {name: 'GruposFbStore'}
    )
);

/* Selectores memorizados */
export const useGruposFb = () => useGruposFbStore(s => s.grupos);
export const useGruposFbCargando = () => useGruposFbStore(s => s.cargando);
export const useGruposFbInicializado = () => useGruposFbStore(s => s.inicializado);
export const useGruposFbFiltros = () => useGruposFbStore(s => s.filtros);
export const useGruposFbEstadisticas = () => useGruposFbStore(s => s.estadisticas);
export const useCategoriasFb = () => useGruposFbStore(s => s.categorias);

/* [034A-2] Verifica si una publicación es "reciente" (dentro de las últimas 24h).
 * Exportada para usar en FilaGrupo y otros componentes. */
export function esPublicadoReciente(fecha: string | null, horasVentana = 24): boolean {
    if (!fecha) return false;
    const diff = Date.now() - new Date(fecha).getTime();
    return diff < horasVentana * 3600 * 1000;
}

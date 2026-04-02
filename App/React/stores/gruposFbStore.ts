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

            /* Marcar como publicado */
            marcarPublicado: async (id) => {
                const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);

                set(state => ({
                    grupos: state.grupos.map(g => g.id === id ? {...g, ultimaPublicacion: ahora} : g)
                }), false, 'marcarPublicado/optimista');

                try {
                    await gruposFbService.marcarPublicado(id);
                } catch (e) {
                    /* Recargar para estado consistente */
                    get().cargar();
                    throw e;
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

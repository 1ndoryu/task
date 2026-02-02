/*
 * gruposTareasStore
 * Store para gestionar grupos/secciones de tareas
 * Permite agrupar tareas con título editable y colapsar/expandir
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {GrupoTareas, Tarea} from '../types/dashboard';
import {obtenerFechaHoy} from '../utils/fecha';

/* Tipos de ordenamiento para grupos */
export type OrdenamientoGrupos = 'nombre' | 'importancia' | 'manual';

interface GruposTareasState {
    grupos: GrupoTareas[];
    /* Configuración para activar/desactivar secciones */
    seccionesActivas: boolean;
    /* Ordenamiento de grupos entre sí */
    ordenamientoGrupos: OrdenamientoGrupos;
}

interface GruposTareasAcciones {
    /* Activar/desactivar el sistema de secciones */
    toggleSecciones: () => void;

    /* Cambiar ordenamiento de grupos */
    setOrdenamientoGrupos: (orden: OrdenamientoGrupos) => void;

    /* CRUD de grupos */
    crearGrupo: (nombre: string, proyectoId?: number) => GrupoTareas;
    editarGrupo: (id: number, nombre: string) => void;
    eliminarGrupo: (id: number) => void;

    /* Colapso */
    toggleColapsarGrupo: (id: number) => void;
    colapsarTodos: () => void;
    expandirTodos: () => void;

    /* Reordenamiento */
    reordenarGrupos: (grupos: GrupoTareas[]) => void;

    /* Obtener grupo por ID */
    obtenerGrupo: (id: number) => GrupoTareas | undefined;

    /* Obtener grupos de un proyecto ordenados */
    obtenerGruposProyecto: (proyectoId?: number) => GrupoTareas[];
    
    /* Ordenar grupos según criterio y tareas (para calcular importancia) */
    ordenarGrupos: (grupos: GrupoTareas[], tareasPorGrupo: Map<number, Tarea[]>) => GrupoTareas[];
}

type GruposTareasStore = GruposTareasState & GruposTareasAcciones;

export const useGruposTareasStore = create<GruposTareasStore>()(
    persist(
        (set, get) => ({
            grupos: [],
            seccionesActivas: false,
            ordenamientoGrupos: 'manual' as OrdenamientoGrupos,

            toggleSecciones: () => {
                set(state => ({seccionesActivas: !state.seccionesActivas}));
            },

            setOrdenamientoGrupos: (orden: OrdenamientoGrupos) => {
                set({ordenamientoGrupos: orden});
            },

            crearGrupo: (nombre: string, proyectoId?: number) => {
                const nuevoGrupo: GrupoTareas = {
                    id: Date.now(),
                    nombre,
                    orden: get().grupos.length,
                    colapsado: false,
                    proyectoId,
                    fechaCreacion: obtenerFechaHoy()
                };

                set(state => ({grupos: [...state.grupos, nuevoGrupo]}));
                return nuevoGrupo;
            },

            editarGrupo: (id: number, nombre: string) => {
                set(state => ({
                    grupos: state.grupos.map(g => (g.id === id ? {...g, nombre} : g))
                }));
            },

            eliminarGrupo: (id: number) => {
                set(state => ({
                    grupos: state.grupos.filter(g => g.id !== id)
                }));
            },

            toggleColapsarGrupo: (id: number) => {
                set(state => ({
                    grupos: state.grupos.map(g => (g.id === id ? {...g, colapsado: !g.colapsado} : g))
                }));
            },

            colapsarTodos: () => {
                set(state => ({
                    grupos: state.grupos.map(g => ({...g, colapsado: true}))
                }));
            },

            expandirTodos: () => {
                set(state => ({
                    grupos: state.grupos.map(g => ({...g, colapsado: false}))
                }));
            },

            reordenarGrupos: (grupos: GrupoTareas[]) => {
                /* Actualizar orden basado en posición en el array */
                const gruposConOrden = grupos.map((g, index) => ({...g, orden: index}));
                set({grupos: gruposConOrden});
            },

            obtenerGrupo: (id: number) => {
                return get().grupos.find(g => g.id === id);
            },

            obtenerGruposProyecto: (proyectoId?: number) => {
                return get().grupos.filter(g => g.proyectoId === proyectoId).sort((a, b) => a.orden - b.orden);
            },

            /* Ordenar grupos según el criterio configurado */
            ordenarGrupos: (grupos: GrupoTareas[], tareasPorGrupo: Map<number, Tarea[]>) => {
                const orden = get().ordenamientoGrupos;

                switch (orden) {
                    case 'nombre':
                        return [...grupos].sort((a, b) => a.nombre.localeCompare(b.nombre));

                    case 'importancia':
                        /* Ordenar por importancia promedio de las tareas (mayor primero) */
                        return [...grupos].sort((a, b) => {
                            const tareasA = tareasPorGrupo.get(a.id) || [];
                            const tareasB = tareasPorGrupo.get(b.id) || [];

                            const promedioA = tareasA.length > 0 ? tareasA.reduce((sum, t) => sum + (t.prioridad || 1), 0) / tareasA.length : 0;
                            const promedioB = tareasB.length > 0 ? tareasB.reduce((sum, t) => sum + (t.prioridad || 1), 0) / tareasB.length : 0;

                            /* Mayor importancia primero */
                            return promedioB - promedioA;
                        });

                    case 'manual':
                    default:
                        return [...grupos].sort((a, b) => a.orden - b.orden);
                }
            }
        }),
        {
            name: 'grupos-tareas-storage',
            partialize: state => ({
                grupos: state.grupos,
                seccionesActivas: state.seccionesActivas,
                ordenamientoGrupos: state.ordenamientoGrupos
            })
        }
    )
);

/*
 * Hook auxiliar para verificar si las secciones están activas
 */
export function useSeccionesActivas(): boolean {
    return useGruposTareasStore(state => state.seccionesActivas);
}

/*
 * Hook auxiliar para obtener el ordenamiento de grupos
 */
export function useOrdenamientoGrupos(): OrdenamientoGrupos {
    return useGruposTareasStore(state => state.ordenamientoGrupos);
}

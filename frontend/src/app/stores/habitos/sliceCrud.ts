/*
 * stores/habitos/sliceCrud.ts
 * [H-F11-01] Slice CRUD de hábitos: estado base (habitos, inicializado) y
 * creación/edición/eliminación/restauración. La sanitización de subhábitos
 * vive en dedupSubhabitos.ts.
 */

import type {Habito, DatosNuevoHabito} from '../../types/dashboard';
import {obtenerFechaHoy} from '../../utils/fecha';
import {sanitizarSubhabitos} from './dedupSubhabitos';
import {useHabitosHistorialStore} from '../habitosHistorialStore';
import type {HabitosSliceCrud, CrearSliceHabitos} from './tipos';

export const crearSliceCrud: CrearSliceHabitos<HabitosSliceCrud> = (set, get) => ({
        habitos: [],
        inicializado: false,

        setHabitos: habitos => {
            /* [044A-25] Sanitizar subhábitos al recibir datos del servidor (dedupSubhabitos.ts) */
            const sanitizados = sanitizarSubhabitos(habitos).habitos;

            /* [247A-2] Preservar ordenEjecucion local si el servidor no lo envía.
             * Evita perder el orden manual del panel de Ejecución cuando el sync
             * descarga datos que no incluyen este campo. */
            const actuales = get().habitos;
            const conOrdenPreservado = sanitizados.map(h => {
                if (h.ordenEjecucion !== undefined) return h;
                const existente = actuales.find(a => a.id === h.id);
                if (existente?.ordenEjecucion !== undefined) {
                    return {...h, ordenEjecucion: existente.ordenEjecucion};
                }
                return h;
            });
            set({habitos: conOrdenPreservado, inicializado: true}, false, 'setHabitos');
        },

        marcarInicializado: () => {
            set({inicializado: true}, false, 'marcarInicializado');
        },

        crearHabito: datos => {
            const hoy = obtenerFechaHoy();
            const nuevoHabito: Habito = {
                id: Date.now(),
                nombre: datos.nombre,
                importancia: datos.importancia,
                tags: datos.tags,
                frecuencia: datos.frecuencia,
                diasInactividad: 0,
                racha: 0,
                historialCompletados: [],
                ultimoCompletado: undefined,
                fechaCreacion: hoy,
                /* TAREA 4: Incluir ventana de oportunidad si se definió */
                ventanaOportunidad: datos.ventanaOportunidad,
                dependencias: datos.dependencias,
                grupoEjecucion: datos.grupoEjecucion,
                /* [014A-19] Timestamp per-entity para resolución de conflictos */
                updatedAt: Date.now()
            };

            set(state => ({habitos: [...state.habitos, nuevoHabito]}), false, 'crearHabito');
            return nuevoHabito;
        },

        editarHabito: (id, datos) => {
            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== id) return h;
                        const actualizado = {
                            ...h,
                            nombre: datos.nombre,
                            importancia: datos.importancia,
                            tags: datos.tags,
                            frecuencia: datos.frecuencia,
                            /* TAREA 4: Incluir ventana de oportunidad */
                            ventanaOportunidad: datos.ventanaOportunidad,
                            dependencias: datos.dependencias,
                            /* [014A-19] Timestamp per-entity */
                            updatedAt: Date.now()
                        };
                        /* Solo tocar grupoEjecucion si viene explicitamente */
                        if (datos.grupoEjecucion !== undefined) {
                            (actualizado as typeof actualizado & {grupoEjecucion?: string | null}).grupoEjecucion = datos.grupoEjecucion;
                        }
                        return actualizado;
                    })
                }),
                false,
                'editarHabito'
            );
        },

        eliminarHabito: id => {
            const habito = get().habitos.find(h => h.id === id);
            if (!habito) return null;

            set(state => ({habitos: state.habitos.filter(h => h.id !== id)}), false, 'eliminarHabito');

            /* Limpiar cache de historial detallado */
            useHabitosHistorialStore.getState().invalidarHistorialDetallado(id);

            return habito;
        },

        restaurarHabito: habito => {
            set(
                state => {
                    const existe = state.habitos.some(h => h.id === habito.id);
                    if (existe) {
                        return {habitos: state.habitos.map(h => (h.id === habito.id ? habito : h))};
                    }
                    return {habitos: [...state.habitos, habito]};
                },
                false,
                'restaurarHabito'
            );
        },

        restaurarHabitos: habitos => {
            set({habitos}, false, 'restaurarHabitos');
        }
    });

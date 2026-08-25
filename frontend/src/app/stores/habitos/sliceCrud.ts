/*
 * stores/habitos/sliceCrud.ts
 * [H-F11-01] Slice CRUD de hábitos: estado base (habitos, inicializado) y
 * creación/edición/eliminación/restauración. La sanitización de subhábitos
 * vive en dedupSubhabitos.ts.
 */

import type {Habito, DatosNuevoHabito} from '../../types/dashboard';
import {obtenerFechaHoy} from '../../utils/fecha';
import {sanitizarSubhabitos} from './dedupSubhabitos';
import {normalizarHabitos} from './normalizarHabitos';
import {useHabitosHistorialStore} from '../habitosHistorialStore';
import type {HabitosSliceCrud, CrearSliceHabitos} from './tipos';

export const crearSliceCrud: CrearSliceHabitos<HabitosSliceCrud> = (set, get) => ({
        habitos: [],
        inicializado: false,

        setHabitos: habitos => {
            /* [044A-25] Sanitizar subhábitos al recibir datos del servidor (dedupSubhabitos.ts) */
            const sanitizados = sanitizarSubhabitos(habitos).habitos;

            /* [H-F11-01] Normalizar campos obligatorios: cualquier entrada (server,
             * WS remoto, restauración) con nombre/importancia faltantes se cura
             * aquí para que el render nunca reciba un hábito parcial. */
            const normalizados = normalizarHabitos(sanitizados).habitos;

            /* [247A-2] Preservar ordenEjecucion local si el servidor no lo envía.
             * Evita perder el orden manual del panel de Ejecución cuando el sync
             * descarga datos que no incluyen este campo. */
            const actuales = get().habitos;
            const conOrdenPreservado = normalizados.map(h => {
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

        /* [21-08-2026] editarHabito con semántica de fusión: solo toca los campos
         * presentes en `datos` (undefined = no tocar). Antes sobreescribía TODOS
         * los campos con `datos.*`, de modo que las llamadas parciales (cambiar
         * importancia desde el menú contextual, asignar/desasignar grupo al
         * renombrar/eliminar un grupo) borraban nombre/importancia/tags/frecuencia
         * y el registro envenenado tumbaba la isla (importancia.toUpperCase()).
         * Igual que aplicarDatosEdicion (tareas) y editarSubHabito: null quita,
         * undefined no toca, el resto asigna. */
        editarHabito: (id, datos) => {
            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== id) return h;
                        const actualizado: Habito = {
                            ...h,
                            /* [014A-19] Timestamp per-entity */
                            updatedAt: Date.now()
                        };
                        if (datos.nombre !== undefined) actualizado.nombre = datos.nombre;
                        if (datos.importancia !== undefined) actualizado.importancia = datos.importancia;
                        if (datos.tags !== undefined) actualizado.tags = datos.tags;
                        if (datos.frecuencia !== undefined) actualizado.frecuencia = datos.frecuencia;
                        if (datos.descripcion !== undefined) actualizado.descripcion = datos.descripcion;
                        if (datos.icono !== undefined) actualizado.icono = datos.icono;
                        if (datos.colorIcono !== undefined) actualizado.colorIcono = datos.colorIcono;
                        /* TAREA 4: Incluir ventana de oportunidad */
                        if (datos.ventanaOportunidad !== undefined) actualizado.ventanaOportunidad = datos.ventanaOportunidad;
                        if (datos.dependencias !== undefined) actualizado.dependencias = datos.dependencias;
                        /* null = quitar grupo, valor = asignar, undefined = no tocar */
                        if (datos.grupoEjecucion !== undefined) actualizado.grupoEjecucion = datos.grupoEjecucion;
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
            const normalizado = normalizarHabitos([habito]).habitos[0] ?? habito;
            set(
                state => {
                    const existe = state.habitos.some(h => h.id === normalizado.id);
                    if (existe) {
                        return {habitos: state.habitos.map(h => (h.id === normalizado.id ? normalizado : h))};
                    }
                    return {habitos: [...state.habitos, normalizado]};
                },
                false,
                'restaurarHabito'
            );
        },

        restaurarHabitos: habitos => {
            const normalizados = normalizarHabitos(habitos).habitos;
            set({habitos: normalizados}, false, 'restaurarHabitos');
        }
    });

/*
 * utils/repeticionTareas.ts
 * [H-F12-02] Lógica de repetición de tareas, extraída de useTareas: generar
 * el ID local único y fabricar la siguiente instancia de una tarea repetida.
 */

import type {Tarea} from '../types/dashboard';
import {obtenerFechaHoy, sumarDias} from './fecha';

/* [H-F12-09] Date.now() como ID colisiona al crear dos tareas en el mismo
 * milisegundo (p. ej. al completar tareas repetidas). Combinado con un contador
 * monotónico da IDs locales únicos; sigue siendo numérico para el contrato
 * legacy_id del backend y no choca con los IDs seriales del servidor. */
let contadorIdTarea = 0;
export function generarIdTarea(): number {
    contadorIdTarea = (contadorIdTarea + 1) % 1000;
    return Date.now() * 1000 + contadorIdTarea;
}

/**
 * Genera la siguiente instancia de una tarea con repetición al completarla.
 * Devuelve null si no hay repetición, si ya existe una pendiente con el mismo
 * texto (no spammear) o si el intervalo no es positivo.
 */
export function generarTareaRepetida(tarea: Tarea, tareas: Tarea[]): Tarea | null {
    const configuracion = tarea.configuracion;
    if (!configuracion?.repeticion) return null;

    const {tipo, intervalo} = configuracion.repeticion;
    const yaExiste = tareas.some(t => t.texto === tarea.texto && !t.completado && t.id !== tarea.id);
    if (yaExiste || intervalo <= 0) return null;

    const hoy = obtenerFechaHoy();
    let nuevaFechaMaxima = '';
    if (tipo === 'despuesCompletar') {
        nuevaFechaMaxima = sumarDias(hoy, intervalo);
    } else {
        /* intervaloFijo: sumar a la fecha máxima anterior o a hoy si no existe */
        const base = configuracion.fechaMaxima || hoy;
        nuevaFechaMaxima = sumarDias(base, intervalo);
    }

    return {
        ...tarea,
        id: generarIdTarea(),
        completado: false,
        fechaCreacion: hoy,
        fechaCompletado: undefined,
        orden: 0 /* Se colocará al inicio */,
        configuracion: {
            ...configuracion,
            fechaMaxima: nuevaFechaMaxima,
            repeticion: {
                ...configuracion.repeticion,
                ultimaRepeticion: hoy
            }
        }
    };
}

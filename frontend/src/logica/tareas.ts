/* Escritura de tareas contra `PUT /api/tasks/:id`.
 * El backend no tiene un endpoint de «completar»: se manda la tarea entera con
 * `texto`, `completado`, etc. arriba y el resto del payload en `payload`, igual
 * que hacía el front original (`frontend-legacy/src/app/utils/mappersContrato.ts`).
 * `expectedUpdatedAt` va a null: sin conflictos de versión, la última escritura manda. */
import { pedir } from './cliente';
import type { Tarea } from './tipos';

export interface RespuestaEscritura {
  updatedAt?: string;
}

/** Cuerpo que espera `UpsertTaskRequest` en Rust. */
function tareaARequest(tarea: Tarea): Record<string, unknown> {
  return {
    texto: tarea.texto,
    completado: tarea.completado,
    prioridad: tarea.prioridad ?? null,
    urgencia: tarea.urgencia ?? 'normal',
    proyectoId: tarea.proyectoId ?? null,
    parentId: tarea.parentId ?? null,
    orden: tarea.orden ?? 0,
    payload: tarea,
    expectedUpdatedAt: null,
  };
}

export async function guardarTarea(tarea: Tarea): Promise<void> {
  await pedir<RespuestaEscritura>(`/tasks/${tarea.id}`, {
    method: 'PUT',
    body: JSON.stringify(tareaARequest(tarea)),
  });
}

/** Borrado lógico en el backend; no hay cuerpo en la respuesta (204). */
export async function borrarTarea(id: number): Promise<void> {
  await pedir<void>(`/tasks/${id}`, { method: 'DELETE' });
}

/** Aplica la configuración editada a la tarea y la escribe. */
export function editarTarea(
  tarea: Tarea,
  cambios: {
    texto: string;
    prioridad?: string | null;
    urgencia?: string | null;
    proyectoId?: number | null;
    fechaMaxima?: string;
    /** `undefined` deja el grupo como estaba; `null` la devuelve a «Tareas». */
    grupoEjecucion?: string | null;
  },
): Tarea {
  const configuracion = { ...tarea.configuracion };
  // La fecha límite vive en la configuración; vaciarla la quita del payload.
  if (cambios.fechaMaxima) configuracion.fechaMaxima = cambios.fechaMaxima;
  else delete configuracion.fechaMaxima;
  return {
    ...tarea,
    texto: cambios.texto,
    prioridad: cambios.prioridad ?? tarea.prioridad ?? null,
    urgencia: cambios.urgencia ?? tarea.urgencia ?? 'normal',
    proyectoId: cambios.proyectoId ?? null,
    grupoEjecucion: cambios.grupoEjecucion === undefined ? (tarea.grupoEjecucion ?? null) : cambios.grupoEjecucion,
    configuracion,
  };
}

/** Invierte `completado`; al completar, anota el día en la configuración. */
export function alternarCompletado(tarea: Tarea, hoy: string): Tarea {
  const completado = !tarea.completado;
  const configuracion = { ...tarea.configuracion };
  if (completado) configuracion.fechaCompletado = hoy;
  else delete configuracion.fechaCompletado;
  return { ...tarea, completado, configuracion };
}

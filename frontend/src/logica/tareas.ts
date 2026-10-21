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

/** Invierte `completado`; al completar, anota el día en la configuración. */
export function alternarCompletado(tarea: Tarea, hoy: string): Tarea {
  const completado = !tarea.completado;
  const configuracion = { ...tarea.configuracion };
  if (completado) configuracion.fechaCompletado = hoy;
  else delete configuracion.fechaCompletado;
  return { ...tarea, completado, configuracion };
}

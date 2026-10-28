/* Escritura de tareas contra `PUT /api/tasks/:id`.
 * El backend no tiene un endpoint de «completar»: se manda la tarea entera con
 * `texto`, `completado`, etc. arriba y el resto del payload en `payload`, igual
 * que hacía el front original (`frontend-legacy/src/app/utils/mappersContrato.ts`).
 * `expectedUpdatedAt` es la versión que tenía la copia: si otro cliente escribió
 * después, el servidor responde 409 y la cola de `vista/colaEscritura.ts` rebasa. */
import { pedir } from './cliente';
import { leerMomentos, type Momento } from './momentos';
import type { RespuestaEscritura, Tarea } from './tipos';

/** Cuerpo que espera `UpsertTaskRequest` en Rust. */
function tareaARequest(tarea: Tarea): Record<string, unknown> {
  // La versión viaja aparte: el `payload` guarda la tarea tal como la leyó el front.
  const { updatedAt: version, ...payload } = tarea;
  return {
    texto: tarea.texto,
    completado: tarea.completado,
    prioridad: tarea.prioridad ?? null,
    urgencia: tarea.urgencia ?? 'normal',
    proyectoId: tarea.proyectoId ?? null,
    parentId: tarea.parentId ?? null,
    orden: tarea.orden ?? 0,
    payload,
    expectedUpdatedAt: version ?? null,
  };
}

export async function guardarTarea(tarea: Tarea): Promise<RespuestaEscritura> {
  return pedir<RespuestaEscritura>(`/tasks/${tarea.id}`, {
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
    /** `undefined` deja los momentos como estaban; una lista vacía los quita. */
    momentos?: Momento[];
    /** `undefined` deja el grupo como estaba; `null` la devuelve a «Tareas». */
    grupoEjecucion?: string | null;
  },
): Tarea {
  const configuracion = { ...tarea.configuracion };
  // La fecha límite vive en la configuración; vaciarla la quita del payload.
  if (cambios.fechaMaxima) configuracion.fechaMaxima = cambios.fechaMaxima;
  else delete configuracion.fechaMaxima;
  if (cambios.momentos !== undefined) {
    if (cambios.momentos.length) configuracion.momentos = leerMomentos(cambios.momentos);
    else delete configuracion.momentos;
  }
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


/* Escritura de hábitos. El backend guarda el `payload` completo, así que el
 * grupo y la configuración viajan dentro de él, igual que en las tareas
 * (`PUT /api/habits/:id`). Marcar un día es su propia ruta:
 * `PUT /api/habits/:id/history` con `{date, status}`. */
import { pedir } from './cliente';
import { frecuenciaDe } from './frecuencia';
import { importanciaDeHabito } from './importancia';
import { leerMomentos, type Momento } from './momentos';
import type { FrecuenciaDetalle, Habito, SubHabito } from './tipos';

/** Cuerpo que espera `UpsertHabitRequest` en Rust (camelCase). */
function habitoARequest(habito: Habito): Record<string, unknown> {
  return {
    nombre: habito.nombre,
    // `importancia` y `frecuencia` son textos del contrato; si no hay, aplica
    // sus valores por defecto. `frecuencia` es una frase quedada del legacy:
    // el backend quiere el tipo, no el objeto (el objeto va en el payload).
    importancia: importanciaDeHabito(habito.importancia),
    frecuencia: frecuenciaDe(habito).tipo,
    orden: habito.orden ?? 0,
    payload: habito,
    expectedUpdatedAt: null,
  };
}

export async function guardarHabito(habito: Habito): Promise<void> {
  await pedir(`/habits/${habito.id}`, { method: 'PUT', body: JSON.stringify(habitoARequest(habito)) });
}

/** Borrado lógico; no hay cuerpo en la respuesta (204). */
export async function borrarHabito(id: number): Promise<void> {
  await pedir<void>(`/habits/${id}`, { method: 'DELETE' });
}

export async function marcarHabito(id: number, fecha: string, status: 'completado' | 'pospuesto' | 'omitido'): Promise<void> {
  await pedir(`/habits/${id}/history`, {
    method: 'PUT',
    body: JSON.stringify({ date: fecha, status }),
  });
}

export async function desmarcarHabito(id: number, fecha: string): Promise<void> {
  await pedir<void>(`/habits/${id}/history/${fecha}`, { method: 'DELETE' });
}

/** Cambios del modal de configuración aplicados a la copia del hábito. */
export function editarHabito(
  habito: Habito,
  cambios: {
    nombre: string;
    importancia?: string;
    grupoEjecucion?: string | null;
    /** Si falta, la frecuencia se queda como estaba. */
    frecuencia?: FrecuenciaDetalle;
    /** Si falta, los momentos se quedan como estaban; vacío los quita. */
    momentos?: Momento[];
    /** Si falta, los subhábitos se quedan como estaban: son del payload. */
    subhabitos?: SubHabito[];
  },
): Habito {
  const editado: Habito = {
    ...habito,
    nombre: cambios.nombre,
    importancia: cambios.importancia ?? habito.importancia,
    grupoEjecucion:
      cambios.grupoEjecucion === undefined ? (habito.grupoEjecucion ?? null) : cambios.grupoEjecucion,
    // La frecuencia viaja entera dentro del payload, conservando sus extras.
    frecuencia:
      cambios.frecuencia === undefined
        ? habito.frecuencia
        : { ...(typeof habito.frecuencia === 'object' && habito.frecuencia !== null ? habito.frecuencia : {}), ...cambios.frecuencia },
    subhabitos: cambios.subhabitos ?? habito.subhabitos,
  };
  // Vacío no se guarda: sin momentos el hábito no tiene preferencia.
  const momentos = cambios.momentos === undefined ? habito.momentos : leerMomentos(cambios.momentos);
  if (momentos?.length) editado.momentos = momentos;
  else delete editado.momentos;
  return editado;
}

/* Escritura de hábitos. El backend guarda el `payload` completo, así que el
 * grupo y la configuración viajan dentro de él, igual que en las tareas
 * (`PUT /api/habits/:id`). Marcar un día es su propia ruta:
 * `PUT /api/habits/:id/history` con `{date, status}`. */
import { pedir } from './cliente';
import type { Habito } from './tipos';

/** Cuerpo que espera `UpsertHabitRequest` en Rust (camelCase). */
function habitoARequest(habito: Habito): Record<string, unknown> {
  return {
    nombre: habito.nombre,
    // `importancia` e `frecuencia` son textos del contrato; si no hay, el
    // backend aplica sus valores por defecto.
    importancia: habito.importancia ?? 'media',
    frecuencia: typeof habito.frecuencia === 'string' ? habito.frecuencia : (habito.frecuencia?.tipo ?? 'diario'),
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
  cambios: { nombre: string; importancia?: string; grupoEjecucion?: string | null },
): Habito {
  return {
    ...habito,
    nombre: cambios.nombre,
    importancia: cambios.importancia ?? habito.importancia,
    grupoEjecucion:
      cambios.grupoEjecucion === undefined ? (habito.grupoEjecucion ?? null) : cambios.grupoEjecucion,
  };
}

/* La misma escala de cinco niveles se escribe de dos maneras en el contrato:
 * la tarea usa ids (`muy_alta`) y el hábito textos capitalizados (`Muy Alta`).
 * Estas dos funciones son el único punto de traducción: el modal y el menú
 * trabajan siempre con el id, y cada escritura lo pasa a la forma que su
 * endpoint espera. */

const NIVELES = ['muy_baja', 'baja', 'media', 'alta', 'muy_alta'] as const;

export type NivelPrioridad = (typeof NIVELES)[number];

/** La forma que espera `UpsertHabitRequest.importancia`. */
const IMPORTANCIA_HABITO: Record<NivelPrioridad, string> = {
  muy_alta: 'Muy Alta',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  muy_baja: 'Muy Baja',
};

/** Cualquiera de las dos formas, o nada, al id del nivel (`media` por defecto). */
export function nivelDe(valor: string | null | undefined): NivelPrioridad {
  const id = (valor ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  return (NIVELES as readonly string[]).includes(id) ? (id as NivelPrioridad) : 'media';
}

/** El texto del hábito a partir del id que usa el formulario. */
export function importanciaDeHabito(valor: string | null | undefined): string {
  return IMPORTANCIA_HABITO[nivelDe(valor)];
}

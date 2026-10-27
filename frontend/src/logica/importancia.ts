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

/* Las cuatro urgencias de la tarea, en la escala de cinco niveles del color.
 * La urgencia manda sobre el punto: una tarea urgente no sale con color frío. */
const NIVEL_DE_URGENCIA: Record<string, NivelPrioridad> = {
  bloqueante: 'muy_alta',
  urgente: 'alta',
  normal: 'media',
  chill: 'baja',
};

/** Nivel del punto de una tarea a partir de su urgencia (`normal` por defecto). */
export function nivelDeUrgencia(urgencia: string | null | undefined): NivelPrioridad {
  return NIVEL_DE_URGENCIA[(urgencia ?? 'normal').trim().toLowerCase()] ?? 'media';
}

/** El texto del hábito a partir del id que usa el formulario. */
export function importanciaDeHabito(valor: string | null | undefined): string {
  return IMPORTANCIA_HABITO[nivelDe(valor)];
}

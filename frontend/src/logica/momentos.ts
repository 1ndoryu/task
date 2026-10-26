/* «Cuándo es mejor hacer»: los momentos del día en que conviene una tarea o un
 * hábito (uno, varios o ninguno). Solo pesa en el orden inteligente: lo que
 * toca ahora sube, lo que toca en otro momento baja un poco y lo que no dice
 * nada no se mueve. Lógica pura, sin DOM ni reloj propio. */

export type Momento = 'temprano' | 'tarde' | 'noche';

export const MOMENTOS: { id: Momento; etiqueta: string }[] = [
  { id: 'temprano', etiqueta: 'Temprano' },
  { id: 'tarde', etiqueta: 'Tarde' },
  { id: 'noche', etiqueta: 'Noche' },
];

/** Lo que suma estar en su momento y lo que resta estar fuera de él. Menos que
 *  una prioridad alta (300): ayuda a desempatar, no pasa por encima de lo grave. */
export const PESO_EN_SU_MOMENTO = 150;
export const PESO_FUERA_DE_SU_MOMENTO = -100;

/** Momento del día de una hora: temprano de 5 a 12, tarde de 12 a 19, noche el resto. */
export function momentoDe(ahora: Date): Momento {
  const hora = ahora.getHours();
  if (hora >= 5 && hora < 12) return 'temprano';
  if (hora >= 12 && hora < 19) return 'tarde';
  return 'noche';
}

/** Lo guardado, saneado: solo momentos conocidos, sin repetir y en el orden del día. */
export function leerMomentos(valor: unknown): Momento[] {
  if (!Array.isArray(valor)) return [];
  return MOMENTOS.map((m) => m.id).filter((id) => valor.includes(id));
}

/** La lista con `id` quitado si estaba y añadido si no, siempre en el orden del día. */
export function alternarMomento(momentos: readonly Momento[], id: Momento): Momento[] {
  return leerMomentos(momentos.includes(id) ? momentos.filter((otro) => otro !== id) : [...momentos, id]);
}

/** Peso que un conjunto de momentos suma al orden inteligente a esta hora.
 *  Sin momentos, o con los tres (da igual a qué hora), no cambia nada. */
export function pesoDeMomentos(momentos: readonly Momento[] | undefined, ahora: Momento): number {
  if (!momentos?.length || momentos.length >= MOMENTOS.length) return 0;
  return momentos.includes(ahora) ? PESO_EN_SU_MOMENTO : PESO_FUERA_DE_SU_MOMENTO;
}

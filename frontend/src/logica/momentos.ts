/* «Cuándo es mejor hacer»: los momentos del día en que conviene una tarea o un
 * hábito (uno, varios o ninguno). Solo pesa en el orden inteligente: lo que
 * toca en el momento actual duplica su peso; el resto no se mueve. Lógica pura,
 * sin DOM ni reloj propio. */

export type Momento = 'temprano' | 'tarde' | 'noche';

export const MOMENTOS: { id: Momento; etiqueta: string }[] = [
  { id: 'temprano', etiqueta: 'Temprano' },
  { id: 'tarde', etiqueta: 'Tarde' },
  { id: 'noche', etiqueta: 'Noche' },
];

/** Cuánto se multiplica el peso base de una tarea o hábito que toca ahora. */
export const MULTIPLICADOR_EN_SU_MOMENTO = 2;

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

/** Peso final en el orden inteligente: si la hora actual es uno de sus momentos
 *  y el peso base es positivo, se duplica; si no, queda igual. Un peso base
 *  negativo no se duplica, para que estar en su momento nunca empeore nada.
 *  Sin momentos, o con los tres (da igual a qué hora), no cambia nada. */
export function aplicarMomentos(pesoBase: number, momentos: readonly Momento[] | undefined, ahora: Momento): number {
  if (!momentos?.length || momentos.length >= MOMENTOS.length) return pesoBase;
  return momentos.includes(ahora) && pesoBase > 0 ? pesoBase * MULTIPLICADOR_EN_SU_MOMENTO : pesoBase;
}

/* «Cuándo es mejor hacer»: el momento del día en que conviene una tarea o un
 * hábito (uno o ninguno). Solo pesa en el orden inteligente: si toca en el
 * momento actual duplica su peso; el resto no se mueve. Lógica pura, sin DOM
 * ni reloj propio. */

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

/** Lo guardado, saneado: como mucho un momento. Si había varios de antes, queda el
 *  primero del día; así lo que se ve y lo que pesa es lo mismo. */
export function leerMomentos(valor: unknown): Momento[] {
  if (!Array.isArray(valor)) return [];
  const primero = MOMENTOS.find((m) => valor.includes(m.id));
  return primero ? [primero.id] : [];
}

/** Lo elegido al pulsar `id`: pulsar el activo lo quita; pulsar otro lo cambia. */
export function elegirMomento(actual: Momento | undefined, id: Momento): Momento[] {
  return actual === id ? [] : [id];
}

/** Peso final en el orden inteligente: si la hora actual es su momento y el peso
 *  base es positivo, se duplica; si no, queda igual. Un peso base negativo no se
 *  duplica, para que estar en su momento nunca empeore nada. Sin momento no cambia. */
export function aplicarMomentos(pesoBase: number, momentos: readonly Momento[] | undefined, ahora: Momento): number {
  const [momento] = leerMomentos(momentos);
  return momento === ahora && pesoBase > 0 ? pesoBase * MULTIPLICADOR_EN_SU_MOMENTO : pesoBase;
}

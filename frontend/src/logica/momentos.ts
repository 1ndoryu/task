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
/* Con peso base no positivo (p. ej. hábito en racha, «chill» = −200) no hay nada que
 * multiplicar: se suma un bono fijo, para que lo que toca ahora vaya antes. */
export const BONO_EN_SU_MOMENTO = 100;

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

/* Lo que tocaba antes en el día y sigue pendiente pesa algo más que lo que aún no
 * toca: de tarde, un hábito de temprano va antes que uno de noche. */
export const BONO_MOMENTO_PASADO = 50;

/** Peso final en el orden inteligente: si la hora actual es su momento, un peso base
 *  positivo se duplica y uno no positivo recibe el bono fijo; si su momento ya pasó hoy,
 *  suma el bono menor; si aún no llega, queda igual. Sin momento no cambia. */
export function aplicarMomentos(pesoBase: number, momentos: readonly Momento[] | undefined, ahora: Momento): number {
  const [momento] = leerMomentos(momentos);
  if (!momento) return pesoBase;
  if (momento !== ahora) {
    const pasado = MOMENTOS.findIndex((m) => m.id === momento) < MOMENTOS.findIndex((m) => m.id === ahora);
    return pasado ? pesoBase + BONO_MOMENTO_PASADO : pesoBase;
  }
  return pesoBase > 0 ? pesoBase * MULTIPLICADOR_EN_SU_MOMENTO : pesoBase + BONO_EN_SU_MOMENTO;
}

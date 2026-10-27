/* «Cuándo es mejor hacer»: el momento del día en que conviene una tarea o un
 * hábito (uno o ninguno). Solo pesa en el orden inteligente: si toca en el
 * momento actual duplica su peso; el resto no se mueve. Lógica pura, sin DOM
 * ni reloj propio. Los números (horas, multiplicador, bonos) viven en `algoritmo.ts`; aquí solo se
 * importa su tipo, porque los tests cargan este archivo sin resolver más módulos. */
import type { Algoritmo } from './algoritmo';

export type Momento = 'temprano' | 'tarde' | 'noche';

export const MOMENTOS: { id: Momento; etiqueta: string }[] = [
  { id: 'temprano', etiqueta: 'Temprano' },
  { id: 'tarde', etiqueta: 'Tarde' },
  { id: 'noche', etiqueta: 'Noche' },
];

/** Momento del día de una hora. Con las horas de fábrica (`ALGORITMO_DEFECTO`): temprano de 5 a 12, tarde
 *  de 12 a 19 y noche el resto (de 19 a 5). */
export function momentoDe(ahora: Date, horas: Pick<Algoritmo, 'horaTemprano' | 'horaTarde' | 'horaNoche'>): Momento {
  const hora = ahora.getHours();
  if (hora >= horas.horaTemprano && hora < horas.horaTarde) return 'temprano';
  if (hora >= horas.horaTarde && hora < horas.horaNoche) return 'tarde';
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

/** Peso final en el orden inteligente: si la hora actual es su momento, un peso base
 *  positivo se multiplica y uno no positivo (p. ej. hábito en racha) recibe el bono fijo;
 *  si su momento ya pasó hoy, suma el bono menor —de tarde, un hábito de temprano va antes
 *  que uno de noche—; si aún no llega, queda igual. Sin momento no cambia. */
export function aplicarMomentos(
  pesoBase: number,
  momentos: readonly Momento[] | undefined,
  ahora: Momento,
  algoritmo: Pick<Algoritmo, 'momMultiplicador' | 'momBono' | 'momBonoPasado'>,
): number {
  const [momento] = leerMomentos(momentos);
  if (!momento) return pesoBase;
  if (momento !== ahora) {
    const pasado = MOMENTOS.findIndex((m) => m.id === momento) < MOMENTOS.findIndex((m) => m.id === ahora);
    return pasado ? pesoBase + algoritmo.momBonoPasado : pesoBase;
  }
  return pesoBase > 0 ? pesoBase * algoritmo.momMultiplicador : pesoBase + algoritmo.momBono;
}

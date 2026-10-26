/* Regla de destino del arrastre en el carril: decide qué hace la caja que se
 * mueve según dónde esté el puntero. Lógica pura (sin DOM): el carril solo le
 * pasa las medidas de las columnas y de las cajas de cada una.
 *
 * Dos gestos distintos, separados por bandas de cada columna:
 *  - **Pasar** (en vivo): el puntero llega al borde lejano de otra columna y la
 *    caja se coloca al otro lado. Solo cuenta cruzar en el sentido de la marcha:
 *    la regla de antes (centro más cercano) hacía saltar a la arrastrada de un
 *    lado a otro y era difícil dejarla junto a otra.
 *  - **Apilar** (al soltar): el puntero está en el centro de otra columna y la
 *    caja se pondrá encima o debajo de la caja que tenga más cerca. */

/** Fracción del ancho de una columna que cuenta como borde a cada lado. */
export const BANDA = 0.25;

export interface CajaMedida {
  id: string;
  /** Extremos verticales de la caja (px de la ventana). */
  arriba: number;
  abajo: number;
}

export interface ColumnaMedida {
  /** Extremos horizontales de la columna, en el mismo eje que la `x` del puntero. */
  izq: number;
  der: number;
  /** Sus cajas, de arriba abajo. */
  cajas: CajaMedida[];
}

/** Qué hacer con la caja movida: `separar` la deja en columna propia junto a
 *  `referencia`; `apilar` la mete en la columna de `referencia`. */
export interface Movimiento {
  modo: 'separar' | 'apilar';
  referencia: string;
  despues: boolean;
}

const contiene = (columna: ColumnaMedida, id: string) => columna.cajas.some((c) => c.id === id);
const borde = (columna: ColumnaMedida) => (columna.der - columna.izq) * BANDA;

/** Pasar en vivo. Hacia la derecha gana la columna más lejana cuyo borde
 *  derecho ya alcanzó el puntero, y hacia la izquierda la cuyo borde izquierdo;
 *  así un gesto rápido que cruza varias no se queda a medias. Si la columna de
 *  la caja es una pila, sus bandas laterales la sacan por ese lado. */
export function destinoPorBorde(columnas: readonly ColumnaMedida[], movida: string, x: number): Movimiento | null {
  const desde = columnas.findIndex((c) => contiene(c, movida));
  if (desde < 0) return null;
  for (let i = columnas.length - 1; i > desde; i--) {
    const c = columnas[i];
    if (x >= c.der - borde(c)) return { modo: 'separar', referencia: c.cajas[c.cajas.length - 1].id, despues: true };
  }
  for (let i = 0; i < desde; i++) {
    const c = columnas[i];
    if (x <= c.izq + borde(c)) return { modo: 'separar', referencia: c.cajas[0].id, despues: false };
  }
  // La pila de la propia caja: salir por la banda del lado.
  const propia = columnas[desde];
  const otra = propia.cajas.find((c) => c.id !== movida);
  if (!otra) return null;
  if (x <= propia.izq + borde(propia)) return { modo: 'separar', referencia: otra.id, despues: false };
  if (x >= propia.der - borde(propia)) return { modo: 'separar', referencia: otra.id, despues: true };
  return null;
}

/** Apilar al soltar: el puntero en el centro de **otra** columna elige la caja
 *  más cercana en vertical, y el lado (encima o debajo) según esté por encima o
 *  por debajo de su mitad. */
export function destinoApilar(
  columnas: readonly ColumnaMedida[],
  movida: string,
  x: number,
  y: number,
): Movimiento | null {
  for (const columna of columnas) {
    if (contiene(columna, movida)) continue;
    if (x <= columna.izq + borde(columna) || x >= columna.der - borde(columna)) continue;
    const mitad = (c: CajaMedida) => (c.arriba + c.abajo) / 2;
    const cercana = columna.cajas.reduce<CajaMedida | null>(
      (mejor, c) => (!mejor || Math.abs(y - mitad(c)) < Math.abs(y - mitad(mejor)) ? c : mejor),
      null,
    );
    if (cercana) return { modo: 'apilar', referencia: cercana.id, despues: y > mitad(cercana) };
  }
  return null;
}

export interface Candidata {
  id: string;
  /** Centro de la caja en el eje que se mide. */
  centro: number;
}

/** Id de la caja con la que cambia de sitio la `movida` cuando el puntero está
 *  en `p`, o `null` si debe quedarse: solo cuenta cruzar el centro de la
 *  vecina en el sentido de la marcha. `candidatas` va en orden e incluye a la
 *  movida. Si cruza varias a la vez, gana la más lejana. */
export function destinoPorCruce(candidatas: readonly Candidata[], movida: string, p: number): string | null {
  const desde = candidatas.findIndex((c) => c.id === movida);
  if (desde < 0) return null;
  for (let i = candidatas.length - 1; i > desde; i--) if (candidatas[i].centro <= p) return candidatas[i].id;
  for (let i = 0; i < desde; i++) if (candidatas[i].centro >= p) return candidatas[i].id;
  return null;
}

/** Reordenar dentro de la propia pila, en vivo y en vertical: la misma regla de
 *  cruce, con los centros verticales de sus cajas. */
export function destinoEnPila(columna: ColumnaMedida, movida: string, y: number): Movimiento | null {
  const candidatas = columna.cajas.map((c) => ({ id: c.id, centro: (c.arriba + c.abajo) / 2 }));
  const hacia = destinoPorCruce(candidatas, movida, y);
  if (hacia === null) return null;
  const desde = candidatas.findIndex((c) => c.id === movida);
  const sitio = candidatas.findIndex((c) => c.id === hacia);
  return { modo: 'apilar', referencia: hacia, despues: sitio > desde };
}

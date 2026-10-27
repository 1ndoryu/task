/* Reordenar a mano: las cuentas del arrastre de filas, sin DOM. Se separan de
 * la vista para poder probarlas: dónde cae la fila y qué `orden` recibe cada una. */

export interface Tramo {
  arriba: number;
  abajo: number;
}

/** Copia de `lista` con el elemento de `desde` puesto en `hasta`. */
export function mover<T>(lista: readonly T[], desde: number, hasta: number): T[] {
  const copia = [...lista];
  const [pieza] = copia.splice(desde, 1);
  copia.splice(hasta, 0, pieza);
  return copia;
}

/** Sitio al que cae la fila arrastrada: una vecina cede solo cuando el borde de
 *  la arrastrada ya pasó su centro. Así no baila ante cualquier roce, y el
 *  mismo gesto de ida y vuelta lleva siempre al mismo destino. `tramos` son los
 *  sitios originales de cada grupo, `arriba`/`abajo` el borde actual de la arrastrada. */
export function destinoFila(tramos: readonly Tramo[], desde: number, arriba: number, abajo: number): number {
  const centro = (i: number) => (tramos[i].arriba + tramos[i].abajo) / 2;
  let destino = desde;
  for (let i = desde + 1; i < tramos.length; i++) if (abajo > centro(i)) destino = i;
  if (destino !== desde) return destino;
  for (let i = desde - 1; i >= 0; i--) if (arriba < centro(i)) destino = i;
  return destino;
}

/** `orden` de una lista que ya está en su nuevo orden: los mismos números que
 *  había, de menor a mayor y sin repetir. Reusar los números mantiene la fila
 *  en su sitio respecto a las que esta caja no muestra; subir los repetidos
 *  hace falta porque las filas recién creadas empatan en 0. */
export function ordenesNuevos(actuales: readonly number[]): number[] {
  const nuevos = [...actuales].sort((a, b) => a - b);
  for (let i = 1; i < nuevos.length; i++) nuevos[i] = Math.max(nuevos[i], nuevos[i - 1] + 1);
  return nuevos;
}

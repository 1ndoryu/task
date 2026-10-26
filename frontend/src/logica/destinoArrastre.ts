/* Regla de destino del arrastre en el carril: decide sobre qué pieza se suelta
 * la que se mueve. Lógica pura (sin DOM): el carril solo le pasa las x medidas.
 *
 * La regla de antes elegía la pieza de centro más cercano al puntero. Con cajas
 * anchas eso hace que la arrastrada cambie de sitio en cuanto el puntero pasa de
 * la mitad del hueco, y al reordenar los centros se mueven: la caja saltaba de
 * un lado a otro y era difícil dejarla junto a otra. Aquí la arrastrada solo se
 * adelanta a una vecina cuando el puntero **cruza su centro en el sentido de la
 * marcha**; mientras no lo cruce, se queda donde está. */

export interface Candidata {
  id: string;
  /** Centro de la pieza en el eje del carril (en px del contenido). */
  centro: number;
}

/** Id de la pieza con la que cambia de sitio la `movida` cuando el puntero está
 *  en `x`, o `null` si debe quedarse. `candidatas` va en el orden del carril,
 *  solo las que admiten soltar, e incluye a la movida. Si el puntero ha cruzado
 *  varias a la vez, gana la más lejana: así un gesto rápido no deja a medias. */
export function destinoPorCruce(candidatas: readonly Candidata[], movida: string, x: number): string | null {
  const desde = candidatas.findIndex((c) => c.id === movida);
  if (desde < 0) return null;
  // Hacia la derecha: la más lejana cuyo centro ya quedó a la izquierda del puntero.
  for (let i = candidatas.length - 1; i > desde; i--) if (candidatas[i].centro <= x) return candidatas[i].id;
  // Hacia la izquierda: la más lejana cuyo centro ya quedó a la derecha.
  for (let i = 0; i < desde; i++) if (candidatas[i].centro >= x) return candidatas[i].id;
  return null;
}

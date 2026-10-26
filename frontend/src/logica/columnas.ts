/* Columnas del carril: cajas apiladas una sobre otra. El orden plano de los
 * paneles sigue siendo la única fuente del orden; lo que se guarda aparte es qué
 * cajas van «apiladas», es decir, debajo de la anterior en vez de abrir columna.
 * Así una vista sin apilados es exactamente la de siempre. Lógica pura, sin DOM:
 * todas las operaciones devuelven columnas nuevas y no tocan las que reciben. */

export type Columnas = string[][];

/** Lo guardado: solo cadenas y sin repetir. `''` cuenta (es la caja «Tareas»);
 *  un id que ya no exista se ignora al armar las columnas y se limpia al guardar. */
export function leerApiladas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.filter((id): id is string => typeof id === 'string'))];
}

/** El orden plano y los ids apilados, llevados a columnas. La primera caja
 *  nunca se apila (no tiene a nadie encima) y un id desconocido no hace nada. */
export function columnasDe(orden: readonly string[], apiladas: readonly string[]): Columnas {
  const marcadas = new Set(apiladas);
  const columnas: Columnas = [];
  orden.forEach((id, indice) => {
    if (indice > 0 && marcadas.has(id)) columnas[columnas.length - 1].push(id);
    else columnas.push([id]);
  });
  return columnas;
}

/** Lo contrario de `columnasDe`: el orden plano y los ids que van apilados. */
export function aplanar(columnas: Columnas): { orden: string[]; apiladas: string[] } {
  const apiladas = columnas.flatMap((columna) => columna.slice(1));
  return { orden: columnas.flat(), apiladas };
}

/** Las columnas sin `id`; una que se queda vacía desaparece. */
const sin = (columnas: Columnas, id: string): Columnas =>
  columnas.map((columna) => columna.filter((otro) => otro !== id)).filter((columna) => columna.length > 0);

/** Mete `movida` en la columna de `objetivo`, justo encima o debajo de él. */
export function apilar(columnas: Columnas, movida: string, objetivo: string, despues: boolean): Columnas {
  if (movida === objetivo) return columnas;
  const resto = sin(columnas, movida);
  const destino = resto.find((columna) => columna.includes(objetivo));
  if (!destino) return columnas;
  const sitio = destino.indexOf(objetivo) + (despues ? 1 : 0);
  return resto.map((columna) =>
    columna === destino ? [...columna.slice(0, sitio), movida, ...columna.slice(sitio)] : columna,
  );
}

/** Saca `movida` a una columna propia, justo antes o después de la columna de
 *  `referencia`. Es el cruce horizontal de siempre; si venía de una pila, la
 *  deja (la referencia puede ser la propia pila, para salir por un lado). */
export function separar(columnas: Columnas, movida: string, referencia: string, despues: boolean): Columnas {
  const resto = sin(columnas, movida);
  const sitio = resto.findIndex((columna) => columna.includes(referencia));
  // Sin referencia (desconocida, o era la propia movida) no hay dónde colocarla.
  if (sitio < 0) return columnas;
  const lugar = sitio + (despues ? 1 : 0);
  return [...resto.slice(0, lugar), [movida], ...resto.slice(lugar)];
}

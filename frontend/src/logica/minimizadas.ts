/* Cajas minimizadas: lectura validada de lo guardado y el alterno de una caja.
 * Lógica pura, aparte de `preferencias` para no engordarla. */

/** Cajas minimizadas guardadas: solo cadenas, y `''` cuenta (es «Tareas»). Un id
 *  que ya no exista deja su entrada y no pasa nada: nunca se busca por él. */
export function leerMinimizadas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  // Sin repetidos: un id dos veces haría que alternar una vez no la abriera.
  return [...new Set(valor.filter((id): id is string => typeof id === 'string'))];
}

/** La lista con `id` quitado si estaba y añadido si no. */
export function alternarMinimizada(minimizadas: readonly string[], id: string): string[] {
  return minimizadas.includes(id) ? minimizadas.filter((otro) => otro !== id) : [...minimizadas, id];
}

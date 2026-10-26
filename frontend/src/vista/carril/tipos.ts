/* Piezas compartidas entre los hooks del carril: el gesto de arrastre lo leen
 * el arrastre y la animación FLIP, y ambos usan la misma duración. */

/** Duración del apartado de las otras piezas y del regreso de la arrastrada. */
export const DURACION = 220;

/** Una caja que se está arrastrando: su copia flotante, el id del panel que
 *  lleva y la coordenada del puntero dentro de ella. */
export interface Gesto {
  /** La caja real, que queda de hueco. Al cambiar de columna React la vuelve a
   *  montar: el FLIP la busca de nuevo por su `data-panel` en cada pintado. */
  pieza: HTMLElement;
  copia: HTMLElement;
  id: string;
  /** X del puntero relativa al ancho de la pieza (0 = borde izquierdo). */
  puntero: number;
  /** Y del puntero dentro de la pieza (la copia no se pega por arriba). */
  dentro: number;
  /** Último punto del puntero, para recolocar la copia tras reordenar. */
  x: number;
  y: number;
}

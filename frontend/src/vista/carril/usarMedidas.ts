/* Medida del carril: publica en la vista el margen lateral y los altos que
 * necesita la barra flotante, y vuelve a la pieza que se estaba mirando cuando
 * cambia el ancho o la lista de piezas. Se vigila el tamaño del carril y el de
 * cada pieza, y la aparición o desaparición de hijos. */
import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { Gesto } from './tipos';

interface Entrada {
  pista: RefObject<HTMLDivElement>;
  piezas: () => HTMLElement[];
  centrar: (indice: number, suave: boolean) => void;
  /** Índice de la pieza centrada: es lo que se restaura al medir. */
  centrada: MutableRefObject<number>;
  /** Arrastre en curso, si lo hay: durante el gesto no se recentra, porque el
   *  orden cambia a cada paso y recentrar pelearía con él. */
  gesto: MutableRefObject<Gesto | null>;
}

export function usarMedidas({ pista, piezas, centrar, centrada, gesto }: Entrada): void {
  // Medida y posición: el margen lateral es lo que permite centrar la primera
  // (y la última) sin poder rodar más allá. Se vigila el tamaño del carril y
  // la lista de piezas, y en ambos casos se vuelve a la pieza que se estaba
  // mirando: redimensionar o añadir un grupo no debe hacer perder el sitio.
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo) return;
    let anchoPrevio = 0;

    const medir = () => {
      const primera = piezas()[0];
      if (!primera) return;
      // El alto que manda es el mayor de las piezas, no el de la primera: cada
      // caja puede tener el suyo, y la barra flotante se apoya sobre la más
      // alta para no caer dentro de ninguna.
      const { offsetWidth: ancho } = primera;
      const alto = Math.max(0, ...piezas().map((pieza) => pieza.offsetHeight));
      nodo.style.setProperty('--margen-carril', `${Math.max(0, (nodo.clientWidth - ancho) / 2)}px`);
      // Lo que la vista coloque sobre el carril (la barra de acciones) necesita
      // saber dónde cae su borde superior; la pieza va centrada, así que sale
      // de su alto real. El carril no pinta esa barra: solo publica la medida.
      // El alto útil es `clientHeight` y no el del marco: la barra de scroll
      // del carril se come unos píxeles abajo y desplaza el centro de las piezas.
      nodo.parentElement?.style.setProperty('--alto-pieza-carril', `${alto}px`);
      nodo.parentElement?.style.setProperty('--alto-carril', `${nodo.clientHeight}px`);
      // La barra flotante se alinea con la caja que se está mirando, y las
      // cajas pueden tener anchos distintos: se publica el suyo.
      const centradaAhora = piezas()[Math.min(centrada.current, piezas().length - 1)] ?? primera;
      nodo.parentElement?.style.setProperty('--ancho-pieza-carril', `${centradaAhora.offsetWidth}px`);
    };

    const reajustar = () => {
      medir();
      // Un cambio de alto no mueve el carril: solo se reposiciona si cambió el
      // ancho, que es lo único que altera dónde cae el centro.
      if (nodo.clientWidth === anchoPrevio) return;
      anchoPrevio = nodo.clientWidth;
      centrar(Math.min(centrada.current, piezas().length - 1), false);
    };

    reajustar();
    const medidas = new ResizeObserver(reajustar);
    medidas.observe(nodo);
    // El alto de la pieza puede cambiar sin que el carril lo haga (una fuente
    // más grande, un ajuste de filas): de ahí sale la barra flotante.
    const vigilarPieza = () => piezas().forEach((pieza) => medidas.observe(pieza));
    vigilarPieza();
    // Añadir o quitar piezas rehace la lista de hijos; el ancho no cambia, pero
    // el índice guardado puede quedarse fuera. Durante un arrastre no se toca:
    // el orden cambia a cada paso y recentrar pelearía con el gesto.
    const cambios = new MutationObserver(() => {
      vigilarPieza();
      medir();
      if (gesto.current) return;
      const indice = Math.min(centrada.current, piezas().length - 1);
      centrada.current = indice;
      centrar(indice, false);
    });
    cambios.observe(nodo, { childList: true });

    return () => {
      medidas.disconnect();
      cambios.disconnect();
    };
  }, [pista, piezas, centrar, centrada, gesto]);
}

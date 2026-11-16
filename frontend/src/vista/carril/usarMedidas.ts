/* Medida del carril: publica el margen lateral y vuelve a la pieza que se
 * estaba mirando cuando cambia el ancho o la lista de piezas. Se vigila el tamaño del carril y el de
 * cada pieza, y la aparición o desaparición de hijos. */
import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { Gesto } from './tipos';

interface Entrada {
  pista: RefObject<HTMLDivElement>;
  piezas: () => HTMLElement[];
  centrar: (indice: number, suave: boolean) => void;
  /** La pieza que ocupaba el centro, para seguirla cuando la lista cambie: su
   *  índice puede no ser el mismo. */
  piezaCentrada: MutableRefObject<HTMLElement | null>;
  /** Índice de la pieza centrada: es lo que se restaura al medir. */
  centrada: MutableRefObject<number>;
  /** Arrastre en curso, si lo hay: durante el gesto no se recentra, porque el
   *  orden cambia a cada paso y recentrar pelearía con él. */
  gesto: MutableRefObject<Gesto | null>;
}

export function usarMedidas({ pista, piezas, centrar, centrada, piezaCentrada, gesto }: Entrada): void {
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
      const { offsetWidth: ancho } = primera;
      nodo.style.setProperty('--margen-carril', `${Math.max(0, (nodo.clientWidth - ancho) / 2)}px`);
    };

    const reajustar = () => {
      medir();
      // Un cambio de alto no mueve el carril: solo se reposiciona si cambió el
      // ancho, que es lo único que altera dónde cae el centro.
      if (nodo.clientWidth === anchoPrevio) return;
      anchoPrevio = nodo.clientWidth;
      const indice = Math.min(centrada.current, piezas().length - 1);
      centrada.current = indice;
      piezaCentrada.current = piezas()[indice] ?? null;
      centrar(indice, false);
    };

    reajustar();
    const medidas = new ResizeObserver(reajustar);
    medidas.observe(nodo);
    // El alto de la pieza puede cambiar sin que el carril lo haga (una fuente
    // más grande, un ajuste de filas): de ahí sale la barra flotante.
    const vigilarPieza = () => piezas().forEach((pieza) => medidas.observe(pieza));
    vigilarPieza();
    // Añadir o quitar piezas rehace la lista de hijos y el índice guardado puede
    // quedarse fuera. Se vuelve a la misma pieza, no al mismo número. Y el
    // regreso es suave: un salto seco aquí es lo que se veía al completar una
    // fila (con ella desaparece la caja «Aplazado»). Durante un arrastre no se
    // toca: el orden cambia a cada paso y recentrar pelearía con el gesto.
    const cambios = new MutationObserver(() => {
      vigilarPieza();
      medir();
      if (gesto.current) return;
      const lista = piezas();
      const vista = piezaCentrada.current;
      const encontrada = vista ? lista.indexOf(vista) : -1;
      const indice = encontrada >= 0 ? encontrada : Math.min(centrada.current, lista.length - 1);
      centrada.current = indice;
      piezaCentrada.current = lista[indice] ?? null;
      centrar(indice, true);
    });
    cambios.observe(nodo, { childList: true });

    return () => {
      medidas.disconnect();
      cambios.disconnect();
    };
  }, [pista, piezas, centrar, centrada, piezaCentrada, gesto]);
}

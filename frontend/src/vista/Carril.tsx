/* Carril de cajas: varias cajas iguales en fila que se recorren a lo ancho.
 * El desplazamiento es por caja, con imán, y se detiene antes de que una caja
 * cruce el centro de la pantalla: así siempre hay una caja centrada de verdad,
 * nunca dos a medias. La primera caja arranca centrada porque a sus lados hay
 * un margen que se calcula al medir (mitad de pantalla menos ancho de caja).
 * El carril no usa `scroll-snap`: el imán se pone al soltar, para que la caja
 * más cercana al centro sea la que quede centrada, no la que encuentre el
 * navegador. Todo se mide con los desplazamientos de las cajas, no con la
 * distancia entre centros: así el aire entre cajas no se da por supuesto. */
import { useEffect, useRef, type ReactNode } from 'react';

/** Cuánto se espera tras el último gesto antes de imantar. */
const ESPERA = 140;

interface Props {
  /** Cuántas cajas hay: al cambiar cambia el margen de los extremos. */
  total: number;
  children: ReactNode;
}

export function Carril({ total, children }: Props) {
  const pista = useRef<HTMLDivElement>(null);
  const temporizador = useRef<number | undefined>(undefined);

  const cajas = () => [...(pista.current?.querySelectorAll<HTMLElement>(':scope > .caja') ?? [])];

  /** Centro de una caja en coordenadas del contenido (sin descontar el scroll). */
  const centro = (caja: HTMLElement) => caja.offsetLeft + caja.offsetWidth / 2;

  /** Lleva una caja al centro; si el carril no llega hasta ahí, a su límite. */
  const irA = (indice: number, suave: boolean) => {
    const nodo = pista.current;
    const caja = cajas()[indice];
    if (!nodo || !caja) return;
    const limite = Math.max(0, nodo.scrollWidth - nodo.clientWidth);
    const x = Math.min(limite, Math.max(0, centro(caja) - nodo.clientWidth / 2));
    nodo.scrollTo({ left: x, behavior: suave ? 'smooth' : 'auto' });
  };

  // El margen lateral es lo que hace que la primera caja quede centrada sin
  // poder rodar más allá: mitad de pantalla menos mitad de caja.
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo || !total) return;
    const medir = () => {
      const caja = cajas()[0];
      if (!caja) return;
      nodo.style.setProperty('--margen-carril', `${Math.max(0, (nodo.clientWidth - caja.offsetWidth) / 2)}px`);
      irA(0, false);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [total]);

  /** Tras soltar, la caja que contiene el centro —o la más cercana— se centra. */
  const imantar = () => {
    const nodo = pista.current;
    if (!nodo) return;
    const mitad = nodo.scrollLeft + nodo.clientWidth / 2;
    let elegida = 0;
    let menor = Infinity;
    cajas().forEach((caja, indice) => {
      const distancia = Math.abs(centro(caja) - mitad);
      if (distancia < menor) {
        menor = distancia;
        elegida = indice;
      }
    });
    irA(elegida, true);
  };

  const aplazar = () => {
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(imantar, ESPERA);
  };

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  return (
    <div
      className="carril"
      ref={pista}
      // Rueda vertical sobre una fila: lo natural es que mueva el carril.
      onWheel={(evento) => {
        const nodo = pista.current;
        if (!nodo || Math.abs(evento.deltaX) > Math.abs(evento.deltaY)) return;
        nodo.scrollLeft += evento.deltaY;
        aplazar();
      }}
      onScroll={aplazar}
    >
      {children}
    </div>
  );
}

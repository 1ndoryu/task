/* Desplazamiento del carril: el centrado pedido desde fuera y la animación
 * FLIP del reordenado. Devuelve el mapa de sitios previos de las piezas, que
 * el arrastre usa para recolocar la copia tras el salto. */
import { useEffect, useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import { DURACION, type Gesto } from './tipos';

interface Entrada {
  pista: RefObject<HTMLDivElement>;
  piezas: () => HTMLElement[];
  centrar: (indice: number, suave: boolean) => void;
  /** Último `centrar`, leído por referencia: FLIP no se reengancha por él. */
  centrarRef: MutableRefObject<(indice: number, suave: boolean) => void>;
  /** Arrastre en curso, si lo hay: al reordenar se centra la arrastrada. */
  gesto: MutableRefObject<Gesto | null>;
  /** Colocar la copia del arrastre: lo usa también la animación FLIP. */
  colocarRef: MutableRefObject<((gesto: Gesto, x: number, y: number) => void) | null>;
  /** Índice de la pieza centrada: lo fija también el centrado externo. */
  centrada: MutableRefObject<number>;
  /** Pieza que debe quedar centrada, si el padre la impone. */
  indiceActivo?: number;
}

export function usarDesplazamiento({
  pista,
  piezas,
  centrar,
  centrarRef,
  gesto,
  colocarRef,
  centrada,
  indiceActivo,
}: Entrada): void {
  /** La animación FLIP necesita el último `centrar`: se lee por referencia. */
  useEffect(() => {
    centrarRef.current = centrar;
  }, [centrar, centrarRef]);

  // Animación FLIP: al reordenar, cada pieza salta a su sitio nuevo en el
  // documento; se le devuelve el salto como desplazamiento y se suelta, así se
  // ve venir hacia dónde va. Solo se anima lo que de verdad se movió, y nada si
  // el sistema pide menos movimiento.
  const sitios = useRef(new Map<HTMLElement, number>());
  useLayoutEffect(() => {
    const anteriores = sitios.current;
    const actuales = new Map<HTMLElement, number>();
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const actual = gesto.current;
    for (const pieza of piezas()) {
      const x = pieza.offsetLeft;
      actuales.set(pieza, x);
      const antes = anteriores.get(pieza);
      if (!suave || antes === undefined || Math.abs(antes - x) < 1) continue;
      pieza.animate(
        [{ transform: `translateX(${antes - x}px)` }, { transform: 'translateX(0)' }],
        { duration: DURACION, easing: 'cubic-bezier(.22,.61,.36,1)' },
      );
    }
    sitios.current = actuales;
    // Al reordenar en pleno arrastre, la pieza cae en otro sitio: se centra la
    // arrastrada (para que no se escape del carril) y la copia se recoloca con
    // su nuevo ancho, sin saltar bajo el puntero.
    if (actual && pista.current) {
      centrarRef.current(piezas().indexOf(actual.pieza), false);
      colocarRef.current?.(actual, actual.x, actual.y);
    }
  });

  // Pieza centrada desde fuera (por ejemplo, la pestaña que se acaba de abrir).
  useEffect(() => {
    if (indiceActivo === undefined) return;
    centrada.current = indiceActivo;
    centrar(indiceActivo, true);
  }, [indiceActivo, centrar, centrada]);
}

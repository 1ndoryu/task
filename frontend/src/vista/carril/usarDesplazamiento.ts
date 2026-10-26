/* Desplazamiento del carril: el centrado pedido desde fuera y la animación
 * FLIP del reordenado. Las columnas se animan a lo ancho y las cajas de una
 * pila a lo alto; el mapa de sitios previos queda aquí y la copia del arrastre
 * se recoloca tras cada salto. */
import { useEffect, useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import { DURACION, type Gesto } from './tipos';

interface Entrada {
  pista: RefObject<HTMLDivElement>;
  /** Las piezas del imán (las columnas) y las cajas de dentro. */
  piezas: () => HTMLElement[];
  cajas: () => HTMLElement[];
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

/** Sitio de un elemento en su eje: izquierda para columnas, arriba para cajas. */
type Sitios = Map<HTMLElement, number>;

export function usarDesplazamiento({
  pista,
  piezas,
  cajas,
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

  // Animación FLIP: al reordenar, cada elemento salta a su sitio nuevo en el
  // documento; se le devuelve el salto como desplazamiento y se suelta, así se
  // ve venir hacia dónde va. Solo se anima lo que de verdad se movió, y nada si
  // el sistema pide menos movimiento.
  const sitios = useRef<{ columnas: Sitios; cajas: Sitios }>({ columnas: new Map(), cajas: new Map() });
  useLayoutEffect(() => {
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animar = (elementos: HTMLElement[], antes: Sitios, eje: 'X' | 'Y'): Sitios => {
      const ahora: Sitios = new Map();
      for (const elemento of elementos) {
        const sitio = eje === 'X' ? elemento.offsetLeft : elemento.offsetTop;
        ahora.set(elemento, sitio);
        const previo = antes.get(elemento);
        if (!suave || previo === undefined || Math.abs(previo - sitio) < 1) continue;
        elemento.animate(
          [{ transform: `translate${eje}(${previo - sitio}px)` }, { transform: `translate${eje}(0)` }],
          { duration: DURACION, easing: 'cubic-bezier(.22,.61,.36,1)' },
        );
      }
      return ahora;
    };
    sitios.current = {
      columnas: animar(piezas(), sitios.current.columnas, 'X'),
      cajas: animar(cajas(), sitios.current.cajas, 'Y'),
    };

    const actual = gesto.current;
    if (!actual || !pista.current) return;
    // Al pasar de columna React vuelve a montar la caja: la que queda de hueco
    // es otra, y hay que marcarla de nuevo o se vería entera bajo la copia.
    const viva = cajas().find((caja) => caja.dataset.panel === actual.id);
    if (viva) {
      actual.pieza = viva;
      viva.classList.add('carril__pieza--arrastrada');
    }
    // Al reordenar en pleno arrastre, la copia se recoloca con el ancho del
    // hueco nuevo, sin saltar bajo el puntero. El carril NO se recentra: hacerlo
    // movía el desplazamiento en cada cambio de sitio, las vecinas se escapaban
    // de debajo de la mano y la caja acababa al final sin que nadie la llevara.
    colocarRef.current?.(actual, actual.x, actual.y);
  });

  // Pieza centrada desde fuera (por ejemplo, la pestaña que se acaba de abrir).
  useEffect(() => {
    if (indiceActivo === undefined) return;
    centrada.current = indiceActivo;
    centrar(indiceActivo, true);
  }, [indiceActivo, centrar, centrada]);
}

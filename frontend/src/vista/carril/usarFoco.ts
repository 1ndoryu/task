/* Foco y carril: enfocar un campo dentro de una caja no debe llevarse la fila
 * de cajas.
 *
 * Cuando el foco cae en algo que la caja recorta, el navegador desplaza por su
 * cuenta el contenedor con scroll más cercano —aquí, el carril— para enseñarlo.
 * Nadie lo pidió y se ve como un salto de toda la fila. El desplazamiento
 * ocurre dentro del propio `focus()`, antes de que llegue `focusin`, así que la
 * posición buena solo se conoce mirándola antes: se anota en cada pulsación o
 * tecla, que siempre precede al foco. Al entrar el foco se devuelve el carril a
 * esa posición, y como esto ocurre antes de pintar no llega a verse. Si aun así
 * la caja enfocada no se ve, se centra ella sola, despacio: mover el carril
 * solo se justifica para enseñarla. */
import { useEffect, type MutableRefObject, type RefObject } from 'react';

/** Lo anotado vale mientras dure la interacción que lleva al foco. */
const VIGENCIA = 1000;

interface Entrada {
  pista: RefObject<HTMLDivElement>;
  piezas: () => HTMLElement[];
  centrar: (indice: number, suave: boolean) => void;
  marcar: (indice: number) => void;
  /** Arrastre en curso: durante el gesto el carril es de la mano, no del foco. */
  gesto: MutableRefObject<unknown>;
}

export function usarFoco({ pista, piezas, centrar, marcar, gesto }: Entrada): void {
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo) return;
    let previo: { x: number; cuando: number } | null = null;
    let asegurar = 0;

    // Un clic o una tecla preceden siempre al foco que provocan: aquí el carril
    // todavía está donde la usuaria lo dejó.
    const anotar = () => {
      previo = { x: nodo.scrollLeft, cuando: performance.now() };
    };

    const alEntrar = (evento: FocusEvent) => {
      const punto = previo;
      previo = null;
      if (gesto.current) return;
      const objetivo = evento.target as HTMLElement | null;
      if (!objetivo) return;
      const devolver = punto && performance.now() - punto.cuando <= VIGENCIA && Math.abs(nodo.scrollLeft - punto.x) >= 1;
      if (devolver && punto) {
        nodo.scrollLeft = punto.x;
        // Algunos webviews ruedan al foco después de este evento: se repite una
        // vez, ya sin pintar de por medio. Solo si no hemos centrado, que eso sí
        // es un desplazamiento con dueño.
        const x = punto.x;
        window.clearTimeout(asegurar);
        asegurar = window.setTimeout(() => {
          if (!gesto.current && Math.abs(nodo.scrollLeft - x) >= 1) nodo.scrollLeft = x;
        }, 0);
      }
      const caja = objetivo.closest<HTMLElement>('.caja') ?? objetivo;
      const marco = nodo.getBoundingClientRect();
      const sitio = caja.getBoundingClientRect();
      // Con el carril quieto la caja se ve entera: no hay nada que mover.
      if (sitio.left >= marco.left - 8 && sitio.right <= marco.right + 8) return;
      const pieza = caja.closest<HTMLElement>('.carril__columna') ?? caja;
      const indice = piezas().indexOf(pieza);
      if (indice < 0) return;
      marcar(indice);
      centrar(indice, true);
    };

    document.addEventListener('pointerdown', anotar, true);
    document.addEventListener('keydown', anotar, true);
    nodo.addEventListener('focusin', alEntrar);
    return () => {
      document.removeEventListener('pointerdown', anotar, true);
      document.removeEventListener('keydown', anotar, true);
      window.clearTimeout(asegurar);
      nodo.removeEventListener('focusin', alEntrar);
    };
  }, [pista, piezas, centrar, marcar, gesto]);
}

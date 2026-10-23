/* Imán del carril y rueda: tras el último gesto se centra la pieza más
 * cercana, y mientras el carril se desplaza solo la marca `moviendo` impide
 * que el imán corte la animación a mitad. La rueda vertical mueve el carril,
 * no la página. */
import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react';

/** Cuánto se espera tras el último gesto antes de imantar. */
const ESPERA = 140;

interface Entrada {
  pista: RefObject<HTMLDivElement>;
  /** Las piezas y sus medidas: el imán elige por distancia al centro. */
  piezas: () => HTMLElement[];
  centro: (pieza: HTMLElement) => number;
  marcar: (indice: number) => void;
  centrar: (indice: number, suave: boolean) => void;
  /** Marca de desplazamiento propio: la pone `centrar` al rodar suave y la
   *  suelta aquí el temporizador de reposo; por eso la comparten. */
  moviendo: MutableRefObject<boolean>;
}

export interface Impas {
  /** Temporizador del imán: lo descartan el arrastre y el teclado. */
  iman: MutableRefObject<number | undefined>;
  aplazar: () => void;
  alRodar: () => void;
}

export function usarImpas({ pista, piezas, centro, marcar, centrar, moviendo }: Entrada): Impas {
  const iman = useRef<number | undefined>(undefined);
  /** Temporizador que suelta la marca anterior al parar el desplazamiento. */
  const reposo = useRef<number | undefined>(undefined);

  /** Tras soltar, la pieza más cercana al centro es la que se centra. */
  const imantar = useCallback(() => {
    const nodo = pista.current;
    if (!nodo) return;
    const mitad = nodo.scrollLeft + nodo.clientWidth / 2;
    let elegida = 0;
    let menor = Infinity;
    piezas().forEach((pieza, indice) => {
      const distancia = Math.abs(centro(pieza) - mitad);
      if (distancia < menor) {
        menor = distancia;
        elegida = indice;
      }
    });
    marcar(elegida);
    centrar(elegida, true);
  }, [pista, piezas, centro, marcar, centrar]);

  const aplazar = useCallback(() => {
    window.clearTimeout(iman.current);
    iman.current = window.setTimeout(imantar, ESPERA);
  }, [imantar]);

  /** Al rodar, o se rearma el imán o se suelta la marca del desplazamiento
   *  propio: el temporizador del reposo se refresca con cada evento, así que
   *  solo salta cuando el carril se para de verdad (una animación suave dura
   *  más que `ESPERA` y, sin esto, el imán la cortaría a mitad). */
  const alRodar = useCallback(() => {
    if (moviendo.current) {
      window.clearTimeout(reposo.current);
      reposo.current = window.setTimeout(() => {
        moviendo.current = false;
      }, ESPERA * 2);
      return;
    }
    aplazar();
  }, [aplazar, moviendo]);

  // Rueda: el gesto vertical sobre el carril lo mueve a él, no a la página.
  // Va como escuchador nativo porque React registra `wheel` como pasivo y ahí
  // `preventDefault` no hace nada.
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo) return;
    const alGirar = (evento: WheelEvent) => {
      // Un gesto claramente horizontal es de quien esté dentro: no se toca.
      if (Math.abs(evento.deltaX) > Math.abs(evento.deltaY)) return;
      evento.preventDefault();
      nodo.scrollLeft += evento.deltaY;
      aplazar();
    };
    nodo.addEventListener('wheel', alGirar, { passive: false });
    return () => nodo.removeEventListener('wheel', alGirar);
  }, [pista, aplazar]);

  useEffect(
    () => () => {
      window.clearTimeout(iman.current);
      window.clearTimeout(reposo.current);
    },
    [],
  );

  return { iman, aplazar, alRodar };
}

/* Imán del carril y rueda: tras el último gesto se centra la pieza más
 * cercana, y mientras el carril se desplaza solo la marca `moviendo` impide
 * que el imán corte la animación a mitad. La rueda vertical mueve el carril,
 * no la página, y vale en toda la pantalla del carril: el aire de los lados y
 * de arriba y abajo es tan carril como las cajas. */
import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react';

/** Cuánto se espera tras el último gesto antes de imantar. */
const ESPERA = 140;
/** Píxeles que hay que mover para que pulsar el fondo deje de ser un clic. */
const UMBRAL = 5;

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
  //
  // Escucha en el marco entero, no solo en la pista: fuera de las cajas —el
  // aire de los lados, la franja de arriba y la de abajo— la rueda también
  // recorre el carril. Es el mismo gesto y el puntero casi nunca está sobre una
  // caja; limitarlo a la pista obligaba a apuntar a ella para moverse.
  useEffect(() => {
    const nodo = pista.current;
    const marco = nodo?.parentElement ?? null;
    if (!nodo || !marco) return;
    const alGirar = (evento: WheelEvent) => {
      // Un gesto claramente horizontal es de quien esté dentro: no se toca.
      if (Math.abs(evento.deltaX) > Math.abs(evento.deltaY)) return;
      // La lista de una caja y la columna que apila varias tienen su propio
      // scroll: mientras al más interno le quede camino en esa dirección, la
      // rueda es suya; al llegar al final pasa al siguiente y, por último, al
      // carril, que es lo que espera quien sigue girando.
      const haciaAbajo = evento.deltaY > 0;
      let dentro = (evento.target as Element | null)?.closest?.('[data-rueda-propia]') ?? null;
      while (dentro instanceof HTMLElement) {
        const queda = haciaAbajo
          ? dentro.scrollTop + dentro.clientHeight < dentro.scrollHeight - 1
          : dentro.scrollTop > 0;
        if (queda) return;
        dentro = dentro.parentElement?.closest('[data-rueda-propia]') ?? null;
      }
      evento.preventDefault();
      nodo.scrollLeft += evento.deltaY;
      aplazar();
    };
    marco.addEventListener('wheel', alGirar, { passive: false });
    return () => marco.removeEventListener('wheel', alGirar);
  }, [pista, aplazar]);

  // Arrastre del fondo: pulsar fuera de las cajas y mover la mano recorre el
  // carril, como en un mapa. Las cajas se quedan con su propio arrastre: aquí
  // solo cuenta lo que nace fuera de ellas.
  useEffect(() => {
    const nodo = pista.current;
    const marco = nodo?.parentElement ?? null;
    if (!nodo || !marco) return;

    /** Punto donde empezó la mano y desplazamiento del carril en ese momento. */
    let inicio: { x: number; scroll: number; movido: boolean } | null = null;

    /** Un arrastre no debe acabar en clic: si la mano se movió, el primer clic
     *  que llegue se traga, antes de que lo vea lo que haya debajo. */
    const tragar = (evento: Event) => {
      evento.stopPropagation();
      evento.preventDefault();
    };

    const soltar = () => {
      if (!inicio) return;
      const { movido } = inicio;
      inicio = null;
      nodo.classList.remove('carril--paneando');
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      if (!movido) return;
      window.addEventListener('click', tragar, { capture: true, once: true });
      // El clic que no llega (se soltó fuera de la ventana) no debe tragarse el
      // siguiente: el escuchador se retira solo en el siguiente turno.
      window.setTimeout(() => window.removeEventListener('click', tragar, { capture: true }), 0);
      // Al parar la mano, la misma asistencia que al girar la rueda: la pieza
      // más cercana se centra sola.
      aplazar();
    };

    const alMover = (evento: PointerEvent) => {
      if (!inicio) return;
      const dx = evento.clientX - inicio.x;
      if (!inicio.movido) {
        // El umbral separa el clic del gesto: sin él, un temblor de dos píxeles
        // movía el carril y se comía el clic de debajo.
        if (Math.abs(dx) < UMBRAL) return;
        inicio.movido = true;
        nodo.classList.add('carril--paneando');
      }
      nodo.scrollLeft = inicio.scroll - dx;
    };

    const alPulsar = (evento: PointerEvent) => {
      if (evento.button !== 0) return;
      const destino = evento.target as Element | null;
      // Una caja, un botón o un campo tienen su propio gesto: no se pisa.
      if (destino?.closest('.caja, button, a, input, textarea, select, [data-sin-arrastre]')) return;
      // El imán de un gesto anterior devolvería el carril a medio arrastre.
      window.clearTimeout(iman.current);
      inicio = { x: evento.clientX, scroll: nodo.scrollLeft, movido: false };
      window.addEventListener('pointermove', alMover);
      window.addEventListener('pointerup', soltar);
      window.addEventListener('pointercancel', soltar);
    };

    marco.addEventListener('pointerdown', alPulsar);
    return () => {
      marco.removeEventListener('pointerdown', alPulsar);
      soltar();
    };
  }, [pista, aplazar, iman]);

  useEffect(
    () => () => {
      window.clearTimeout(iman.current);
      window.clearTimeout(reposo.current);
    },
    [],
  );

  return { iman, aplazar, alRodar };
}

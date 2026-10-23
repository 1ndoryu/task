/* Gesto de arrastre del carril: se engancha en el nodo y decide en el primer
 * movimiento si era un clic (sobre un botón, un campo o un texto) o un
 * arrastre. La pieza real se queda de hueco, una copia sigue al puntero, el
 * orden se avisa en vivo y la copia vuela al hueco al soltar. */
import { useCallback, useEffect, type MutableRefObject, type RefObject } from 'react';
import { DURACION, type Gesto } from './tipos';

/** Píxeles que hay que mover para que un clic se convierta en arrastre. */
const UMBRAL = 5;
/** Borde del carril donde el arrastre empieza a desplazarlo solo. */
const BORDE = 72;
/** Tope de lo que avanza el carril en un cuadro: lejos del borde el puntero
 *  puede quedar fuera de la ventana y sin tope el carril saldría disparado. */
const PASO_MAXIMO = 18;

/** Elementos que se usan con el ratón: sobre ellos el gesto no arrastra. */
const INTERACTIVO = 'button, a, input, textarea, select, [contenteditable="true"], [data-sin-arrastre]';

interface Entrada {
  pista: RefObject<HTMLDivElement>;
  piezas: () => HTMLElement[];
  centro: (pieza: HTMLElement) => number;
  /** Rearma el imán al terminar el gesto. */
  aplazar: () => void;
  /** El imán pendiente se descarta al empezar el arrastre. */
  iman: MutableRefObject<number | undefined>;
  /** Arrastre en curso, si lo hay: congela el imán mientras dura. */
  gesto: MutableRefObject<Gesto | null>;
  /** Colocar la copia del arrastre: lo usa también la animación FLIP. */
  colocarRef: MutableRefObject<((gesto: Gesto, x: number, y: number) => void) | null>;
  alMover: MutableRefObject<((movida: string, destino: string) => void) | undefined>;
  alSoltar: MutableRefObject<(() => void) | undefined>;
  esFija: MutableRefObject<((pieza: HTMLElement) => boolean) | undefined>;
}

export function usarArrastre({
  pista,
  piezas,
  centro,
  aplazar,
  iman,
  gesto,
  colocarRef,
  alMover,
  alSoltar,
  esFija,
}: Entrada): void {
  /** Pieza bajo un nodo, subiendo hasta los hijos directos del carril. */
  const piezaDe = useCallback(
    (nodo: Element | null): HTMLElement | null => {
      const pistaNodo = pista.current;
      let actual = nodo;
      while (actual && actual.parentElement !== pistaNodo) actual = actual.parentElement;
      return actual && actual !== pistaNodo ? (actual as HTMLElement) : null;
    },
    [pista],
  );

  /** Id del panel de una pieza; `''` en la de «Tareas» (su atributo va vacío). */
  const idDe = (pieza: HTMLElement | null) => pieza?.dataset.panel ?? null;

  /** Pieza cuyo centro queda más cerca de una x del contenido, mirando solo las
   *  movibles. `null` si no hay ninguna donde soltar. */
  const destinoEn = useCallback(
    (xCliente: number): HTMLElement | null => {
      const nodo = pista.current;
      if (!nodo) return null;
      const x = xCliente - nodo.getBoundingClientRect().left + nodo.scrollLeft;
      let elegida: HTMLElement | null = null;
      let menor = Infinity;
      for (const pieza of piezas()) {
        if (esFija.current?.(pieza)) continue;
        const distancia = Math.abs(centro(pieza) - x);
        if (distancia < menor) {
          menor = distancia;
          elegida = pieza;
        }
      }
      return elegida;
    },
    [pista, piezas, centro, esFija],
  );

  // Arrastre: se engancha en el carril y se decide en el primer movimiento si
  // el gesto era un clic (sobre un botón, un campo o un texto) o un arrastre.
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo) return;
    let inicio: { pieza: HTMLElement; x: number; y: number; puntero: number } | null = null;
    let cuadro = 0;

    const terminar = (soltar: boolean) => {
      window.cancelAnimationFrame(cuadro);
      const actual = gesto.current;
      if (inicio) {
        // Solo se suelta la captura si se llegó a tomar: sin arrastre, no hay
        // nada que soltar y un fallo aquí cortaría el clic.
        try {
          nodo.releasePointerCapture?.(inicio.puntero);
        } catch {
          /* El puntero ya no está: el navegador lo liberó al soltarse. */
        }
      }
      inicio = null;
      if (!actual) return;
      gesto.current = null;
      colocarRef.current = null;
      document.body.style.removeProperty('user-select');
      actual.pieza.classList.remove('carril__pieza--arrastrada');
      // La copia vuela hasta el hueco que dejó: el ojo sigue la pieza hasta su
      // sitio en vez de verla desaparecer donde se soltó.
      /* varsense-disable cssInlineScript — la copia que vuela y la que sigue
       * al puntero se dimensionan y se mueven con la geometría medida en vivo:
       * esos píxeles los decide el gesto, no una clase CSS. */
      const destino = actual.pieza.getBoundingClientRect();
      const copia = actual.copia;
      copia.style.width = `${destino.width}px`;
      copia.style.height = `${destino.height}px`;
      const vuelo = copia.animate(
        [
          { transform: copia.style.transform, opacity: 1 },
          {
            transform: `translate(${destino.left}px, ${destino.top}px)`,
            opacity: 0,
          },
        ],
        { duration: DURACION, easing: 'cubic-bezier(.22,.61,.36,1)' },
      );
      vuelo.finished.catch(() => {}).finally(() => copia.remove());
      if (soltar) alSoltar.current?.();
      aplazar();
    };

    /** Coloca la copia bajo el puntero: el punto del gesto sobre la pieza actual
     *  y la Y dentro de ella, para que no se pegue por arriba a la ventana. */
    const colocar = (actual: Gesto, xCliente: number, yCliente: number) => {
      const nodoPista = pista.current;
      if (!nodoPista) return;
      const pieza = actual.pieza.getBoundingClientRect();
      actual.x = xCliente;
      actual.y = yCliente;
      actual.copia.style.width = `${pieza.width}px`;
      actual.copia.style.height = `${pieza.height}px`;
      const x = xCliente - actual.puntero * pieza.width;
      actual.copia.style.transform = `translate(${x}px, ${yCliente - actual.dentro}px)`;
    };
    colocarRef.current = colocar;

    const alMoverPuntero = (evento: PointerEvent) => {
      const nodoPista = pista.current;
      if (!inicio || !nodoPista) return;
      const dx = evento.clientX - inicio.x;
      const dy = evento.clientY - inicio.y;

      if (!gesto.current) {
        // Un gesto vertical o corto todavía puede ser un clic o un scroll.
        if (Math.abs(dx) < UMBRAL || Math.abs(dx) < Math.abs(dy)) return;
        if (esFija.current?.(inicio.pieza)) return;

        // Copia flotante: la pieza real se queda de hueco y esta sigue al dedo.
        const copia = inicio.pieza.cloneNode(true) as HTMLElement;
        copia.classList.add('carril__copia');
        copia.classList.remove('carril__pieza--arrastrada');
        copia.removeAttribute('id');
        copia.setAttribute('aria-hidden', 'true');
        const caja = inicio.pieza.getBoundingClientRect();
        copia.style.width = `${caja.width}px`;
        copia.style.height = `${caja.height}px`;
        document.body.append(copia);
        inicio.pieza.classList.add('carril__pieza--arrastrada');
        document.body.style.setProperty('user-select', 'none');
        /* varsense-enable */
        const actual: Gesto = {
          pieza: inicio.pieza,
          copia,
          id: idDe(inicio.pieza) ?? '',
          puntero: (inicio.x - caja.left) / caja.width,
          dentro: inicio.y - caja.top,
          x: evento.clientX,
          y: evento.clientY,
        };
        gesto.current = actual;
        // El imán de un gesto anterior cortaría el arrastre: se descarta.
        window.clearTimeout(iman.current);
        // Ahora sí: los movimientos ya no dependen de que el puntero siga
        // dentro de la pieza (puede salirse por los lados al reordenar).
        try {
          nodoPista.setPointerCapture(evento.pointerId);
        } catch {
          /* Sin captura el arrastre sigue: se pierde si el puntero sale. */
        }
        empujarBorde(evento.clientX);
      }

      const actual = gesto.current;
      colocar(actual, evento.clientX, evento.clientY);
      const destino = destinoEn(evento.clientX);
      const hasta = idDe(destino);
      // La copia ya está sobre su hueco: no hay nada que reordenar y animar el
      // orden otra vez devolvería la pieza a su sitio.
      if (hasta !== null && hasta !== actual.id) alMover.current?.(actual.id, hasta);
    };

    /** Acerca el carril solo cuando el puntero se queda en un borde. */
    const empujarBorde = (xCliente: number) => {
      const nodoPista = pista.current;
      if (!nodoPista) return;
      const caja = nodoPista.getBoundingClientRect();
      const izquierda = xCliente - caja.left;
      const derecha = caja.right - xCliente;
      const crudo =
        izquierda < BORDE ? -Math.ceil((BORDE - izquierda) / 8) : derecha < BORDE ? Math.ceil((BORDE - derecha) / 8) : 0;
      const paso = Math.max(-PASO_MAXIMO, Math.min(PASO_MAXIMO, crudo));
      if (paso) nodoPista.scrollLeft += paso;
      if (gesto.current) cuadro = window.requestAnimationFrame(() => empujarBorde(xCliente));
    };

    const alPulsar = (evento: PointerEvent) => {
      if (evento.button !== 0 || gesto.current) return;
      // Las acciones de la cabecera y los campos son suyos: no inician arrastre.
      if (evento.target instanceof Element && evento.target.closest(INTERACTIVO)) return;
      const pieza = piezaDe(evento.target as Element | null);
      if (!pieza) return;
      inicio = { pieza, x: evento.clientX, y: evento.clientY, puntero: evento.pointerId };
      // La captura llega al empezar el arrastre, no al pulsar: un clic normal
      // sigue siendo del botón de dentro.
    };

    const alSoltarPuntero = () => {
      if (inicio || gesto.current) terminar(true);
    };
    const alCancelar = () => {
      if (inicio || gesto.current) terminar(false);
    };

    nodo.addEventListener('pointerdown', alPulsar);
    nodo.addEventListener('pointermove', alMoverPuntero);
    nodo.addEventListener('pointerup', alSoltarPuntero);
    nodo.addEventListener('pointercancel', alCancelar);
    return () => {
      nodo.removeEventListener('pointerdown', alPulsar);
      nodo.removeEventListener('pointermove', alMoverPuntero);
      nodo.removeEventListener('pointerup', alSoltarPuntero);
      nodo.removeEventListener('pointercancel', alCancelar);
      window.cancelAnimationFrame(cuadro);
      gesto.current?.copia.remove();
      gesto.current = null;
      colocarRef.current = null;
      inicio = null;
      document.body.style.removeProperty('user-select');
    };
  }, [pista, piezaDe, destinoEn, aplazar, iman, gesto, colocarRef, alMover, alSoltar, esFija]);
}

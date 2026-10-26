/* Gesto de arrastre del carril: se engancha en el nodo y decide en el primer
 * movimiento si era un clic (sobre un botón, un campo o un texto) o un
 * arrastre. Lo que se arrastra es la **caja** (`[data-panel]`), no su columna:
 * la caja real se queda de hueco, una copia sigue al puntero, el cambio de
 * columna se avisa en vivo y la copia vuela al hueco al soltar. Apilar una caja
 * sobre otra no es en vivo: se marca el destino y se aplica al soltar. */
import { useEffect, type MutableRefObject, type RefObject } from 'react';
import {
  destinoApilar,
  destinoEnPila,
  destinoPorBorde,
  type ColumnaMedida,
  type Movimiento,
} from '../../logica/destinoArrastre';
import { DURACION, type Gesto } from './tipos';

/** Píxeles que hay que mover para que un clic se convierta en arrastre. */
const UMBRAL = 5;
/** Borde del carril donde el arrastre empieza a desplazarlo solo. */
const BORDE = 72;
/** Tope de lo que avanza el carril por cada movimiento del puntero: cuanto más
 *  adentro del borde, más rápido, pero nunca de un salto. */
const PASO_MAXIMO = 18;

/** Elementos que se usan con el ratón: sobre ellos el gesto no arrastra. */
const INTERACTIVO = 'button, a, input, textarea, select, [contenteditable="true"], [data-sin-arrastre]';

interface Entrada {
  pista: RefObject<HTMLDivElement>;
  /** Las cajas arrastrables (`[data-panel]`), estén en la columna que estén. */
  cajas: () => HTMLElement[];
  /** Rearma el imán al terminar el gesto. */
  aplazar: () => void;
  /** El imán pendiente se descarta al empezar el arrastre. */
  iman: MutableRefObject<number | undefined>;
  /** Arrastre en curso, si lo hay: congela el imán mientras dura. */
  gesto: MutableRefObject<Gesto | null>;
  /** Colocar la copia del arrastre: lo usa también la animación FLIP. */
  colocarRef: MutableRefObject<((gesto: Gesto, x: number, y: number) => void) | null>;
  alMover: MutableRefObject<((movida: string, movimiento: Movimiento) => void) | undefined>;
  alSoltar: MutableRefObject<((movida: string, apilado: Movimiento | null) => void) | undefined>;
  esFija: MutableRefObject<((pieza: HTMLElement) => boolean) | undefined>;
}

export function usarArrastre({
  pista,
  cajas,
  aplazar,
  iman,
  gesto,
  colocarRef,
  alMover,
  alSoltar,
  esFija,
}: Entrada): void {
  // Arrastre: se engancha en el carril y se decide en el primer movimiento si
  // el gesto era un clic (sobre un botón, un campo o un texto) o un arrastre.
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo) return;
    let inicio: { pieza: HTMLElement; x: number; y: number; puntero: number; tactil: boolean } | null = null;
    /** Apilado que se aplicará al soltar y la caja que lo señala. */
    let pendiente: Movimiento | null = null;
    let marcada: HTMLElement | null = null;

    /** La caja bajo un nodo, sin salirse del carril. */
    const cajaDe = (destino: Element | null): HTMLElement | null => {
      const caja = destino?.closest<HTMLElement>('[data-panel]') ?? null;
      return caja && nodo.contains(caja) ? caja : null;
    };

    /** Pinta (o quita) la línea que dice dónde se apilará la caja. */
    const marcar = (movimiento: Movimiento | null) => {
      pendiente = movimiento;
      const destino = movimiento ? (cajas().find((c) => c.dataset.panel === movimiento.referencia) ?? null) : null;
      if (marcada && marcada !== destino) marcada.removeAttribute('data-destino');
      marcada = destino;
      if (destino && movimiento) destino.dataset.destino = movimiento.despues ? 'despues' : 'antes';
    };

    /** Las columnas como las ve el ojo, con las medidas que usa la regla de
     *  destino. Una columna es el padre de sus cajas; las fijas no cuentan. */
    const medir = (): ColumnaMedida[] => {
      const porColumna = new Map<HTMLElement, ColumnaMedida>();
      for (const caja of cajas()) {
        const columna = caja.parentElement;
        if (!columna || esFija.current?.(caja)) continue;
        const rect = caja.getBoundingClientRect();
        let medida = porColumna.get(columna);
        if (!medida) {
          const c = columna.getBoundingClientRect();
          medida = { izq: c.left, der: c.right, cajas: [] };
          porColumna.set(columna, medida);
        }
        medida.cajas.push({ id: caja.dataset.panel ?? '', arriba: rect.top, abajo: rect.bottom });
      }
      return [...porColumna.values()].sort((a, b) => a.izq - b.izq);
    };

    const terminar = (soltar: boolean) => {
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
      const apilado = soltar ? pendiente : null;
      marcar(null);
      if (!actual) return;
      gesto.current = null;
      colocarRef.current = null;
      document.body.style.removeProperty('user-select');
      actual.pieza.classList.remove('carril__pieza--arrastrada');
      const copia = actual.copia;
      /* varsense-disable cssInlineScript — la copia que vuela y la que sigue
       * al puntero se dimensionan y se mueven con la geometría medida en vivo:
       * esos píxeles los decide el gesto, no una clase CSS. */
      if (apilado) {
        // La caja cambia de columna al soltar: no hay hueco al que volar, la
        // copia se disuelve donde se soltó y la caja aparece en su sitio nuevo.
        const vuelo = copia.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DURACION / 2 });
        vuelo.finished.catch(() => {}).finally(() => copia.remove());
      } else {
        // La copia vuela hasta el hueco que dejó: el ojo sigue la pieza hasta su
        // sitio en vez de verla desaparecer donde se soltó.
        const destino = actual.pieza.getBoundingClientRect();
        copia.style.width = `${destino.width}px`;
        copia.style.height = `${destino.height}px`;
        const vuelo = copia.animate(
          [
            { transform: copia.style.transform, opacity: 1 },
            { transform: `translate(${destino.left}px, ${destino.top}px)`, opacity: 0 },
          ],
          { duration: DURACION, easing: 'cubic-bezier(.22,.61,.36,1)' },
        );
        vuelo.finished.catch(() => {}).finally(() => copia.remove());
      }
      /* varsense-enable */
      if (soltar) alSoltar.current?.(actual.id, apilado);
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
      /* varsense-disable cssInlineScript — ver `terminar`. */
      actual.copia.style.width = `${pieza.width}px`;
      actual.copia.style.height = `${pieza.height}px`;
      const x = xCliente - actual.puntero * pieza.width;
      actual.copia.style.transform = `translate(${x}px, ${yCliente - actual.dentro}px)`;
      /* varsense-enable */
    };
    colocarRef.current = colocar;

    /** Qué hacer con la caja en este punto: primero lo que se aplica en vivo
     *  (pasar por el borde de otra columna, reordenar la propia pila) y, si no
     *  hay nada, el apilado que se aplicará al soltar. */
    const decidir = (id: string, x: number, y: number) => {
      const columnas = medir();
      const enVivo =
        destinoPorBorde(columnas, id, x) ??
        (() => {
          const propia = columnas.find((c) => c.cajas.some((caja) => caja.id === id));
          return propia && propia.cajas.length > 1 ? destinoEnPila(propia, id, y) : null;
        })();
      if (enVivo) {
        marcar(null);
        alMover.current?.(id, enVivo);
        return;
      }
      marcar(destinoApilar(columnas, id, x, y));
    };

    const alMoverPuntero = (evento: PointerEvent) => {
      const nodoPista = pista.current;
      if (!inicio || !nodoPista) return;
      const dx = evento.clientX - inicio.x;
      const dy = evento.clientY - inicio.y;

      if (!gesto.current) {
        // Un gesto corto todavía puede ser un clic; con el dedo, uno vertical es
        // el scroll de la página. Con el ratón se arrastra en cualquier dirección:
        // apilar es un gesto vertical.
        if (Math.max(Math.abs(dx), Math.abs(dy)) < UMBRAL) return;
        if (inicio.tactil && Math.abs(dx) < Math.abs(dy)) return;
        if (esFija.current?.(inicio.pieza)) return;

        // Copia flotante: la pieza real se queda de hueco y esta sigue al dedo.
        const copia = inicio.pieza.cloneNode(true) as HTMLElement;
        copia.classList.add('carril__copia');
        copia.classList.remove('carril__pieza--arrastrada');
        copia.removeAttribute('id');
        copia.removeAttribute('data-destino');
        copia.setAttribute('aria-hidden', 'true');
        const caja = inicio.pieza.getBoundingClientRect();
        /* varsense-disable cssInlineScript — ver `terminar`. */
        copia.style.width = `${caja.width}px`;
        copia.style.height = `${caja.height}px`;
        document.body.append(copia);
        inicio.pieza.classList.add('carril__pieza--arrastrada');
        document.body.style.setProperty('user-select', 'none');
        /* varsense-enable */
        const actual: Gesto = {
          pieza: inicio.pieza,
          copia,
          id: inicio.pieza.dataset.panel ?? '',
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
      }

      const actual = gesto.current;
      colocar(actual, evento.clientX, evento.clientY);
      empujarBorde(evento.clientX);
      decidir(actual.id, evento.clientX, evento.clientY);
    };

    /** Acerca el carril cuando la mano llega a un borde. Avanza **solo al mover
     *  el puntero**, no en un bucle propio: con un bucle, dejar quieta la mano
     *  junto al borde hacía pasar todas las cajas por debajo y la arrastrada
     *  acababa al final con un gesto de dos píxeles. Con el paso atado al
     *  movimiento, el carril avanza justo lo que avanza la mano. */
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
    };

    const alPulsar = (evento: PointerEvent) => {
      if (evento.button !== 0 || gesto.current) return;
      // Las acciones de la cabecera y los campos son suyos: no inician arrastre.
      if (evento.target instanceof Element && evento.target.closest(INTERACTIVO)) return;
      const pieza = cajaDe(evento.target as Element | null);
      if (!pieza) return;
      inicio = {
        pieza,
        x: evento.clientX,
        y: evento.clientY,
        puntero: evento.pointerId,
        tactil: evento.pointerType === 'touch',
      };
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
      marcar(null);
      gesto.current?.copia.remove();
      gesto.current = null;
      colocarRef.current = null;
      inicio = null;
      document.body.style.removeProperty('user-select');
    };
  }, [pista, cajas, aplazar, iman, gesto, colocarRef, alMover, alSoltar, esFija]);
}

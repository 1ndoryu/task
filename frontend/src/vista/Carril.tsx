/* Carril de piezas en fila: varias cajas iguales que se recorren a lo ancho.
 * El desplazamiento es por pieza, con imán, y se detiene antes de que una cruce
 * el centro de la pantalla: así siempre hay una centrada de verdad, nunca dos a
 * medias. La primera arranca centrada porque a sus lados hay un margen que se
 * calcula al medir (mitad de pantalla menos ancho de pieza).
 *
 * No usa `scroll-snap`: el imán entra al soltar, para que quede centrada la más
 * cercana al centro, no la que encuentre el navegador. Todo se mide con los
 * desplazamientos de las piezas, no con la distancia entre centros: así el aire
 * entre ellas no se da por supuesto.
 *
 * Arrastre: tampoco usa el arrastre del navegador, que pinta su propia imagen y
 * no se puede asistir. Aquí el gesto se sigue con eventos de puntero, la pieza
 * se despega como una tarjeta que sigue al cursor y las demás se apartan solas
 * (el orden se avisa en vivo y el salto se disuelve con una animación FLIP). El
 * carril no sabe qué pinta dentro: sus hijos directos son las piezas del imán
 * (columnas, que pueden apilar varias cajas) y lo que se arrastra son las cajas
 * (`[data-panel]`) de dentro, estén en la columna que estén.
 *
 * El trabajo va repartido por hooks: el imán y la rueda (`usarImpas`), las
 * medidas (`usarMedidas`), el centrado y el FLIP (`usarDesplazamiento`) y el
 * gesto de puntero (`usarArrastre`). Aquí quedan los refs compartidos, la
 * pieza centrada y el teclado. */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Movimiento } from '../logica/destinoArrastre';
import type { Gesto } from './carril/tipos';
import { usarArrastre } from './carril/usarArrastre';
import { usarDesplazamiento } from './carril/usarDesplazamiento';
import { usarImpas } from './carril/usarImpas';
import { usarMedidas } from './carril/usarMedidas';

interface Props {
  children: ReactNode;
  /** Pieza que debe quedar centrada. Sin esto manda el propio carril. */
  indiceActivo?: number;
  /** Avisa de la pieza que acaba centrada, para reaccionar fuera. */
  onActiva?: (indice: number) => void;
  /** Se llama en vivo al pasar a otra columna o recolocarse en su pila: el
   *  padre reordena y el carril anima el salto. Sin esto no hay arrastre. */
  onMover?: (movida: string, movimiento: Movimiento) => void;
  /** El arrastre terminó: es el momento de guardar, no antes. Si se soltó sobre
   *  otra caja, trae el apilado pendiente, que solo se aplica ahora. */
  onSoltar?: (movida: string, apilado: Movimiento | null) => void;
  /** Una caja que no se arrastra ni sirve de destino. */
  fija?: (pieza: HTMLElement) => boolean;
  /** Nombre accesible: se entra con Tab y se recorre con las flechas. */
  etiqueta?: string;
}

export function Carril({
  children,
  indiceActivo,
  onActiva,
  onMover,
  onSoltar,
  fija,
  etiqueta = 'Cajas',
}: Props) {
  const pista = useRef<HTMLDivElement>(null);
  /** El imán va moviendo el carril y eso también emite `scroll`: sin esta
   *  marca, cada vuelta reprogramaría el temporizador y no se posaría nunca. */
  const moviendo = useRef(false);
  /** Índice de la pieza centrada: es lo que se restaura al redimensionar. */
  const centrada = useRef(0);
  /** Arrastre en curso, si lo hay: congela el imán mientras dura. */
  const gesto = useRef<Gesto | null>(null);
  // El callback se lee por referencia para que su identidad no obligue a
  // reenganchar los escuchadores en cada render del padre.
  const alActivar = useRef(onActiva);
  const alMover = useRef(onMover);
  const alSoltar = useRef(onSoltar);
  const esFija = useRef(fija);
  const centrarRef = useRef<(indice: number, suave: boolean) => void>(() => {});
  /** Colocar la copia del arrastre: lo usa también la animación FLIP. */
  const colocarRef = useRef<((gesto: Gesto, x: number, y: number) => void) | null>(null);
  useEffect(() => {
    alActivar.current = onActiva;
    alMover.current = onMover;
    alSoltar.current = onSoltar;
    esFija.current = fija;
  });

  /** Los hijos directos son las piezas; el carril no mira su clase ni su tipo. */
  const piezas = useCallback(
    (): HTMLElement[] => (pista.current ? [...(pista.current.children as HTMLCollectionOf<HTMLElement>)] : []),
    [],
  );

  /** Las cajas arrastrables, en cualquier columna: lo que lleva `data-panel`. */
  const cajas = useCallback(
    (): HTMLElement[] => (pista.current ? [...pista.current.querySelectorAll<HTMLElement>('[data-panel]')] : []),
    [],
  );

  /** Centro de una pieza en coordenadas del contenido (sin descontar el scroll). */
  const centro = useCallback((pieza: HTMLElement) => pieza.offsetLeft + pieza.offsetWidth / 2, []);

  /** Lleva una pieza al centro; si el carril no llega hasta ahí, a su límite. */
  const centrar = useCallback(
    (indice: number, suave: boolean) => {
      const nodo = pista.current;
      const pieza = piezas()[indice];
      if (!nodo || !pieza) return;
      const limite = Math.max(0, nodo.scrollWidth - nodo.clientWidth);
      const x = Math.min(limite, Math.max(0, centro(pieza) - nodo.clientWidth / 2));
      // Ya está ahí: un `scrollTo` al mismo sitio no aporta y, en suave, deja
      // la marca de movimiento puesta sin que llegue ningún evento de scroll.
      if (Math.abs(nodo.scrollLeft - x) < 1) return;
      if (suave) moviendo.current = true;
      nodo.scrollTo({ left: x, behavior: suave ? 'smooth' : 'auto' });
    },
    [piezas, centro],
  );

  /** Fija qué pieza manda y solo avisa cuando cambia de verdad. */
  const marcar = useCallback(
    (indice: number) => {
      if (centrada.current === indice) return;
      centrada.current = indice;
      alActivar.current?.(indice);
    },
    [piezas],
  );

  const { iman, aplazar, alRodar } = usarImpas({ pista, piezas, centro, marcar, centrar, moviendo });

  usarMedidas({ pista, piezas, centrar, centrada, gesto });
  usarDesplazamiento({ pista, piezas, cajas, centrar, centrarRef, gesto, colocarRef, centrada, indiceActivo });
  usarArrastre({ pista, cajas, aplazar, iman, gesto, colocarRef, alMover, alSoltar, esFija });

  return (
    <div
      className={`carril${onMover ? ' carril--movible' : ''}`}
      ref={pista}
      role="group"
      aria-label={etiqueta}
      // Se entra con Tab para poder recorrerlo con el teclado; las flechas solo
      // se atienden cuando el foco es del carril, no de un campo de dentro.
      tabIndex={0}
      onKeyDown={(evento) => {
        if (evento.target !== pista.current) return;
        const paso = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0;
        const salto =
          evento.key === 'Home' ? 0 : evento.key === 'End' ? piezas().length - 1 : centrada.current + paso;
        if (!paso && !['Home', 'End'].includes(evento.key)) return;
        evento.preventDefault();
        // Un imán pendiente de un gesto anterior saltaría a mitad de este
        // desplazamiento y centraría la pieza por la que se pasa: se descarta.
        window.clearTimeout(iman.current);
        const destino = Math.min(piezas().length - 1, Math.max(0, salto));
        marcar(destino);
        centrar(destino, true);
      }}
      onScroll={alRodar}
    >
      {children}
    </div>
  );
}

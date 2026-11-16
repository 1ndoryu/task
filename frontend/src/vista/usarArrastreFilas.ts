/* Arrastre de filas para el orden manual. Gesto propio con punteros, sin el
 * arrastre nativo del navegador: la fila sale como una copia que sigue al
 * puntero, el sitio original queda de hueco, las vecinas ceden con una
 * transición y la lista rueda sola al acercarse a un borde. Al soltar, la
 * copia vuela a su sitio y solo entonces React recibe el orden nuevo.
 *
 * Una fila con subtareas o subhábitos viaja con ellos: cada «grupo» es la fila
 * raíz más las `.fila--sub` que la siguen. Todo el movimiento va por
 * `transform` sobre los nodos, sin repintar React mientras dura el gesto. */
import { useEffect, useRef, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { destinoFila, mover, type Tramo } from '../logica/reordenar';
import { DURACION } from './carril/tipos';

/** Píxeles que hay que mover el ratón para que un clic deje de serlo. */
const UMBRAL = 5;
/** Con el dedo, el gesto nace de una pulsación larga: el vertical es scroll. */
const ESPERA_TACTIL = 250;
/** Franja de los bordes de la lista donde el arrastre la hace rodar, y su tope por fotograma. */
const ZONA = 36;
const VELOCIDAD = 14;
/** Lo que no arrastra: la marca y la flecha tienen su propio clic. */
const EXCLUIDO = '.fila__marca, .fila__plegar, .fila__play, [role="menu"]';
const CURVA = 'cubic-bezier(.22,.61,.36,1)';

interface Gesto {
  id: number;
  grupos: HTMLElement[][];
  tramos: Tramo[];
  desde: number;
  destino: number;
  alto: number;
  /** Y del puntero dentro del grupo agarrado. */
  dentro: number;
  /** Subhábitos: el grupo agarrado no lleva hijos y su sitio no se encoge. */
  hijos: boolean;
  copia: HTMLElement;
  /** Último punto del puntero: el rodar de la lista lo reaplica sin moverlo. */
  y: number;
  marco: number;
}

/** Los grupos de filas del `<ul>`: cada raíz con las `.fila--sub` que la siguen. */
function gruposDe(lista: HTMLElement): HTMLElement[][] {
  const grupos: HTMLElement[][] = [];
  for (const nodo of Array.from(lista.children) as HTMLElement[]) {
    if (nodo.classList.contains('fila--sub') && grupos.length > 0) grupos[grupos.length - 1].push(nodo);
    else grupos.push([nodo]);
  }
  return grupos;
}

/** Y (dentro del `<ul>`) en que queda la fila agarrada si cae en `destino`: las que
 *  cruzó ceden su sitio, así que hacia abajo acaba al pie del tramo de destino.
 *  Con subhábitos su sitio no se encoge, así que se queda donde está y solo las
 *  hermanas cruzan. */
function sitioDe(g: Pick<Gesto, 'tramos' | 'desde' | 'alto' | 'hijos'>, destino: number): number {
  if (g.hijos) return g.tramos[g.desde].arriba;
  if (destino > g.desde) return g.tramos[destino].abajo - g.alto;
  return g.tramos[destino].arriba;
}

/** Las filas hermanas de un subhábito: el tramo seguido de subhábitos del mismo
 *  padre y del mismo nivel de importancia. Mover solo se permite dentro de ese
 *  tramo, así la importancia manda siempre en el orden y un subhábito no salta
 *  a un grupo que no es el suyo. Se toma el tramo contiguo porque la lista ya
 *  pinta juntos los de un mismo nivel: cruzar uno de otro nivel desordenaría
 *  las vecinas que el gesto no mueve. */
function gruposHermanosDe(ul: HTMLElement, nodo: HTMLElement): HTMLElement[][] {
  const padre = nodo.dataset.padre ?? '';
  const nivel = nodo.dataset.nivel ?? '';
  const subs = (Array.from(ul.children) as HTMLElement[]).filter(
    (fila) => fila.classList.contains('fila--sub') && fila.dataset.padre !== undefined,
  );
  const i = subs.indexOf(nodo);
  if (i < 0) return [];
  const igual = (fila: HTMLElement) => fila.dataset.padre === padre && fila.dataset.nivel === nivel;
  let desde = i;
  let hasta = i;
  while (desde > 0 && igual(subs[desde - 1])) desde--;
  while (hasta < subs.length - 1 && igual(subs[hasta + 1])) hasta++;
  return subs.slice(desde, hasta + 1).map((fila) => [fila]);
}

/** Qué se puede agarrar: las filas raíz solo con orden manual, los subhábitos
 *  siempre (su orden vive en el payload del padre y la importancia manda, así
 *  que no choca con ningún modo de orden de la caja). */
export interface Arrastrables {
  raices: boolean;
  subs: boolean;
}

/** `lista` es el `<ul>` de filas; `alSoltar(grupos, hijos)` recibe los nodos de
 *  todos los grupos ya en su orden nuevo, y si lo agarrado era un subhábito. */
export function usarArrastreFilas(
  lista: RefObject<HTMLUListElement>,
  permitir: Arrastrables,
  alSoltar: (grupos: HTMLElement[][], hijos: boolean) => void,
): void {
  // Dentro del efecto basta con saber si hay algo agarrable.
  const activo = permitir.raices || permitir.subs;
  const permitirRef = useRef(permitir);
  permitirRef.current = permitir;
  // La última versión del manejador sin reenganchar los eventos en cada render.
  const soltar = useRef(alSoltar);
  soltar.current = alSoltar;

  useEffect(() => {
    const ul = lista.current;
    if (!ul || !activo) return;
    const marco = ul.closest<HTMLElement>('.scroll') ?? ul;
    let gesto: Gesto | null = null;
    // Pulsado y aún sin gesto: espera a moverse lo bastante (o a la pulsación larga).
    let pendiente: { id: number; x: number; y: number; nodo: HTMLElement; hijos: boolean; tactil: boolean; espera: number } | null = null;
    let teclaEscape: ((e: KeyboardEvent) => void) | null = null;
    // La copia está volando a su sitio: aún no se acepta otro gesto.
    let volando = false;

    const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Coloca la copia bajo el puntero (sin salirse de la lista) y cede a las vecinas. */
    const actualizar = (g: Gesto) => {
      const caja = marco.getBoundingClientRect();
      const cuerpo = ul.getBoundingClientRect();
      const y = Math.min(Math.max(g.y - g.dentro, caja.top), Math.max(caja.top, caja.bottom - g.alto));
      /* varsense-disable cssInlineScript — la copia sigue al puntero: su sitio es del gesto, no de una hoja. */
      g.copia.style.transform = `translate(${cuerpo.left}px, ${y}px)`;
      const arriba = y - cuerpo.top;
      const destino = destinoFila(g.tramos, g.desde, arriba, arriba + g.alto);
      if (destino !== g.destino) ceder(g, destino);
    };

    /** Las vecinas ceden (o recuperan) su sitio según dónde caería la fila agarrada. */
    const ceder = (g: Gesto, destino: number) => {
      g.destino = destino;
      g.grupos.forEach((grupo, i) => {
        // Hacia abajo las del medio suben el alto de la arrastrada; hacia arriba, bajan.
        // El hueco (la fila agarrada, ya sin contenido) se desliza al sitio que quedó libre.
        const dy =
          i === g.desde
            ? sitioDe(g, destino) - g.tramos[g.desde].arriba
            : i > g.desde && i <= destino ? -g.alto : i < g.desde && i >= destino ? g.alto : 0;
        /* varsense-disable cssInlineScript — mismo caso que la copia: el desplazamiento es del gesto. */
        for (const nodo of grupo) nodo.style.transform = dy === 0 ? '' : `translateY(${dy}px)`;
      });
    };

    /** Rueda la lista cuando el puntero está en su borde, hasta que se suelte. */
    const rodar = (g: Gesto) => {
      const caja = marco.getBoundingClientRect();
      const falta = g.y < caja.top + ZONA ? g.y - (caja.top + ZONA) : g.y > caja.bottom - ZONA ? g.y - (caja.bottom - ZONA) : 0;
      if (falta !== 0) {
        const antes = marco.scrollTop;
        marco.scrollTop += Math.sign(falta) * Math.min(VELOCIDAD, Math.abs(falta) / 2 + 1);
        if (marco.scrollTop !== antes) actualizar(g);
      }
      g.marco = requestAnimationFrame(() => rodar(g));
    };

    const comenzar = (nodo: HTMLElement, id: number, y: number, hijos: boolean) => {
      // Agarrar un subhábito: los grupos son las filas hermanas que comparten
      // padre y nivel. Su padre no entra, así que la fila arrastrada no puede
      // caer fuera de ese tramo.
      const grupos = hijos ? gruposHermanosDe(ul, nodo) : gruposDe(ul);
      const desde = grupos.findIndex((g) => g[0] === nodo);
      if (desde < 0) return;
      const cuerpo = ul.getBoundingClientRect();
      const tramos = grupos.map((g) => ({
        arriba: g[0].getBoundingClientRect().top - cuerpo.top,
        abajo: g[g.length - 1].getBoundingClientRect().bottom - cuerpo.top,
      }));
      const alto = tramos[desde].abajo - tramos[desde].arriba;

      // La copia lleva las variables de la caja (tallas y colores de nivel), que
      // viven en su `style`: fuera de ella las filas se pintarían sin ellas.
      const copia = document.createElement('ul');
      copia.className = 'lista fila-copia';
      copia.style.cssText = ul.closest<HTMLElement>('.caja')?.style.cssText ?? '';
      /* varsense-disable cssInlineScript — medidas de la fila agarrada, que solo se conocen al agarrar. */
      copia.style.width = `${cuerpo.width}px`;
      for (const fila of grupos[desde]) copia.append(fila.cloneNode(true));
      document.body.append(copia);

      grupos.forEach((grupo, i) => {
        for (const fila of grupo) fila.classList.add(i === desde ? 'fila--hueco' : 'fila--cede');
      });
      document.body.classList.add('arrastrando-filas');
      try {
        ul.setPointerCapture(id);
      } catch {
        /* El puntero ya se soltó: el gesto termina en el siguiente evento. */
      }
      gesto = { id, grupos, tramos, desde, destino: desde, alto, dentro: y - (cuerpo.top + tramos[desde].arriba), copia, y, marco: 0, hijos };
      actualizar(gesto);
      rodar(gesto);

      teclaEscape = (e) => {
        if (e.key === 'Escape') terminar(false);
      };
      window.addEventListener('keydown', teclaEscape);
    };

    /** Limpia el gesto: quita copia, hueco y transformaciones. */
    const limpiar = (g: Gesto) => {
      cancelAnimationFrame(g.marco);
      g.copia.remove();
      for (const grupo of g.grupos) {
        for (const fila of grupo) {
          fila.classList.remove('fila--hueco', 'fila--cede');
          fila.style.removeProperty('transform');
        }
      }
      document.body.classList.remove('arrastrando-filas');
      if (teclaEscape) window.removeEventListener('keydown', teclaEscape);
      teclaEscape = null;
      gesto = null;
    };

    /** Suelta: la copia vuela a su sitio (o vuelve al origen si se cancela) y
     *  solo entonces cambia el orden, en el mismo cuadro en que se retira la copia. */
    const terminar = (aplicar: boolean) => {
      const g = gesto;
      if (!g) return;
      // Se suelta una vez: los eventos que lleguen mientras vuela no hacen nada.
      gesto = null;
      volando = true;
      cancelAnimationFrame(g.marco);
      const destino = aplicar ? g.destino : g.desde;
      // Cancelado: las vecinas vuelven a su sitio mientras la copia regresa.
      if (!aplicar && g.destino !== g.desde) ceder(g, g.desde);
      const cuerpo = ul.getBoundingClientRect();
      const sitio = sitioDe(g, destino);
      const origen = g.copia.style.transform;
      // Un solo cierre: el vuelo puede terminar, cancelarse o quedarse parado
      // (pestaña en segundo plano congela la línea de tiempo) y los tres casos
      // acaban igual.
      let cerrado = false;
      const fin = () => {
        if (cerrado) return;
        cerrado = true;
        // Sin transición y sin transformaciones antes de reordenar: si no, las
        // vecinas viajarían de nuevo a un sitio al que React ya las colocó.
        limpiar(g);
        volando = false;
        // Los grupos, ya en su orden nuevo: la lista de nodos lo es todo para
        // quien aplica el cambio, y así no hay que traducir índices.
        if (destino !== g.desde) flushSync(() => soltar.current([...mover(g.grupos, g.desde, destino)], g.hijos));
      };
      // Mientras vuela, el hueco va al sitio del destino: las vecinas ya están cedidas.
      if (reducido()) return fin();
      const vuelo = g.copia.animate(
        [{ transform: origen }, { transform: `translate(${cuerpo.left}px, ${cuerpo.top + sitio}px)` }],
        { duration: DURACION, easing: CURVA, fill: 'forwards' },
      );
      vuelo.onfinish = fin;
      vuelo.oncancel = fin;
      // Respaldo: si la animación no termina (pestaña oculta, línea de tiempo
      // parada), el soltar se pierde y la fila queda flotando. El orden se
      // aplica igual, un pelo después de lo que duraría el vuelo.
      window.setTimeout(fin, DURACION + 150);
    };

    const alMover = (e: PointerEvent) => {
      if (gesto && e.pointerId === gesto.id) {
        gesto.y = e.clientY;
        actualizar(gesto);
        return;
      }
      if (!pendiente || e.pointerId !== pendiente.id) return;
      const lejos = Math.hypot(e.clientX - pendiente.x, e.clientY - pendiente.y) >= UMBRAL;
      // Con el dedo, moverse antes de la pulsación larga es hacer scroll.
      if (pendiente.tactil) {
        if (lejos) soltarPendiente();
        return;
      }
      if (lejos) {
        const { nodo, id, y, hijos } = pendiente;
        soltarPendiente();
        // Se agarra por donde se pulsó (no por donde se supera el umbral) y la copia alcanza al puntero.
        comenzar(nodo, id, y, hijos);
        if (gesto) {
          gesto.y = e.clientY;
          actualizar(gesto);
        }
      }
    };

    const alTerminar = (e: PointerEvent) => {
      if (gesto && e.pointerId === gesto.id) {
        // Un clic no sigue a un arrastre: el que el navegador lanza al soltar se descarta.
        const tragar = (clic: Event) => clic.stopPropagation();
        window.addEventListener('click', tragar, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener('click', tragar, true), 0);
        terminar(e.type === 'pointerup');
      } else if (pendiente && e.pointerId === pendiente.id) soltarPendiente();
    };

    const soltarPendiente = () => {
      if (!pendiente) return;
      window.clearTimeout(pendiente.espera);
      pendiente = null;
    };

    const alPulsar = (e: PointerEvent) => {
      if (e.button !== 0 || gesto || pendiente || volando) return;
      const destino = e.target instanceof Element ? e.target : null;
      if (!destino || destino.closest(EXCLUIDO)) return;
      const nodo = destino.closest<HTMLElement>('li.fila');
      if (!nodo || nodo.parentElement !== ul) return;
      // El subhábito lleva `data-padre`; una subtarea no, y por eso no arrastra.
      // El subhábito sin hermanos de su nivel tampoco: no hay a dónde moverlo.
      const hijos = nodo.dataset.padre !== undefined;
      if (hijos ? !permitirRef.current.subs || gruposHermanosDe(ul, nodo).length < 2 : !permitirRef.current.raices) return;
      // La caja del carril también arrastra desde lo que no es botón: esto manda aquí.
      e.stopPropagation();
      const tactil = e.pointerType === 'touch';
      pendiente = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        nodo,
        hijos,
        tactil,
        espera: tactil
          ? window.setTimeout(() => {
              const p = pendiente;
              if (!p) return;
              soltarPendiente();
              comenzar(p.nodo, p.id, p.y, p.hijos);
            }, ESPERA_TACTIL)
          : 0,
      };
    };

    // Ya en marcha, el dedo no debe hacer scroll por debajo del gesto.
    const alTocar = (e: TouchEvent) => {
      if (gesto) e.preventDefault();
    };

    // Los tres de la ventana viven lo que el efecto: el gesto nace de un pendiente
    // y sigue después, así que no se enganchan y desenganchan con cada fase.
    ul.addEventListener('pointerdown', alPulsar);
    ul.addEventListener('touchmove', alTocar, { passive: false });
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alTerminar);
    window.addEventListener('pointercancel', alTerminar);
    return () => {
      ul.removeEventListener('pointerdown', alPulsar);
      ul.removeEventListener('touchmove', alTocar);
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', alTerminar);
      window.removeEventListener('pointercancel', alTerminar);
      soltarPendiente();
      if (gesto) limpiar(gesto);
    };
  }, [lista, activo]);
}

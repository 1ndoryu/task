/* Los hilos rojos: una cuerda por cada requisito sin hacer, desde la marca de
 * la fila que espera hasta la marca de lo que debe ir antes. Cuelga con
 * gravedad y se mueve con las filas (scroll, reorden, redimensionar): un
 * muelle amortiguado lleva el punto de control hacia donde caería la cuerda.
 * Es una capa fija sobre toda la vista, así cruza de una caja a otra. Las
 * filas que no se ven (otra pestaña, plegadas, fuera del scroll) no pintan. */
import { useEffect, useRef } from 'react';

interface Props {
  hilos: { desde: string; hasta: string }[];
}

/** Rigidez y freno del muelle: la cuerda se asienta en ~0,4 s sin rebotar de más. */
const RIGIDEZ = 0.12;
const FRENO = 0.78;
/** Caída mínima y proporcional a la distancia: más lejos, más seno. */
const CAIDA_BASE = 28;
const CAIDA_POR_PX = 0.3;

/** Centro de la marca de una fila, o `null` si no se ve entera dentro de su caja. */
export function puntoDe(clave: string): { x: number; y: number } | null {
  const marca = document.querySelector<HTMLElement>(`[data-fila="${clave}"] .fila__marca`);
  if (!marca || marca.offsetParent === null) return null;
  const r = marca.getBoundingClientRect();
  // Recorta con la caja que la contiene: una fila scrolleada fuera no ata nada.
  const caja = marca.closest('.caja')?.getBoundingClientRect();
  if (caja && (r.top < caja.top || r.bottom > caja.bottom || r.left < caja.left || r.right > caja.right)) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function HilosDependencias({ hilos }: Props) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!hilos.length) return;
    // Estado del muelle por hilo: posición y velocidad del punto de control.
    const muelles = hilos.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, listo: false }));
    let cuadro = 0;
    const pintar = () => {
      hilos.forEach((hilo, i) => {
        const nodo = svg.current?.children[i] as SVGGElement | undefined;
        if (!nodo) return;
        const a = puntoDe(hilo.desde);
        const b = puntoDe(hilo.hasta);
        nodo.style.visibility = a && b ? 'visible' : 'hidden';
        const m = muelles[i];
        if (!a || !b) {
          m.listo = false;
          return;
        }
        // Donde caería la cuerda en reposo: bajo el punto medio.
        const objetivo = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + CAIDA_BASE + Math.hypot(b.x - a.x, b.y - a.y) * CAIDA_POR_PX };
        if (!m.listo) Object.assign(m, { x: objetivo.x, y: objetivo.y, vx: 0, vy: 0, listo: true });
        m.vx = (m.vx + (objetivo.x - m.x) * RIGIDEZ) * FRENO;
        m.vy = (m.vy + (objetivo.y - m.y) * RIGIDEZ) * FRENO;
        m.x += m.vx;
        m.y += m.vy;
        // Solo la cuerda: sin puntos en los extremos.
        nodo.firstElementChild?.setAttribute('d', `M${a.x} ${a.y}Q${m.x} ${m.y} ${b.x} ${b.y}`);
      });
      cuadro = requestAnimationFrame(pintar);
    };
    cuadro = requestAnimationFrame(pintar);
    return () => cancelAnimationFrame(cuadro);
  }, [hilos]);

  return (
    <svg ref={svg} className="hilos" aria-hidden="true">
      {hilos.map((hilo) => (
        <g key={`${hilo.desde}>${hilo.hasta}`} className="hilos__hilo">
          <path className="hilos__cuerda" />
        </g>
      ))}
    </svg>
  );
}

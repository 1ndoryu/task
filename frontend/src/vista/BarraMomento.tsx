/* Barra del día: temprano, tarde y noche en tres colores, con una marca en la
 * hora actual. Cada tramo mide lo que dura según las horas de los ajustes (de
 * fábrica 7 h, 7 h y 10 h) y el día empieza donde empieza «temprano».
 *
 * Los tramos se pueden pulsar: elegir uno hace que el orden inteligente se
 * ordene como si fuera ese momento, sin tocar el reloj. El doble clic devuelve
 * la barra al momento de verdad; también se suelta sola al recargar, porque es
 * una mirada, no un ajuste. */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Algoritmo } from '../logica/algoritmo';
import { MOMENTOS, momentoDe, type Momento } from '../logica/momentos';

/* Las clases van enteras, no compuestas: la hoja y el índice casan el literal. */
const TRAMOS: { id: Momento; clase: string; etiqueta: string }[] = [
  { id: 'temprano', clase: 'momento__tramo momento__tramo--temprano', etiqueta: 'Temprano' },
  { id: 'tarde', clase: 'momento__tramo momento__tramo--tarde', etiqueta: 'Tarde' },
  { id: 'noche', clase: 'momento__tramo momento__tramo--noche', etiqueta: 'Noche' },
];

/** Fecha y hora actuales, al día cada minuto: basta para mover la marca. */
function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(reloj);
  }, []);
  return ahora;
}

/** Cuánto dura cada momento en horas: la noche se cierra dando la vuelta al día. */
function duraciones(a: Algoritmo): Record<Momento, number> {
  return { temprano: a.horaTarde - a.horaTemprano, tarde: a.horaNoche - a.horaTarde, noche: 24 - (a.horaNoche - a.horaTemprano) };
}

/** Posición de la hora en la barra, de 0 a 100: horas desde que empieza «temprano» sobre las 24. */
function posicionDe(ahora: Date, inicio: number): number {
  const horas = ahora.getHours() + ahora.getMinutes() / 60;
  return (((horas - inicio + 24) % 24) / 24) * 100;
}

interface Props {
  algoritmo: Algoritmo;
  /** El que manda ahora mismo: el elegido a mano o el del reloj. */
  actual: Momento;
  /** `null` vuelve a seguir el reloj. */
  onElegir: (momento: Momento | null) => void;
}

export function BarraMomento({ algoritmo, actual, onElegir }: Props) {
  const ahora = useAhora();
  const real = momentoDe(ahora, algoritmo);
  const elegido = actual !== real;
  const etiqueta = MOMENTOS.find((m) => m.id === actual)?.etiqueta ?? '';
  // Un clic seguido de otro llegarían como clic + doble clic: se retiene el
  // primero lo justo para saber si era el principio de un doble.
  const espera = useRef(0);
  const horas = duraciones(algoritmo);

  useEffect(() => () => window.clearTimeout(espera.current), []);

  const elegir = (id: Momento) => onElegir(id === actual ? null : id);
  const soltar = () => {
    window.clearTimeout(espera.current);
    onElegir(null);
  };

  const alPulsar = (id: Momento) => {
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => elegir(id), 180);
  };

  // Con el teclado no hay doble clic: Enter y Espacio eligen, Escape suelta.
  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>, id: Momento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      elegir(id);
    } else if (evento.key === 'Escape' && elegido) {
      evento.preventDefault();
      soltar();
    }
  };

  return (
    <div
      className="momento"
      role="group"
      aria-label={elegido ? `Momento del día elegido a mano: ${etiqueta}. Doble clic para volver al real.` : `Momento del día: ${etiqueta}`}
    >
      <div className="momento__pista">
        {TRAMOS.map((tramo) => (
          <button
            key={tramo.id}
            type="button"
            className={tramo.clase}
            data-activo={tramo.id === actual}
            data-elegido={tramo.id === actual && elegido}
            aria-pressed={tramo.id === actual}
            aria-label={`${tramo.etiqueta}${tramo.id === actual && elegido ? ', elegido a mano' : ''}`}
            style={{ '--horas': horas[tramo.id] } as CSSProperties}
            onClick={() => alPulsar(tramo.id)}
            onDoubleClick={soltar}
            onKeyDown={(evento) => alTeclear(evento, tramo.id)}
          />
        ))}
        {/* La marca es la hora real, también cuando se mira otro momento: es lo
            que dice de dónde se ha salido. */}
        <span
          className="momento__marca"
          style={{ '--posicion': `${posicionDe(ahora, algoritmo.horaTemprano)}%` } as CSSProperties}
        />
      </div>
      <span className="momento__nombre" title={elegido ? 'Elegido a mano · doble clic para volver al momento real' : undefined}>
        {etiqueta}
      </span>
    </div>
  );
}

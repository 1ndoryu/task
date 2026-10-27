/* Barra del día: temprano, tarde y noche en tres colores, con una marca en la
 * hora actual. Cada tramo mide lo que dura según las horas de los ajustes (de
 * fábrica 7 h, 7 h y 10 h) y el día empieza donde empieza «temprano». */
import { useEffect, useState, type CSSProperties } from 'react';
import type { Algoritmo } from '../logica/algoritmo';
import { momentoDe, type Momento } from '../logica/momentos';

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

export function BarraMomento({ algoritmo }: { algoritmo: Algoritmo }) {
  const ahora = useAhora();
  const actual = momentoDe(ahora, algoritmo);
  const etiqueta = TRAMOS.find((tramo) => tramo.id === actual)?.etiqueta ?? '';
  const horas = duraciones(algoritmo);
  return (
    <div className="momento" role="img" aria-label={`Momento del día: ${etiqueta}`}>
      <div className="momento__pista">
        {TRAMOS.map((tramo) => (
          <div
            key={tramo.id}
            className={tramo.clase}
            data-activo={tramo.id === actual}
            style={{ '--horas': horas[tramo.id] } as CSSProperties}
          />
        ))}
        <span
          className="momento__marca"
          style={{ '--posicion': `${posicionDe(ahora, algoritmo.horaTemprano)}%` } as CSSProperties}
        />
      </div>
      <span className="momento__nombre">{etiqueta}</span>
    </div>
  );
}

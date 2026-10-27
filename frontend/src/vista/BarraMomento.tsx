/* Barra del día: temprano, tarde y noche en tres colores, con una marca en la
 * hora actual. Cada tramo mide lo que dura (7 h, 7 h y 10 h) y el día empieza a
 * las 5, que es donde `momentoDe` arranca «temprano». */
import { useEffect, useState, type CSSProperties } from 'react';
import { momentoDe, type Momento } from '../logica/momentos';

const INICIO_DIA = 5;

/* Las clases van enteras, no compuestas: la hoja y el índice casan el literal. */
const TRAMOS: { id: Momento; clase: string; horas: number; etiqueta: string }[] = [
  { id: 'temprano', clase: 'momento__tramo momento__tramo--temprano', horas: 7, etiqueta: 'Temprano' },
  { id: 'tarde', clase: 'momento__tramo momento__tramo--tarde', horas: 7, etiqueta: 'Tarde' },
  { id: 'noche', clase: 'momento__tramo momento__tramo--noche', horas: 10, etiqueta: 'Noche' },
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

/** Posición de la hora en la barra, de 0 a 100: horas desde las 5 sobre las 24. */
function posicionDe(ahora: Date): number {
  const horas = ahora.getHours() + ahora.getMinutes() / 60;
  return (((horas - INICIO_DIA + 24) % 24) / 24) * 100;
}

export function BarraMomento() {
  const ahora = useAhora();
  const actual = momentoDe(ahora);
  const etiqueta = TRAMOS.find((tramo) => tramo.id === actual)?.etiqueta ?? '';
  return (
    <div className="momento" role="img" aria-label={`Momento del día: ${etiqueta}`}>
      <div className="momento__pista">
        {TRAMOS.map((tramo) => (
          <div
            key={tramo.id}
            className={tramo.clase}
            data-activo={tramo.id === actual}
            style={{ '--horas': tramo.horas } as CSSProperties}
          />
        ))}
        <span className="momento__marca" style={{ '--posicion': `${posicionDe(ahora)}%` } as CSSProperties} />
      </div>
      <span className="momento__nombre">{etiqueta}</span>
    </div>
  );
}

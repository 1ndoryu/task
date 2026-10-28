/* Campo «Fecha límite» de la configuración de una tarea: el día vigente en un
 * botón que abre el calendario, y «Quitar» cuando hay uno. Sustituye al selector
 * de 120 días: el calendario deja ir a cualquier mes y se ve la semana entera. */
import { useState } from 'react';
import { fechaEnPalabras, hoyLogico } from '../logica/fechas';
import { Calendario } from './Calendario';

interface Props {
  /** `YYYY-MM-DD`, o `''` si la tarea no tiene fecha. */
  valor: string;
  onElegir: (fecha: string) => void;
}

export function CampoFechaLimite({ valor, onElegir }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="campo__fecha">
      <button
        type="button"
        className="selector__disparador"
        aria-haspopup="dialog"
        aria-label="Fecha límite de la tarea"
        onClick={() => setAbierto(true)}
      >
        <span className={`selector__valor${valor ? '' : ' selector__valor--vacio'}`}>
          {valor ? fechaEnPalabras(valor) : 'Sin fecha'}
        </span>
      </button>
      {valor && (
        <button type="button" className="boton" onClick={() => onElegir('')}>
          Quitar
        </button>
      )}
      {abierto && (
        <Calendario
          titulo="Fecha límite"
          valor={valor || null}
          hoy={hoyLogico()}
          onElegir={(dia) => {
            onElegir(dia);
            setAbierto(false);
          }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </div>
  );
}

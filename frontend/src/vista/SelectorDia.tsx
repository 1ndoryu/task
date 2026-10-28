/* La fecha del diario como botón: al pulsarla abre el calendario para saltar a
 * cualquier día pasado. Guarda aquí si está abierto para que `CajaDiario` no
 * cargue con un estado que solo es de este gesto. */
import { useState } from 'react';
import { Calendario } from './Calendario';

interface Props {
  /** La fecha ya en palabras, que es lo que se lee en el botón. */
  texto: string;
  fecha: string;
  hoy: string;
  onElegir: (fecha: string) => void;
}

export function SelectorDia({ texto, fecha, hoy, onElegir }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        className="barra__titulo barra__titulo--centrado diario__fecha"
        title="Elegir otro día"
        aria-haspopup="dialog"
        onClick={() => setAbierto(true)}
      >
        {texto}
      </button>
      {abierto && (
        <Calendario
          titulo="Día del diario"
          valor={fecha}
          hoy={hoy}
          max={hoy}
          onElegir={(dia) => {
            onElegir(dia);
            setAbierto(false);
          }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}

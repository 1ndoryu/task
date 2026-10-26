/* Caja «Diario»: una nota por día con dos flechas para moverse entre fechas. Es
 * una `CajaNota` con otra cabecera: el título es la fecha y no se avanza más
 * allá de hoy, porque el diario se escribe hacia atrás, no hacia el futuro.
 *
 * El día visible vive aquí y no en `usarNotas`: es estado de la vista, no de
 * los datos. Lo escrito se guarda por día a través de `acceso`. */
import { useState } from 'react';
import { fechaEnPalabras, sumarDias } from '../logica/fechas';
import type { Preferencias, TamanoCaja } from '../logica/preferencias';
import { CajaNota } from './CajaNota';
import { IconoAnterior, IconoSiguiente } from './IconosDiario';
import type { AccesoDiario } from './usarNotas';

interface Props {
  idPanel: string;
  /** Día de hoy: la fecha más reciente a la que se puede avanzar. */
  hoy: string;
  preferencias: Preferencias;
  acceso: AccesoDiario;
  tamano?: TamanoCaja;
  onTamano?: (tamano: TamanoCaja | undefined) => void;
}

export function CajaDiario({ idPanel, hoy, preferencias, acceso, tamano, onTamano }: Props) {
  // Arranca en hoy: al abrir el diario se ve lo de hoy, no un día viejo.
  const [fecha, setFecha] = useState(hoy);
  const esHoy = fecha >= hoy;
  const titulo = fechaEnPalabras(fecha);

  return (
    <CajaNota
      // Un día es una nota distinta: al cambiar, el campo se monta de nuevo y
      // no arrastra el texto del día anterior.
      key={fecha}
      idPanel={idPanel}
      preferencias={preferencias}
      titulo={titulo}
      texto={acceso.textoDe(fecha)}
      onEscribir={(contenido) => acceso.escribir(fecha, contenido)}
      onConfirmar={() => acceso.confirmar(fecha)}
      tamano={tamano}
      onTamano={onTamano}
      // La cabecera solo lleva la fecha, centrada; moverse de día es del pie.
      cabecera={
        <header className="barra">
          <span className="barra__titulo barra__titulo--centrado">{titulo}</span>
        </header>
      }
      pie={
        <footer className="caja__pie">
          <button
            type="button"
            className="barra__boton barra__icono"
            aria-label="Día anterior"
            title="Día anterior"
            onClick={() => setFecha(sumarDias(fecha, -1))}
          >
            <IconoAnterior />
          </button>
          <button
            type="button"
            className="barra__boton barra__icono"
            aria-label="Día siguiente"
            title={esHoy ? 'Hoy: no hay días posteriores' : 'Día siguiente'}
            disabled={esHoy}
            onClick={() => setFecha(sumarDias(fecha, 1))}
          >
            <IconoSiguiente />
          </button>
        </footer>
      }
    />
  );
}

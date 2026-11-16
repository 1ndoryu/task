/* Dónde está mirando la caja «Diario»: qué día y qué capítulo.
 *
 * Vive aquí y no en `usarNotas` porque es estado de la vista, no un dato: el
 * texto guardado sí pasa por `acceso`. Y va en un hook porque trae su propia
 * regla: si el día cambia con la caja abierta, la vista pasa al día nuevo. Sin
 * eso se quedaba en el de ayer y no dejaba escribir en el de hoy hasta recargar. */
import { useState } from 'react';
import { sumarDias } from '../logica/fechas';

export interface PosicionDiario {
  fecha: string;
  capitulo: number;
  /** Va a un día concreto, siempre por su primer capítulo. */
  irA: (fecha: string) => void;
  /** Se mueve `dias` días (negativo, atrás). */
  mover: (dias: number) => void;
  /** Cambia de capítulo dentro del día visible. */
  ponerCapitulo: (capitulo: number) => void;
}

export function usarPosicionDiario(hoy: string): PosicionDiario {
  const [fecha, setFecha] = useState(hoy);
  const [capitulo, setCapitulo] = useState(1);
  // El día anterior se guarda para saber si el cambio vino de fuera (el reloj
  // cruzó el fin de día), no de un clic en las flechas.
  const [diaAnterior, setDiaAnterior] = useState(hoy);
  if (diaAnterior !== hoy) {
    setDiaAnterior(hoy);
    if (fecha === diaAnterior) {
      setFecha(hoy);
      setCapitulo(1);
    }
  }
  const irA = (dia: string) => {
    setFecha(dia);
    setCapitulo(1);
  };
  return { fecha, capitulo, irA, mover: (dias) => irA(sumarDias(fecha, dias)), ponerCapitulo: setCapitulo };
}

/* Reloj de la vista: despierta justo al cruzar un borde del día.
 *
 * «Hoy» y el momento del orden inteligente los calcula `logica/` con la hora
 * del sistema, pero solo cuando algo vuelve a pintar. Sin este reloj, la fecha
 * y el momento se quedaban con los de cuando se abrió la app hasta recargar.
 * Se arma un solo temporizador hasta el próximo borde —fin de día y principio
 * de cada momento—, no un intervalo: no despierta la vista cada minuto. */
import { useEffect, useState } from 'react';
import type { Algoritmo } from '../logica/algoritmo';
import { msHastaLaHora } from '../logica/fechas';

/** La hora actual, refrescada al cruzar el fin de día o el principio de un momento. */
export function usarReloj(finDia: number, algoritmo: Algoritmo): Date {
  const [ahora, setAhora] = useState(() => new Date());
  // Los bordes se leen por valor: el objeto de ajustes cambia de identidad en
  // cada render y no debe rearmar el temporizador por eso.
  const { horaTemprano, horaTarde, horaNoche } = algoritmo;
  useEffect(() => {
    const bordes = [finDia, horaTemprano, horaTarde, horaNoche];
    // Un segundo de margen: despertar en el borde exacto puede caer del lado
    // viejo por un redondeo y dejar el día sin cambiar hasta el siguiente.
    const espera = Math.min(...bordes.map((hora) => msHastaLaHora(hora, ahora))) + 1000;
    const reloj = window.setTimeout(() => setAhora(new Date()), espera);
    // Con el equipo suspendido el temporizador llega tarde o no llega: al
    // volver a la ventana se relee la hora, que es lo que se ve.
    const alVolver = () => {
      if (document.visibilityState === 'visible') setAhora(new Date());
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.clearTimeout(reloj);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [finDia, horaTemprano, horaTarde, horaNoche, ahora]);
  return ahora;
}

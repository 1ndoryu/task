/* El reloj de la fila que se está midiendo: una nota más junto al nombre, al
 * día cada segundo. Componente propio para que el latido no repinte la fila ni
 * la lista: solo se vuelve a pintar este texto. */
import { formatearTiempo } from '../logica/cronometro';
import { usarCronometroDeVista, usarTiempoCronometro } from './usarCronometro';

export function RelojFila() {
  const control = usarCronometroDeVista();
  const sesion = control?.sesion ?? null;
  const tiempo = usarTiempoCronometro(sesion, control?.pausado ?? false);
  const texto = formatearTiempo(tiempo);
  return (
    <span className="fila__nota fila__reloj" aria-label={`Midiendo: ${texto}`}>
      {texto}
    </span>
  );
}

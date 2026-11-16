/* La pastilla del cronómetro: qué se está midiendo, cuánto lleva y los tres
 * botones del legacy (pausar, completar, cancelar). Va fija abajo.
 *
 * El reloj se ajusta arrastrando, como en el legacy: cada 3 px son un segundo
 * a favor (derecha) o en contra (izquierda). Es la forma de corregir una sesión
 * que se quedó corriendo sin que nadie estuviera delante. */
import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { formatearTiempo } from '../logica/cronometro';
import { IconoCerrar, IconoCronometro, IconoHecho, IconoPausa, IconoPlay } from './Iconos';
import { usarCronometroDeVista, usarTiempoCronometro } from './usarCronometro';

/** Píxeles por segundo al arrastrar el reloj. */
const PX_POR_SEGUNDO = 3;

export function PastillaCronometro() {
  const control = usarCronometroDeVista();
  const sesion = control?.sesion ?? null;
  const pausado = control?.pausado ?? false;
  // Su propio latido: el de la vista no cambia cada segundo.
  const tiempo = usarTiempoCronometro(sesion, pausado);
  const arrastre = useRef({ x: 0, segundos: 0 });

  // Hooks antes de la salida: la sesión puede llegar o irse entre renders.
  if (!control || !sesion) return null;
  const objetivoMs = sesion.objetivoMin * 60_000;
  const alcanzado = objetivoMs > 0 && tiempo >= objetivoMs;
  const progreso = objetivoMs > 0 ? Math.min(100, (tiempo / objetivoMs) * 100) : 0;
  const texto = objetivoMs > 0 ? `${formatearTiempo(tiempo)}/${formatearTiempo(objetivoMs)}` : formatearTiempo(tiempo);

  const alBajar = (evento: PointerEvent<HTMLButtonElement>) => {
    arrastre.current = { x: evento.clientX, segundos: 0 };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  };

  const alMover = (evento: PointerEvent<HTMLButtonElement>) => {
    if (!evento.currentTarget.hasPointerCapture(evento.pointerId)) return;
    // Se aplica por tramos cerrados: el reloj no da mil saltos por píxel.
    const segundos = Math.trunc((evento.clientX - arrastre.current.x) / PX_POR_SEGUNDO);
    if (segundos === arrastre.current.segundos) return;
    control.ajustar((segundos - arrastre.current.segundos) * 1000);
    arrastre.current.segundos = segundos;
  };

  return (
    <div
      className={`cronometro${pausado ? ' cronometro--pausado' : ''}`}
      role="group"
      aria-label={`Cronómetro de ${sesion.nombre}`}
    >
      {progreso > 0 && (
        <div className="cronometro__progreso" aria-hidden="true">
          <span className="cronometro__relleno" style={{ '--avance': `${progreso}%` } as CSSProperties} />
        </div>
      )}
      <div className="cronometro__fila">
        <span className="cronometro__nombre" title={sesion.nombre}>
          <IconoCronometro tam={11} />
          <span className="cronometro__texto">{sesion.nombre}</span>
        </span>
        <button
          type="button"
          className="cronometro__reloj"
          data-alcanzado={alcanzado}
          title="Arrastra a la derecha para sumar tiempo y a la izquierda para restar"
          aria-label={`Tiempo: ${texto}. Arrastra para ajustarlo`}
          onPointerDown={alBajar}
          onPointerMove={alMover}
        >
          {texto}
        </button>
        {/* Las acciones van al final: el nombre y el reloj mandan, y los
            botones se buscan a la derecha, donde acaba la lectura. */}
        <span className="cronometro__acciones">
          {pausado ? (
            <button type="button" className="cronometro__boton" title="Reanudar" aria-label="Reanudar el cronómetro" onClick={control.reanudar}>
              <IconoPlay tam={11} />
            </button>
          ) : (
            <button type="button" className="cronometro__boton" title="Pausar" aria-label="Pausar el cronómetro" onClick={control.pausar}>
              <IconoPausa tam={11} />
            </button>
          )}
          <button
            type="button"
            className="cronometro__boton cronometro__boton--hecho"
            title="Completar"
            aria-label={`Completar ${sesion.nombre} y cerrar el cronómetro`}
            onClick={control.completar}
          >
            <IconoHecho tam={11} />
          </button>
          <button
            type="button"
            className="cronometro__boton"
            title="Cancelar"
            aria-label="Cancelar el cronómetro sin completar la fila"
            onClick={control.cancelar}
          >
            <IconoCerrar tam={10} />
          </button>
        </span>
      </div>
    </div>
  );
}

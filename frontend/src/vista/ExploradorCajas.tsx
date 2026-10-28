/* Explorador de cajas: un panel centrado, sin fondo que bloquee, que lista todas
 * las cajas con su icono y su nombre. Pulsar una la enciende o la apaga; la
 * apagada se ve con el icono atenuado. Se cierra con Escape o al pulsar fuera. */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { alternarCaja, cajaActiva } from '../logica/cajasActivas';
import type { Panel } from '../logica/paneles';
import type { Preferencias } from '../logica/preferencias';
import { IconoCajas } from './Iconos';
import { iconoDePanel } from './Paneles';
import { usarCierreFuera } from './usarCierreFuera';

interface Props {
  todos: Panel[];
  preferencias: Preferencias;
  onCambiar: (cambios: Partial<Preferencias>) => void;
}

export function ExploradorCajas({ todos, preferencias, onCambiar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Fuera del conjunto botón + panel, o Escape, lo cierran. El panel va a `body`
  // (portal): la barra del carril lleva `transform` y haría de ancla del `fixed`.
  usarCierreFuera({ activo: abierto, dentro: [raiz, panel], alFuera: () => setAbierto(false) });

  return (
    <div ref={raiz} className="explorador">
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label="Explorar las cajas"
        title="Cajas"
        onClick={() => setAbierto(!abierto)}
      >
        <IconoCajas tam={13} />
      </button>
      {abierto &&
        createPortal(
        <div ref={panel} className="menu__panel explorador__panel" role="dialog" aria-label="Cajas">
          <p className="explorador__titulo">Cajas</p>
          <ul className="explorador__lista">
            {todos.map((panel) => {
              const activa = cajaActiva(panel, preferencias);
              return (
                <li key={panel.id}>
                  <button
                    type="button"
                    className={`explorador__caja${activa ? '' : ' explorador__caja--apagada'}`}
                    aria-pressed={activa}
                    title={activa ? 'Apagar esta caja' : 'Encender esta caja'}
                    onClick={() => {
                      const cambio = alternarCaja(panel, todos, preferencias);
                      if (cambio) onCambiar(cambio);
                    }}
                  >
                    <span className="explorador__icono">{iconoDePanel(panel)}</span>
                    <span className="explorador__nombre">{panel.etiqueta}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}

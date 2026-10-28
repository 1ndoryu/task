/* Explorador de cajas: un panel centrado, sin fondo que bloquee, que lista todas
 * las cajas con su icono y su nombre. Pulsar una la enciende o la apaga; la
 * apagada se ve con el icono atenuado. Se cierra con Escape o al pulsar fuera.
 * El cristal es el mismo que el de la barra (`vidrio`): un solo juego de parámetros. */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { alternarCaja, cajaActiva } from '../logica/cajasActivas';
import type { Panel } from '../logica/paneles';
import type { Preferencias } from '../logica/preferencias';
import type { Vidrio } from './ConfigVidrio';
import { Cristal } from './Cristal';
import { IconoCajas } from './Iconos';
import { iconoDePanel } from './Paneles';
import { usarCierreFuera } from './usarCierreFuera';

/* Radio del menú de siempre, en px: 0.6rem de --redondoMenu (listas.css). */
const RADIO_MENU = 9.6;

interface Props {
  todos: Panel[];
  preferencias: Preferencias;
  onCambiar: (cambios: Partial<Preferencias>) => void;
  vidrio: Vidrio;
}

export function ExploradorCajas({ todos, preferencias, onCambiar, vidrio }: Props) {
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
          // El contenedor es la referencia para el cierre: las capas del cristal son
          // hermanas de la raíz, así que cuentan como dentro al pulsarlas.
          <div ref={panel} className="explorador__capas">
            {/* Padding y radio propios: el padding de la barra es de pastilla, y el radio
             * es el del menú de siempre (--redondoMenu, 0.6rem), no el de la pastilla. */}
            <Cristal className="explorador__panel" vidrio={vidrio} ajustes={{ cornerRadius: RADIO_MENU, padding: '0.3rem' }}>
              <div role="dialog" aria-label="Cajas">
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
              </div>
            </Cristal>
          </div>,
          document.body,
        )}
    </div>
  );
}

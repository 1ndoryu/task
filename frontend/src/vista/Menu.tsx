/* Menú flotante: botón que abre una lista de opciones y se cierra al elegir,
 * al pulsar fuera o con Escape. Sin portal: el contenedor tiene su propio
 * recorte de scroll y el menú se coloca pegado al botón.
 * Una opción con `hijos` no elige nada: abre un segundo panel al lado, como el
 * menú del front original, para que las categorías no alarguen la lista.
 * La posición se escribe en el nodo (no con `style={{}}`) porque depende de
 * medidas en vivo: dónde acaba el panel y cuánto mide la ventana. */
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export interface OpcionMenu {
  id: string;
  etiqueta: string;
  /* Marca la opción vigente: fondo, marca a la derecha y `aria-checked`. */
  activo?: boolean;
  /* Muestra de color delante del texto: el nivel de importancia, que se
   * reconoce mejor por su círculo que por su nombre. */
  color?: string;
  /* Trazo opcional delante del texto (iconos del alta rápida). */
  icono?: ReactNode;
  peligro?: boolean;
  /* Título de grupo: separa las opciones por bloques. */
  grupo?: string;
  /* Una opción que solo actúa (borrar, editar) no es una elección marcada. */
  accion?: boolean;
  /* Submenú: la opción abre este panel al lado en vez de elegir su id. */
  hijos?: OpcionMenu[];
}

interface Props {
  /** Contenido del botón; `null` deja el menú sin disparador (solo clic derecho). */
  etiqueta: ReactNode;
  items: OpcionMenu[];
  onElegir: (id: string) => void;
  /** Texto accesible cuando la etiqueta visible es un icono. */
  titulo?: string;
  claseBoton?: string;
  /** Abierto desde fuera (clic derecho en la fila); si falta, manda el botón. */
  abierto?: boolean;
  onAbierto?: (abierto: boolean) => void;
  /** Punto de la pantalla donde abrirlo (el clic derecho); sin él, va al botón. */
  enPunto?: { x: number; y: number } | null;
}

/** Margen mínimo con el borde de la ventana. */
const MARGEN = 8;

/** El adorno de una opción, lo mismo en el panel que en el disparador del
 * submenú: círculo de nivel, icono y texto que ocupa el hueco. */
function Adorno({ item }: { item: OpcionMenu }) {
  return (
    <>
      {/* Columna de ancho fijo: aunque la opción no lleve nada, el texto cae
          en la misma vertical que sus vecinas. */}
      <span className="menu__adorno">
        {item.color ? (
          <span className="menu__muestra" style={{ '--color-nivel': item.color } as CSSProperties} />
        ) : (
          item.icono
        )}
      </span>
      <span className="menu__texto">{item.etiqueta}</span>
    </>
  );
}

/** Los ítems de un submenú, ya desplegados. */
function Items({
  items,
  onElegir,
  cerrar,
}: {
  items: OpcionMenu[];
  onElegir: (id: string) => void;
  cerrar: () => void;
}) {
  return (
    <>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role={item.accion ? 'menuitem' : 'menuitemradio'}
          aria-checked={item.accion ? undefined : Boolean(item.activo)}
          className={`menu__item${item.activo ? ' menu__item--activo' : ''}${
            item.peligro ? ' menu__item--peligro' : ''
          }`}
          onClick={() => {
            onElegir(item.id);
            cerrar();
          }}
        >
          <Adorno item={item} />
        </button>
      ))}
    </>
  );
}

export function Menu({ etiqueta, items, onElegir, titulo, claseBoton, abierto, onAbierto, enPunto }: Props) {
  const [abiertoLocal, setAbiertoLocal] = useState(false);
  const abiertoAhora = abierto ?? abiertoLocal;
  const poner = (valor: boolean) => {
    if (onAbierto) onAbierto(valor);
    else setAbiertoLocal(valor);
  };
  const [sub, setSub] = useState<string | null>(null);
  /* [por que] Al pasar del ítem al submenú el puntero cruza su borde y, durante
   * un instante, cae en la fila de detrás (con privacidad, además desenfocada).
   * Si eso cerrara el submenú, al volver el ratón lo reabriría: un parpadeo.
   * Con una espera corta, el hueco entre ambos no lo cierra. */
  const cierreSub = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aplazarCierre = (id: string) => {
    if (cierreSub.current) clearTimeout(cierreSub.current);
    cierreSub.current = setTimeout(() => setSub((previo) => (previo === id ? null : previo)), 250);
  };
  const cancelarCierre = () => {
    if (cierreSub.current) clearTimeout(cierreSub.current);
    cierreSub.current = null;
  };
  // Al desmontar no queda un temporizador vivo.
  useEffect(() => cancelarCierre, []);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const panel = useRef<HTMLDivElement | null>(null);
  const panelSub = useRef<HTMLDivElement | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const idPanel = useId();

  useEffect(() => {
    if (!abiertoAhora) setSub(null);
  }, [abiertoAhora]);

  useEffect(() => {
    if (!abiertoAhora) return;
    const cerrar = (evento: Event) => {
      if (!contenedor.current?.contains(evento.target as Node)) poner(false);
    };
    const conEscape = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      // Escape cierra primero el submenú; el segundo, el menú entero.
      if (sub) setSub(null);
      else poner(false);
    };
    document.addEventListener('pointerdown', cerrar);
    document.addEventListener('keydown', conEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrar);
      document.removeEventListener('keydown', conEscape);
    };
  }, [abiertoAhora, sub, onAbierto]);

  /** Coloca el panel principal: en el punto del clic derecho o bajo el botón. */
  const colocarPanel = () => {
    const nodo = panel.current;
    if (!nodo || !enPunto) return;
    const { width, height } = nodo.getBoundingClientRect();
    nodo.style.top = `${Math.max(MARGEN, Math.min(enPunto.y, window.innerHeight - height - MARGEN))}px`;
    nodo.style.left = `${Math.max(MARGEN, Math.min(enPunto.x, window.innerWidth - width - MARGEN))}px`;
  };

  /** Coloca el submenú al lado del panel entero, alineado con su ítem. */
  const colocarSub = () => {
    const nodo = panelSub.current;
    const item = sub ? itemRefs.current.get(sub) : undefined;
    if (!nodo || !item) return;
    const padre = panel.current?.getBoundingClientRect();
    const ancla = item.getBoundingClientRect();
    const { width, height } = nodo.getBoundingClientRect();
    const derecha = (padre?.right ?? ancla.right) + 1;
    const cabeDerecha = derecha + width <= window.innerWidth - MARGEN;
    nodo.style.top = `${Math.max(MARGEN, Math.min(ancla.top - 2, window.innerHeight - height - MARGEN))}px`;
    // Si no cabe a la derecha, se pega al otro lado del panel entero.
    nodo.style.left = `${
      cabeDerecha ? derecha : Math.max(MARGEN, (padre?.left ?? ancla.left) - width - 1)
    }px`;
  };

  useEffect(() => {
    colocarSub();
    window.addEventListener('resize', colocarSub);
    window.addEventListener('scroll', colocarSub, true);
    return () => {
      window.removeEventListener('resize', colocarSub);
      window.removeEventListener('scroll', colocarSub, true);
    };
  }, [sub]);

  return (
    <div className={`menu${etiqueta === null ? ' menu--punto' : ''}`} ref={contenedor}>
      {etiqueta !== null && (
        <button
          type="button"
          className={claseBoton ?? 'menu__boton'}
          aria-haspopup="menu"
          aria-expanded={abiertoAhora}
          aria-controls={abiertoAhora ? idPanel : undefined}
          aria-label={titulo}
          title={titulo}
          onClick={() => poner(!abiertoAhora)}
        >
          {etiqueta}
        </button>
      )}
      {abiertoAhora && (
        <div
          className={`menu__panel${enPunto ? ' menu__panel--punto' : ''}`}
          role="menu"
          id={idPanel}
          ref={(nodo) => {
            panel.current = nodo;
            colocarPanel();
          }}
        >
          {items.map((item, indice) => {
            const separa = item.grupo && item.grupo !== items[indice - 1]?.grupo;
            if (!item.hijos) {
              return (
                <div key={item.id}>
                  {separa && <p className="menu__grupo">{item.grupo}</p>}
                  <Items items={[item]} onElegir={onElegir} cerrar={() => poner(false)} />
                </div>
              );
            }
            const desplegado = sub === item.id;
            return (
              <div
                key={item.id}
                className="menu__fila"
                // Ratón fuera del bloque: el submenú se recoge, con la espera
                // que perdona el salto entre el ítem y el panel de al lado.
                onPointerLeave={() => aplazarCierre(item.id)}
                onPointerEnter={cancelarCierre}
              >
                {separa && <p className="menu__grupo">{item.grupo}</p>}
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={desplegado}
                  className={`menu__item${desplegado ? ' menu__item--abierto' : ''}`}
                  ref={(nodo) => {
                    if (nodo) itemRefs.current.set(item.id, nodo);
                    else itemRefs.current.delete(item.id);
                  }}
                  onClick={() => setSub(desplegado ? null : item.id)}
                  // Abrir al pasar el ratón es lo que hace fluido el recorrido.
                  onPointerEnter={() => setSub(item.id)}
                >
                  <Adorno item={item} />
                  <span className="menu__flecha" aria-hidden="true" />
                </button>
                {desplegado && (
                  <div
                    className="menu__panel menu__subpanel"
                    role="menu"
                    aria-label={item.etiqueta}
                    // El panel de al lado también sostiene la espera: pasar
                    // de la flecha al submenú no debe cerrarlo.
                    onPointerEnter={cancelarCierre}
                    ref={(nodo) => {
                      panelSub.current = nodo;
                      colocarSub();
                    }}
                  >
                    <Items items={item.hijos} onElegir={onElegir} cerrar={() => poner(false)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

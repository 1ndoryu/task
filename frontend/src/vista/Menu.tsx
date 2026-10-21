/* Menú flotante: botón que abre una lista de opciones y se cierra al elegir,
 * al pulsar fuera o con Escape. Sin portal: el contenedor tiene su propio
 * recorte de scroll y el menú se coloca pegado al botón. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface OpcionMenu {
  id: string;
  etiqueta: string;
  /* Marca la opción vigente: se pinta con un punto y `aria-checked`. */
  activo?: boolean;
  peligro?: boolean;
  /* Título de grupo: separa las opciones por bloques sin anidar menús. */
  grupo?: string;
}

interface Props {
  etiqueta: ReactNode;
  items: OpcionMenu[];
  onElegir: (id: string) => void;
  /** Texto accesible cuando la etiqueta visible es un icono. */
  titulo?: string;
  claseBoton?: string;
}

export function Menu({ etiqueta, items, onElegir, titulo, claseBoton }: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const idPanel = useId();

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (evento: Event) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const conEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('pointerdown', cerrar);
    document.addEventListener('keydown', conEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrar);
      document.removeEventListener('keydown', conEscape);
    };
  }, [abierto]);

  return (
    <div className="menu" ref={contenedor}>
      <button
        type="button"
        className={claseBoton ?? 'menu__boton'}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        aria-label={titulo}
        title={titulo}
        onClick={() => setAbierto((previo) => !previo)}
      >
        {etiqueta}
      </button>
      {abierto && (
        <div className="menu__panel" role="menu" id={idPanel}>
          {items.map((item, indice) => (
            <div key={item.id}>
              {item.grupo && item.grupo !== items[indice - 1]?.grupo && (
                <p className="menu__grupo">{item.grupo}</p>
              )}
              <button
                type="button"
                role="menuitemradio"
                aria-checked={Boolean(item.activo)}
                className={`menu__item${item.activo ? ' menu__item--activo' : ''}${
                  item.peligro ? ' menu__item--peligro' : ''
                }`}
                onClick={() => {
                  setAbierto(false);
                  onElegir(item.id);
                }}
              >
                {item.etiqueta}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

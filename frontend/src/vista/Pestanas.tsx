/* Pestañas de un solo nivel: fila de opciones excluyentes. La receta visual
 * vive en `estilos/pestanas.css`; aquí solo el comportamiento accesible y el
 * arrastre para reordenar los paneles (grupos, notas y los de sistema). Todos
 * se arrastran: ser de sistema solo quita renombrar y borrar.
 *
 * Cada pestaña es un `div` con `role="tab"`, no un `button`: dentro va el
 * contenido que ponga quien llama, y un título editable es un campo, que no
 * puede anidarse en un botón. Seleccionar es un clic (o Enter/Espacio), y el
 * teclado se mueve con las flechas como un tablist de verdad. */
import { useState, useId, type ReactNode } from 'react';
import { Menu } from './Menu';
import { opcionesPanel } from './menuPanel';
import type { Panel } from '../logica/paneles';

interface Props<T extends string> {
  /** Texto accesible del grupo. */
  titulo: string;
  valor: T;
  opciones: { id: T; etiqueta: ReactNode }[];
  onElegir: (id: T) => void;
  /** Si se pasa, los paneles se pueden arrastrar para reordenarlos. */
  onMover?: (movida: string, hasta: string) => void;
  /** Una pestaña fija no se arrastra ni sirve de destino (hoy, ninguna). */
  esFija?: (id: T) => boolean;
  /** Clases extra por pestaña (por ejemplo, el tipo de panel). */
  claseDe?: (id: T) => string | undefined;
  clase?: string;
  /** «Costado»: la columna a la izquierda de la caja, con el texto a la
   *  derecha. La receta visual la pone `pestanas.css`; el teclado cambia con
   *  ella, porque en columna se navega con las flechas de arriba y abajo. */
  orientacion?: 'fila' | 'costado';
  /** Panel de cada pestaña, para el menú contextual del clic derecho. */
  panelDe?: (id: T) => Panel | undefined;
  /** Acción pedida desde ese menú. */
  onAccion?: (id: T, accion: string) => void;
}

export function Pestanas<T extends string>({
  titulo,
  valor,
  opciones,
  onElegir,
  onMover,
  esFija,
  claseDe,
  clase,
  orientacion = 'fila',
  panelDe,
  onAccion,
}: Props<T>) {
  const grupo = useId();
  // Pestaña que se está arrastrando y la que está debajo del cursor: la de
  // debajo se marca para que el destino se vea antes de soltar.
  const [arrastrada, setArrastrada] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  // Clic derecho: el menú del panel, en el punto pulsado. Solo uno a la vez.
  const [menu, setMenu] = useState<{ id: T; x: number; y: number } | null>(null);
  const panelMenu = menu ? panelDe?.(menu.id) : undefined;
  const fija = (id: T) => esFija?.(id) ?? false;
  /** Las acciones del panel de una pestaña; vacío en las de sistema. */
  const accionesDe = (id: T) => {
    const panel = panelDe?.(id);
    return panel ? opcionesPanel(panel) : [];
  };
  const arrastrable = (id: T) => Boolean(onMover) && !fija(id);

  return (
    <div
      className={`pestanas${orientacion === 'costado' ? ' pestanas--costado' : ''}${clase ? ` ${clase}` : ''}`}
      role="tablist"
      aria-label={titulo}
      aria-orientation={orientacion === 'costado' ? 'vertical' : undefined}
    >
      {opciones.map((opcion, indice) => (
        <div
          key={opcion.id}
          role="tab"
          id={`${grupo}-${indice}`}
          aria-selected={valor === opcion.id}
          tabIndex={valor === opcion.id ? 0 : -1}
          draggable={arrastrable(opcion.id)}
          className={[
            'pestana',
            claseDe?.(opcion.id),
            valor === opcion.id && 'pestana--activa',
            arrastrable(opcion.id) && 'pestana--arrastrable',
            arrastrada === opcion.id && 'pestana--arrastrada',
            destino === opcion.id && 'pestana--destino',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onElegir(opcion.id)}
          // Clic derecho: las acciones del panel. Los de sistema no tienen.
          onContextMenu={(evento) => {
            if (accionesDe(opcion.id).length === 0) return;
            evento.preventDefault();
            setMenu({ id: opcion.id, x: evento.clientX, y: evento.clientY });
          }}
          onDragStart={(evento) => {
            if (!arrastrable(opcion.id)) return;
            evento.dataTransfer.effectAllowed = 'move';
            // El texto es lo único que el navegador deja leer al soltar.
            evento.dataTransfer.setData('text/plain', opcion.id);
            setArrastrada(opcion.id);
          }}
          onDragOver={(evento) => {
            if (!arrastrada || fija(opcion.id) || arrastrada === opcion.id) return;
            evento.preventDefault();
            setDestino(opcion.id);
          }}
          onDragLeave={() => setDestino((previo) => (previo === opcion.id ? null : previo))}
          onDrop={(evento) => {
            evento.preventDefault();
            const movida = arrastrada ?? evento.dataTransfer.getData('text/plain');
            if (movida && !fija(opcion.id) && movida !== opcion.id) onMover?.(movida, opcion.id);
            setArrastrada(null);
            setDestino(null);
          }}
          onDragEnd={() => {
            setArrastrada(null);
            setDestino(null);
          }}
          // Flechas para moverse entre pestañas, como un tablist de verdad.
          // Enter y Espacio eligen: ya no es un botón nativo que lo haga solo.
          onKeyDown={(evento) => {
            if (evento.target !== evento.currentTarget) return;
            if (evento.key === 'Enter' || evento.key === ' ') {
              evento.preventDefault();
              onElegir(opcion.id);
              return;
            }
            // En columna las flechas de verdad son las verticales; en fila, las
            // horizontales. Las dos parejas se aceptan siempre: mover el cursor
            // nunca está de más, y el eje de la lista lo dice `aria-orientation`.
            const paso =
              evento.key === 'ArrowRight' || evento.key === 'ArrowDown' ? 1
              : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp' ? -1
              : 0;
            if (!paso) return;
            evento.preventDefault();
            const siguiente = opciones[(indice + paso + opciones.length) % opciones.length];
            onElegir(siguiente.id);
          }}
        >
          {opcion.etiqueta}
        </div>
      ))}
      {/* Sin disparador: el ancla es el punto del clic derecho. */}
      {menu && panelMenu && (
        <Menu
          etiqueta={null}
          titulo={`Acciones de «${panelMenu.etiqueta}»`}
          items={opcionesPanel(panelMenu)}
          abierto
          onAbierto={(abierto) => {
            if (!abierto) setMenu(null);
          }}
          enPunto={menu}
          onElegir={(accion) => {
            onAccion?.(menu.id, accion);
            setMenu(null);
          }}
        />
      )}
    </div>
  );
}

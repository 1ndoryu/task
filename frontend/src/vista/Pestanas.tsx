/* Pestañas de un solo nivel: fila de opciones excluyentes. La receta visual
 * vive en `estilos/pestanas.css`; aquí solo el comportamiento accesible y el
 * arrastre para reordenar los grupos. «Tareas» y «Completados» son fijas: no
 * se arrastran ni reciben, porque su sitio lo manda la vista. */
import { useState, useId, type ReactNode } from 'react';

interface Props<T extends string> {
  /** Texto accesible del grupo. */
  titulo: string;
  valor: T;
  opciones: { id: T; etiqueta: ReactNode }[];
  onElegir: (id: T) => void;
  /** Si se pasa, las pestañas de grupo se pueden arrastrar para reordenarlas. */
  onMover?: (movida: string, hasta: string) => void;
  /** Una pestaña fija no se arrastra ni sirve de destino. */
  esFija?: (id: T) => boolean;
  clase?: string;
}

export function Pestanas<T extends string>({
  titulo,
  valor,
  opciones,
  onElegir,
  onMover,
  esFija,
  clase,
}: Props<T>) {
  const grupo = useId();
  // Pestaña que se está arrastrando y la que está debajo del cursor: la de
  // debajo se marca para que el destino se vea antes de soltar.
  const [arrastrada, setArrastrada] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  const fija = (id: T) => esFija?.(id) ?? false;
  const arrastrable = (id: T) => Boolean(onMover) && !fija(id);

  return (
    <div className={`pestanas${clase ? ` ${clase}` : ''}`} role="tablist" aria-label={titulo}>
      {opciones.map((opcion, indice) => (
        <button
          key={opcion.id}
          type="button"
          role="tab"
          id={`${grupo}-${indice}`}
          aria-selected={valor === opcion.id}
          tabIndex={valor === opcion.id ? 0 : -1}
          draggable={arrastrable(opcion.id)}
          className={[
            'pestana',
            valor === opcion.id && 'pestana--activa',
            arrastrable(opcion.id) && 'pestana--arrastrable',
            arrastrada === opcion.id && 'pestana--arrastrada',
            destino === opcion.id && 'pestana--destino',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onElegir(opcion.id)}
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
          onKeyDown={(evento) => {
            const paso = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0;
            if (!paso) return;
            evento.preventDefault();
            const siguiente = opciones[(indice + paso + opciones.length) % opciones.length];
            onElegir(siguiente.id);
          }}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}

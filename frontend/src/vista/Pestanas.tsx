/* Pestañas de un solo nivel: fila de opciones excluyentes. La receta visual
 * vive en `estilos/pestanas.css`; aquí solo el comportamiento accesible. */
import { useId, type ReactNode } from 'react';

interface Props<T extends string> {
  /** Texto accesible del grupo. */
  titulo: string;
  valor: T;
  opciones: { id: T; etiqueta: ReactNode }[];
  onElegir: (id: T) => void;
  clase?: string;
}

export function Pestanas<T extends string>({ titulo, valor, opciones, onElegir, clase }: Props<T>) {
  const grupo = useId();
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
          className={`pestana${valor === opcion.id ? ' pestana--activa' : ''}`}
          onClick={() => onElegir(opcion.id)}
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

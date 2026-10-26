/* Piezas de los ajustes: un bloque de control con su título y su nota (`Campo`)
 * y la casilla que esconde una caja (`CajaVisible`). Se sacan del panel para
 * que `Ajustes.tsx` quede con las pestañas y no con los controles. */
import { useId, type ReactNode } from 'react';

/** Un ajuste: título, valores en fila y una nota opcional que explica el efecto. */
export function Campo<T extends string>({
  titulo,
  valor,
  opciones,
  onElegir,
  nota,
}: {
  titulo: string;
  valor: T;
  opciones: { id: T; etiqueta: string }[];
  onElegir: (id: T) => void;
  nota?: ReactNode;
}) {
  const idTitulo = useId();
  return (
    <div className="campo">
      <p className="campo__titulo" id={idTitulo}>
        {titulo}
      </p>
      <div className="opciones" role="radiogroup" aria-labelledby={idTitulo}>
        {opciones.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            role="radio"
            aria-checked={valor === opcion.id}
            className={`segmento${valor === opcion.id ? ' segmento--activo' : ''}`}
            onClick={() => onElegir(opcion.id)}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>
      {nota && <p className="campo__nota">{nota}</p>}
    </div>
  );
}

/** Una caja que se puede esconder: un interruptor con su nombre, su nota y sin
 *  nada más. Todas las de este tipo viven en un solo bloque, porque juntas se
 *  leen como lo que son —qué hay en pantalla— y sueltas alargaban la pestaña. */
export function CajaVisible({
  nombre,
  visible,
  nota,
  onCambiar,
}: {
  nombre: string;
  visible: boolean;
  nota: string;
  onCambiar: (visible: boolean) => void;
}) {
  return (
    <li className="casilla">
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        className={`casilla__interruptor${visible ? ' casilla__interruptor--activo' : ''}`}
        onClick={() => onCambiar(!visible)}
      >
        <span className="casilla__marca" aria-hidden="true" />
        <span className="casilla__nombre">{nombre}</span>
      </button>
      <p className="campo__nota">{nota}</p>
    </li>
  );
}

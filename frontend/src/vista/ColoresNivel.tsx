/* Color del punto de cada nivel de importancia, editable en los ajustes. La
 * paleta es una preferencia (vive en `localStorage`), así que se elige con el
 * selector de color nativo, que ya trae el modo accesible y el teclado. */
import type { NivelPrioridad } from '../logica/importancia';
import type { ColoresNivel as Paleta } from '../logica/preferencias';
import { ColorNivel } from './ColorNivel';
import { PRIORIDADES } from './opcionesFila';

interface Props {
  colores: Paleta;
  onCambiar: (nivel: string, color: string) => void;
  onRestablecer: () => void;
}

export function ColoresNivel({ colores, onCambiar, onRestablecer }: Props) {
  return (
    <div className="campo">
      <p className="campo__titulo">Color de cada importancia</p>
      <ul className="paleta">
        {PRIORIDADES.map((nivel) => (
          <li className="paleta__fila" key={nivel.id}>
            <label className="paleta__nombre" htmlFor={`color-${nivel.id}`}>
              <ColorNivel nivel={nivel.id} colores={colores} />
              {nivel.etiqueta}
            </label>
            <input
              id={`color-${nivel.id}`}
              className="paleta__color"
              type="color"
              value={colores[nivel.id as NivelPrioridad]}
              onChange={(evento) => onCambiar(nivel.id, evento.target.value)}
            />
          </li>
        ))}
      </ul>
      <button type="button" className="paleta__volver" onClick={onRestablecer}>
        Volver a la escala pastel
      </button>
      <p className="campo__nota">El color se ve en el punto que marca cada tarea y cada hábito.</p>
    </div>
  );
}

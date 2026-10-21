/* Una muestra con el color de un nivel de importancia. La usan el modal de
 * configuración (muestra cada opción con su color) y los ajustes (el selector
 * de la paleta), para que el color se elija viéndolo. */
import { nivelDe } from '../logica/importancia';
import type { ColoresNivel } from '../logica/preferencias';

interface Props {
  /** Nivel del que sale el color. Acepta las dos grafías del contrato. */
  nivel: string;
  colores: ColoresNivel;
}

export function ColorNivel({ nivel, colores }: Props) {
  return (
    <span className="muestra">
      <span className="muestra__punto" style={{ background: colores[nivelDe(nivel)] }} />
    </span>
  );
}

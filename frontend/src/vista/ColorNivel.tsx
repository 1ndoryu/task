/* Una muestra con el color de un nivel de importancia. La usan el modal de
 * configuración (muestra cada opción con su color) y los ajustes (el selector
 * de la paleta), para que el color se elija viéndolo. */
import type { CSSProperties } from 'react';
import { nivelDe } from '../logica/importancia';
import type { ColoresNivel } from '../logica/preferencias';

interface Props {
  /** Nivel del que sale el color. Acepta las dos grafías del contrato. */
  nivel: string;
  colores: ColoresNivel;
}

export function ColorNivel({ nivel, colores }: Props) {
  // El color es un dato de la usuaria, no diseño: va como variable CSS (la
  // única forma de estilo por elemento que el sistema admite) y la hoja lo usa.
  const id = nivelDe(nivel);
  // Las claves `--*` son la forma que el analizador acepta: una costumbre CSS,
  // no un estilo de diseño escrito a mano.
  const punto = { '--color-nivel': colores[id] } as CSSProperties;
  return (
    <span className="muestra">
      <span className="muestra__punto" style={punto} />
    </span>
  );
}

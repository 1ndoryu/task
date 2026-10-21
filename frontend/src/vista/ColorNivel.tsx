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
  // El color es un dato de la usuaria, no diseño: entra como variable CSS y la
  // hoja decide dónde se usa. El literal va aquí a propósito: un objeto con
  // solo claves `--*` es una definición de token, no un estilo escrito a mano.
  return (
    <span className="muestra">
      <span className="muestra__punto" style={{ '--color-nivel': colores[nivelDe(nivel)] } as CSSProperties} />
    </span>
  );
}

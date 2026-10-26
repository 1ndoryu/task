/* Las columnas del carril: cada una es una pieza del imán y apila las cajas
 * que lleva. Una caja sola es una columna de una; si las apiladas superan el
 * alto, la columna rueda por dentro con una barra invisible. */
import { Fragment, type ReactNode } from 'react';
import type { Columnas } from '../logica/columnas';
import type { Panel } from '../logica/paneles';

interface Props {
  columnas: Columnas;
  paneles: Panel[];
  /** Pinta una caja (su propia `section.caja`, que es lo que se arrastra). */
  contenido: (panel: Panel) => ReactNode;
}

export function ColumnasCarril({ columnas, paneles, contenido }: Props) {
  const porId = new Map(paneles.map((panel) => [panel.id, panel]));
  return (
    <>
      {columnas.map((ids) => (
        // La clave es la pertenencia, no el orden: reordenar columnas o cajas de
        // una pila conserva el elemento y el FLIP puede animarlo; solo apilar o
        // separar una caja rehace la columna.
        <div key={[...ids].sort().join('\u0001')} className="carril__columna" data-rueda-propia>
          {ids.map((id) => {
            const panel = porId.get(id);
            return panel ? <Fragment key={id}>{contenido(panel)}</Fragment> : null;
          })}
        </div>
      ))}
    </>
  );
}

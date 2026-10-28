/* Carcasa común de toda caja: el `section.caja` con su tamaño del usuario, su
 * estado de minimizada y su asa. Caja, CajaNota y Archivados la comparten, así
 * que redimensionar es una propiedad de la carcasa y no algo que cada caja
 * deba acordarse de cablear (Archivados no lo hacía y no tenía asa).
 *
 * Los modificadores de cada caja llegan como nombres literales en `clases`:
 * la hoja y el índice de clases casan el nombre escrito, no uno compuesto. */
import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { TamanoCaja } from '../logica/preferencias';
import { AsaTamano } from './AsaTamano';
import { altoUsuario, anchoUsuario } from './tamano';

interface Props {
  /** Clases de la caja (`caja` va siempre; el resto, los modificadores). */
  clases: (string | false | undefined)[];
  /** Variables propias de la caja (`--*`); las del tamaño las pone la carcasa. */
  estilo?: CSSProperties;
  etiqueta?: string;
  /** Id del elemento que nombra la caja, si no lleva `etiqueta`. */
  nombradaPor?: string;
  /** Con id, el carril la reconoce como pieza que se arrastra. */
  idPanel?: string;
  tamano?: TamanoCaja;
  /** Con esto la caja lleva asa de tamaño (salvo minimizada). */
  onTamano?: (tamano: TamanoCaja | undefined) => void;
  minimizada?: boolean;
  onContextMenu?: (evento: MouseEvent<HTMLElement>) => void;
  /** Cabecera y asa van primero; el resto, el cuerpo de cada caja. */
  cabecera: ReactNode;
  children: ReactNode;
}

export function CarcasaCaja({ clases, estilo, etiqueta, nombradaPor, idPanel, tamano, onTamano, minimizada, onContextMenu, cabecera, children }: Props) {
  const nodo = useRef<HTMLElement>(null);
  return (
    <section
      ref={nodo}
      className={['caja', ...clases, tamano?.crecido && 'caja--crecida', minimizada && 'caja--minimizada'].filter(Boolean).join(' ')}
      style={{ ...estilo, '--ancho-usuario': anchoUsuario(tamano), '--alto-caja-usuario': altoUsuario(tamano) } as CSSProperties}
      aria-label={etiqueta}
      aria-labelledby={nombradaPor}
      data-panel={idPanel}
      onContextMenu={onContextMenu}
    >
      {cabecera}
      {onTamano && !minimizada && <AsaTamano caja={nodo} onTamano={onTamano} />}
      {children}
    </section>
  );
}

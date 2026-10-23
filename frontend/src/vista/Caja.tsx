/* Una caja de la lista: cabecera, alta rápida y filas con scroll propio.
 * En modo normal hay una sola, con las pestañas en la cabecera; en modo cajas
 * hay una por grupo, cada una con su nombre arriba. El contenido de la
 * cabecera lo pone la vista: la caja solo sabe recortar y colocar. */
import type { CSSProperties, ReactNode } from 'react';
import type { ColoresNivel, Preferencias } from '../logica/preferencias';
import type { Fila as FilaDatos } from '../logica/seleccion';
import { Fila } from './Fila';
import type { AccionesFila } from './accionesFila';
import { claveFila, type Editando } from './usarLista';

interface Props {
  /** Texto accesible: qué grupo muestra esta caja. */
  etiqueta: string;
  /** Id del panel dueño de la caja, para que el arrastre sepa a quién mueve. */
  idPanel?: string;
  /** Ajustes de lectura: deciden los modificadores de la caja. */
  preferencias: Preferencias;
  cabecera: ReactNode;
  /** Alta rápida; `null` en la caja de completados, que es solo lectura. */
  alta: ReactNode;
  filas: FilaDatos[];
  /** Filas que están saliendo de la lista tras completarse. */
  saliendo: ReadonlySet<string>;
  completados: boolean;
  acciones: AccionesFila;
  grupos: string[];
  colores: ColoresNivel;
  hoy: string;
  /** Menú abierto con clic derecho, con la clave de su fila y el punto. */
  menuAbierto: { clave: string; x: number; y: number } | null;
  onMenuAbierto: (punto: { clave: string; x: number; y: number } | null) => void;
  /** Clic derecho fuera de las filas: el menú del panel, no el de una fila. */
  onContexto?: (punto: { x: number; y: number }) => void;
}

export function Caja({
  etiqueta,
  idPanel,
  preferencias,
  cabecera,
  alta,
  filas,
  saliendo,
  completados,
  acciones,
  grupos,
  colores,
  hoy,
  menuAbierto,
  onMenuAbierto,
  onContexto,
}: Props) {
  return (
    <section
      // Los modificadores se escriben enteros, junto al `className`: la hoja y
      // el índice de clases casan el nombre literal, no un valor compuesto en
      // otro archivo. «Normal» no lleva modificador: es como se pinta la caja.
      className={[
        'caja',
        preferencias.privacidad && 'caja--privacidad',
        preferencias.fuente === 'pequena' && 'caja--fuente-pequena',
        preferencias.fuente === 'grande' && 'caja--fuente-grande',
        preferencias.altura === 'compacta' && 'caja--altura-compacta',
        preferencias.altura === 'amplia' && 'caja--altura-amplia',
        !preferencias.separador && 'caja--sin-separador',
        preferencias.privacidadAlcance === 'todas' && 'caja--privacidad-todas',
      ]
        .filter(Boolean)
        .join(' ')}
      // La paleta de importancia entra como tokens: es un literal cuyas claves
      // son todas `--*`, así que el nodo solo define variables (el patrón de
      // `Menu`). Definida aquí y no en una variable aparte: así se lee como
      // definición de token.
      style={
        {
          '--nivel-muy_baja': colores.muy_baja,
          '--nivel-baja': colores.baja,
          '--nivel-media': colores.media,
          '--nivel-alta': colores.alta,
          '--nivel-muy_alta': colores.muy_alta,
        } as CSSProperties
      }
      aria-label={etiqueta}
      // El carril identifica la pieza por este atributo, sin saber su clase.
      data-panel={idPanel}
      // Las filas ya gastan el clic derecho en su propio menú; aquí solo llega
      // el que nace fuera de ellas (la cabecera, el aire de la caja).
      onContextMenu={(evento) => {
        if (!onContexto) return;
        if ((evento.target as HTMLElement).closest('.fila, [role="menu"], input')) return;
        evento.preventDefault();
        onContexto({ x: evento.clientX, y: evento.clientY });
      }}
    >
      {cabecera}

      {/* El alta va dentro del scroll: es la primera fila, no una franja fija;
          así sube con la lista y deja sitio a lo que se está leyendo. */}
      <div className="scroll">
        {alta}
        {filas.length === 0 ? (
          <p className="aviso aviso--vacio">{completados ? 'Nada completado.' : 'Nada pendiente.'}</p>
        ) : (
          <ul className={`lista${completados ? ' lista--completados' : ''}`}>
            {filas.map((fila) => {
              const valor: NonNullable<Editando> =
                fila.tipo === 'tarea' ? { tipo: 'tarea', tarea: fila.tarea } : { tipo: 'habito', habito: fila.habito };
              const clave = claveFila(valor);
              return (
                <Fila
                  key={clave}
                  fila={valor}
                  saliendo={saliendo.has(clave)}
                  acciones={acciones}
                  grupos={grupos}
                  colores={colores}
                  completados={completados}
                  hoy={hoy}
                  menuAbierto={menuAbierto?.clave === clave ? menuAbierto : null}
                  onMenuAbierto={(punto) => onMenuAbierto(punto ? { clave, ...punto } : null)}
                />
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

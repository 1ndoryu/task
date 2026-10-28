/* Una caja de la lista: cabecera, alta rápida y filas con scroll propio.
 * En modo normal hay una sola, con las pestañas en la cabecera; en modo cajas
 * hay una por grupo, cada una con su nombre arriba. El contenido de la
 * cabecera lo pone la vista: la caja solo sabe recortar y colocar. */
import { Fragment, useRef, type CSSProperties, type ReactNode } from 'react';
import type { ColoresNivel, Preferencias, TamanoCaja } from '../logica/preferencias';
import type { Fila as FilaDatos } from '../logica/seleccion';
import { CarcasaCaja } from './CarcasaCaja';
import { BarraMomento } from './BarraMomento';
import { Fila } from './Fila';
import type { AccionesFila } from './accionesFila';
import { claveFila, valorDe } from './usarLista';
import { usarArrastreFilas } from './usarArrastreFilas';
import { mover } from '../logica/reordenar';

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
  /** Filas con los hijos plegados, por clave `panel:fila`. */
  plegadas?: ReadonlySet<string>;
  onPlegar?: (clave: string) => void;
  /** Tamaño propio de la caja; sin él, el de fábrica. */
  tamano?: TamanoCaja;
  /** Con esto la caja lleva asa y se puede redimensionar. */
  onTamano?: (tamano: TamanoCaja | undefined) => void;
  /** Solo se ve la cabecera: el resto se oculta con CSS, sin desmontar nada. */
  minimizada?: boolean;
  /** Progreso del día (hábitos hechos de los que tocan): barra al pie de la caja. */
  progreso?: { hechos: number; total: number };
  /** Con esto las filas se arrastran para ordenarlas: solo en orden manual.
   *  Recibe las filas raíz ya en su orden nuevo. */
  onReordenar?: (filas: FilaDatos[]) => void;
}

/** Una fila suelta dentro de la lista, con su clave y su menú. Va aparte porque
 *  la lista la pinta dos veces: la raíz y sus hijos. */
function FilaEnCaja({
  datos,
  sub = false,
  saliendo,
  acciones,
  grupos,
  colores,
  completados,
  hoy,
  menuAbierto,
  onMenuAbierto,
  plegable = false,
  desplegada = true,
  onPlegar,
  primera = false,
}: {
  datos: FilaDatos;
  /** Indentada bajo su padre, sea subtarea o subhábito. */
  sub?: boolean;
  saliendo: ReadonlySet<string>;
  acciones: AccionesFila;
  grupos: string[];
  colores: ColoresNivel;
  completados: boolean;
  hoy: string;
  menuAbierto: { clave: string; x: number; y: number } | null;
  onMenuAbierto: (punto: { clave: string; x: number; y: number } | null) => void;
  plegable?: boolean;
  desplegada?: boolean;
  onPlegar?: () => void;
  /** Es la primera fila de la caja: con «siempre la primera» se lee sin velo. */
  primera?: boolean;
}) {
  const valor = valorDe(datos);
  const clave = claveFila(valor);
  return (
    <Fila
      fila={valor}
      sub={sub}
      saliendo={saliendo.has(clave)}
      acciones={acciones}
      grupos={grupos}
      colores={colores}
      completados={completados}
      hoy={hoy}
      menuAbierto={menuAbierto?.clave === clave ? menuAbierto : null}
      onMenuAbierto={(punto) => onMenuAbierto(punto ? { clave, ...punto } : null)}
      plegable={plegable}
      desplegada={desplegada}
      onPlegar={onPlegar}
      primera={primera}
    />
  );
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
  plegadas,
  onPlegar,
  tamano,
  onTamano,
  minimizada,
  progreso,
  onReordenar,
}: Props) {
  const listaRef = useRef<HTMLUListElement>(null);
  // La lista solo existe con filas: sin ellas no hay nada que enganchar.
  const ordenable = !!onReordenar && filas.length > 0;
  usarArrastreFilas(listaRef, ordenable, (desde, hasta) => onReordenar?.(mover(filas, desde, hasta)));
  return (
    <CarcasaCaja
      clases={[
        preferencias.privacidad && 'caja--privacidad',
        preferencias.altura === 'compacta' && 'caja--altura-compacta',
        preferencias.altura === 'amplia' && 'caja--altura-amplia',
        !preferencias.separador && 'caja--sin-separador',
        preferencias.privacidadAlcance === 'todas' && 'caja--privacidad-todas',
        preferencias.primeraVisible && 'caja--primera-visible',
      ]}
      // La paleta de importancia entra como tokens: es un literal cuyas claves
      // son todas `--*`, así que el nodo solo define variables (el patrón de
      // `Menu`). Definida aquí y no en una variable aparte: así se lee como
      // definición de token.
      estilo={{
        '--nivel-muy_baja': colores.muy_baja,
        '--nivel-baja': colores.baja,
        '--nivel-media': colores.media,
        '--nivel-alta': colores.alta,
        '--nivel-muy_alta': colores.muy_alta,
        // Las tallas llegan como número de píxeles; la hoja solo las usa.
        '--texto-fila': `${preferencias.fuente}px`,
      } as CSSProperties}
      etiqueta={etiqueta}
      // El carril identifica la pieza por este atributo, sin saber su clase.
      idPanel={idPanel}
      tamano={tamano}
      onTamano={onTamano}
      minimizada={minimizada}
      // Las filas ya gastan el clic derecho en su propio menú; aquí solo llega
      // el que nace fuera de ellas (la cabecera, el aire de la caja).
      onContextMenu={(evento) => {
        if (!onContexto) return;
        if ((evento.target as HTMLElement).closest('.fila, [role="menu"], input')) return;
        evento.preventDefault();
        onContexto({ x: evento.clientX, y: evento.clientY });
      }}
      cabecera={cabecera}
    >
      {/* El alta va dentro del scroll: es la primera fila, no una franja fija;
          así sube con la lista y deja sitio a lo que se está leyendo. */}
      {/* `data-rueda-propia`: la rueda llena esta lista antes de mover el carril. */}
      <div className="scroll" data-rueda-propia>
        {alta}
        {filas.length === 0 ? (
          <p className="aviso aviso--vacio">{completados ? 'Nada completado.' : 'Nada pendiente.'}</p>
        ) : (
          <ul ref={listaRef} className={`lista${completados ? ' lista--completados' : ''}${ordenable ? ' lista--ordenable' : ''}`}>
            {filas.map((fila, indice) => {
              const clave = claveFila(valorDe(fila));
              // La clave lleva el panel: plegar en una caja no pliega la misma
              // fila en otra. La primera fila se marca por índice, no por
              // `:first-child`, porque sus hijos son hermanos en el `<ul>`.
              const clavePlegado = `${idPanel ?? etiqueta}:${clave}`;
              const hijos = 'hijos' in fila ? (fila.hijos ?? []) : [];
              const desplegada = !plegadas?.has(clavePlegado);
              return (
                <Fragment key={clave}>
                  <FilaEnCaja
                    datos={fila}
                    primera={indice === 0}
                    {...{ saliendo, acciones, grupos, colores, completados, hoy, menuAbierto, onMenuAbierto }}
                    plegable={hijos.length > 0}
                    desplegada={desplegada}
                    onPlegar={onPlegar && (() => onPlegar(clavePlegado))}
                  />
                  {/* Una tarea con padre o un hábito con subhábitos cuelga sus
                      hijos debajo, indentados: es la forma del legacy, donde el
                      hijo no era una fila más de la lista. Plegado, se esconden
                      pero la flecha sigue ahí para volver a abrirlos. */}
                  {desplegada &&
                    hijos.map((hijo) => (
                      <FilaEnCaja
                        key={claveFila(valorDe(hijo))}
                        datos={hijo}
                        sub
                        primera={indice === 0}
                        {...{ saliendo, acciones, grupos, colores, completados, hoy, menuAbierto, onMenuAbierto }}
                      />
                    ))}
                </Fragment>
              );
            })}
          </ul>
        )}
      </div>
      {/* Fuera del scroll: la barra se queda al pie aunque la lista ruede. */}
      {progreso && progreso.total > 0 && <BarraMomento algoritmo={preferencias.algoritmo} />}
      {progreso && progreso.total > 0 && (
        <div
          className="progreso"
          role="progressbar"
          aria-label="Hábitos de hoy"
          aria-valuemin={0}
          aria-valuemax={progreso.total}
          aria-valuenow={progreso.hechos}
        >
          <div className="progreso__pista">
            <div className="progreso__relleno" style={{ '--progreso': `${(progreso.hechos / progreso.total) * 100}%` } as CSSProperties} />
          </div>
          <span className="progreso__cuenta">
            {progreso.hechos}/{progreso.total}
          </span>
        </div>
      )}
    </CarcasaCaja>
  );
}

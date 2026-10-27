/* Una fila de la lista, sea tarea o hábito: marca de completar, texto que abre
 * la configuración y racha. El menú de acciones se abre con el clic derecho en
 * la fila; no hay botón visible. Vive aparte de `Lista` para que cada archivo
 * tenga una sola responsabilidad. */
import { aplazadoHasta, fechaAplazo } from '../logica/aplazos';
import { diaCorto, proximaRepeticion, rachaDe, type ConFrecuencia } from '../logica/frecuencia';
import { nivelDeUrgencia } from '../logica/importancia';
import type { ColoresNivel } from '../logica/preferencias';
import { leerMomentos } from '../logica/momentos';
import { hechoHoy } from '../logica/seleccion';
import type { Habito } from '../logica/tipos';
import { IconoDesplegar, IconoPlegar } from './Iconos';
import { IconoMomento } from './IconosMomento';
import { Menu } from './Menu';
import { opcionesFila, prioridadDe, type AccionesFila } from './accionesFila';
import type { Editando } from './usarLista';

interface Props {
  fila: NonNullable<Editando>;
  /** Va colgada bajo su padre: se indenta y pierde el punto grande. */
  sub?: boolean;
  saliendo: boolean;
  acciones: AccionesFila;
  grupos: string[];
  /** La pestaña de completados: el menú no se abre, ahí no hay nada que hacer. */
  completados: boolean;
  /** Día de hoy: decide si un hábito está hecho y si sigue aplazado. */
  hoy: string;
  /** Paleta de la usuaria: el menú pinta el círculo de cada nivel. */
  colores: ColoresNivel;
  /** El menú abierto desde el clic derecho de esta fila, y dónde. */
  menuAbierto: { x: number; y: number } | null;
  onMenuAbierto: (punto: { x: number; y: number } | null) => void;
  /** Es la primera fila de la caja (o hija de ella): con «mostrar siempre la
   *  primera» se lee sin velo aunque haya privacidad. */
  primera?: boolean;
  /** Tiene hijos que se pueden plegar: se pinta la flecha de la derecha. */
  plegable?: boolean;
  /** Los hijos se ven; `false` los esconde `Caja`. */
  desplegada?: boolean;
  onPlegar?: () => void;
}

export function Fila({
  fila,
  sub = false,
  saliendo,
  acciones,
  grupos,
  colores,
  completados,
  hoy,
  menuAbierto,
  onMenuAbierto,
  primera = false,
  plegable = false,
  desplegada = true,
  onPlegar,
}: Props) {
  const esTarea = fila.tipo === 'tarea';
  const esSub = fila.tipo === 'subhabito';
  // El subhábito se lee como un hábito: mismo punto de nivel, misma racha.
  // Lo único propio es que su historial vive en el payload del padre.
  const habito: ConFrecuencia | null = fila.tipo === 'habito' ? fila.habito : esSub ? fila.subhabito : null;
  // El aplazo solo existe en el padre: el subhábito no trae `pospuestoHasta`.
  const conAplazo: Habito | null = fila.tipo === 'habito' ? fila.habito : null;
  // El punto de una tarea sigue a su urgencia (21AB-2); el de un hábito, a su importancia.
  const nivel = fila.tipo === 'tarea' ? nivelDeUrgencia(fila.tarea.urgencia) : prioridadDe(fila);
  // El momento configurado va como icono dentro del círculo; sin él, el círculo liso.
  const momentosGuardados = fila.tipo === 'tarea' ? fila.tarea.configuracion?.momentos : fila.tipo === 'habito' ? fila.habito.momentos : undefined;
  const [momento] = leerMomentos(momentosGuardados);
  const hecho = fila.tipo === 'tarea' ? fila.tarea.completado : habito !== null && hechoHoy(habito, hoy);
  const texto = fila.tipo === 'tarea' ? fila.tarea.texto : (habito?.nombre ?? '');
  // La racha se cuenta del historial: el `racha` del payload es del front viejo.
  const racha = habito !== null ? rachaDe(habito, hoy) : 0;
  // Lo ya hecho de un hábito no sale de la lista (solo se tacha), así que se
  // dice cuándo vuelve: sin eso, marcarlo parece no hacer nada. Un subhábito
  // no se aplaza por separado: hereda la vuelta de su padre, así que no dice nada.
  const vuelve = habito !== null && esSub === false && hecho ? proximaRepeticion(habito, hoy) : null;
  // Aplazado: lo que la fila dice en vez de «vuelve el …», que es lo mismo.
  const aplazado = conAplazo !== null ? aplazadoHasta(conAplazo, hoy) : null;

  return (
    <li
      className={[
        'fila',
        esTarea ? 'fila--tarea' : esSub ? 'fila--subhabito' : 'fila--habito',
        sub && 'fila--sub',
        primera && 'fila--primera',
        `fila--nivel-${nivel}`,
        hecho && 'fila--hecho',
        saliendo && 'fila--saliendo',
      ]
        .filter(Boolean)
        .join(' ')}
      // Clic derecho: el menú de acciones, en el punto pulsado.
      onContextMenu={(evento) => {
        evento.preventDefault();
        if (!completados) onMenuAbierto({ x: evento.clientX, y: evento.clientY });
      }}
    >
      <button
        type="button"
        className="fila__marca"
        // Atributo y no clase: la hoja quita el relleno y pinta el icono solo si hay momento.
        data-momento={momento}
        aria-label={`Completar ${texto}`}
        title="Completar"
        onClick={() => acciones.completar(fila)}
      >
        {momento && <IconoMomento momento={momento} />}
      </button>
      <button
        type="button"
        className="fila__texto"
        aria-label={`Configurar ${texto}`}
        title="Configurar"
        onClick={() => acciones.editar(fila)}
      >
        {texto}
      </button>
      {aplazado !== null ? (
        <span className="fila__nota">vuelve el {diaCorto(aplazado)}</span>
      ) : (
        vuelve !== null && vuelve !== hoy && <span className="fila__nota">vuelve el {diaCorto(vuelve)}</span>
      )}
      {racha > 1 && <span className="fila__nota">{racha} días</span>}
      {/* La flecha es del padre: dice cuántos hijos hay y los pliega. Va a la
          derecha, después de las notas, para no moverse con ellas. */}
      {plegable && (
        <button
          type="button"
          className="fila__plegar"
          aria-expanded={desplegada}
          aria-label={`${desplegada ? 'Ocultar' : 'Mostrar'} lo que cuelga de ${texto}`}
          title={desplegada ? 'Ocultar subtareas' : 'Mostrar subtareas'}
          onClick={() => onPlegar?.()}
        >
          {desplegada ? <IconoDesplegar /> : <IconoPlegar />}
        </button>
      )}
      {/* Sin disparador: el ancla es el punto del clic derecho. */}
      <Menu
        etiqueta={null}
        titulo={`Acciones de ${texto}`}
        items={opcionesFila(fila, grupos, colores, aplazado !== null)}
        abierto={menuAbierto !== null}
        onAbierto={(abierto) => {
          if (!abierto) onMenuAbierto(null);
        }}
        enPunto={menuAbierto}
        onElegir={(id) => {
          if (id === 'editar') acciones.editar(fila);
          else if (id === 'borrar') acciones.borrar(fila);
          else if (id === 'aplazar-quitar') acciones.aplazar(fila, null);
          else if (id.startsWith('aplazar-')) acciones.aplazar(fila, fechaAplazo(hoy, id.slice('aplazar-'.length)));
          else if (id === 'grupo-') acciones.mover(fila, null);
          else if (id.startsWith('grupo-')) acciones.mover(fila, id.slice('grupo-'.length));
          else acciones.prioridad(fila, id.replace('prioridad-', ''));
        }}
      />
    </li>
  );
}
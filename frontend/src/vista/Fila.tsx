/* Una fila de la lista, sea tarea o hábito: marca de completar, texto que abre
 * la configuración y racha. El menú de acciones se abre con el clic derecho en
 * la fila; no hay botón visible. Vive aparte de `Lista` para que cada archivo
 * tenga una sola responsabilidad. */
import { aplazadoHasta, fechaAplazo } from '../logica/aplazos';
import { diaCorto, proximaRepeticion, rachaDe } from '../logica/frecuencia';
import type { ColoresNivel } from '../logica/preferencias';
import { hechoHoy } from '../logica/seleccion';
import { Menu } from './Menu';
import { opcionesFila, prioridadDe, type AccionesFila } from './accionesFila';
import type { Editando } from './usarLista';

interface Props {
  fila: NonNullable<Editando>;
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
}

export function Fila({ fila, saliendo, acciones, grupos, colores, completados, hoy, menuAbierto, onMenuAbierto }: Props) {
  const esTarea = fila.tipo === 'tarea';
  const tarea = esTarea ? fila.tarea : null;
  const habito = esTarea ? null : fila.habito;
  // El punto de la fila lleva el color de su nivel: el mismo para tareas y
  // hábitos. La urgencia no se pinta aquí porque el color es uno solo y el
  // nivel es lo que se elige en la configuración.
  const nivel = prioridadDe(fila);
  const hecho = tarea ? tarea.completado : habito !== null && hechoHoy(habito, hoy);
  const texto = tarea ? tarea.texto : (habito?.nombre ?? '');
  // La racha se cuenta del historial: el `racha` del payload es del front viejo.
  const racha = habito !== null ? rachaDe(habito, hoy) : 0;
  // Lo ya hecho de un hábito no sale de la lista (solo se tacha), así que se
  // dice cuándo vuelve: sin eso, marcarlo parece no hacer nada.
  const vuelve = habito !== null && hecho ? proximaRepeticion(habito, hoy) : null;
  // Aplazado: lo que la fila dice en vez de «vuelve el …», que es lo mismo.
  const aplazado = habito !== null ? aplazadoHasta(habito, hoy) : null;

  return (
    <li
      className={[
        'fila',
        esTarea ? 'fila--tarea' : 'fila--habito',
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
        aria-label={`Completar ${texto}`}
        title="Completar"
        onClick={() => acciones.completar(fila)}
      />
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
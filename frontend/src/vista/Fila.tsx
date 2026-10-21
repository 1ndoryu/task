/* Una fila de la lista, sea tarea o hábito: marca de completar, texto que abre
 * la configuración y racha. El menú de acciones se abre con el clic derecho en
 * la fila; no hay botón visible. Vive aparte de `Lista` para que cada archivo
 * tenga una sola responsabilidad. */
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
  /** Día de hoy: decide si un hábito está hecho. */
  hoy: string;
  /** El menú abierto desde el clic derecho de esta fila, y dónde. */
  menuAbierto: { x: number; y: number } | null;
  onMenuAbierto: (punto: { x: number; y: number } | null) => void;
}

export function Fila({ fila, saliendo, acciones, grupos, completados, hoy, menuAbierto, onMenuAbierto }: Props) {
  const esTarea = fila.tipo === 'tarea';
  const tarea = esTarea ? fila.tarea : null;
  const habito = esTarea ? null : fila.habito;
  // El acento visual sale de la urgencia en la tarea y del nivel en el hábito
  // (que no tiene urgencia propia); el texto nunca lo repite.
  const acento = tarea
    ? tarea.urgencia === 'bloqueante' || tarea.urgencia === 'urgente'
    : prioridadDe(fila) === 'muy_alta';
  const hecho = tarea ? tarea.completado : habito !== null && hechoHoy(habito, hoy);
  const texto = tarea ? tarea.texto : (habito?.nombre ?? '');
  const racha = habito?.racha ?? 0;

  return (
    <li
      className={[
        'fila',
        esTarea ? 'fila--tarea' : 'fila--habito',
        acento && 'fila--urgente',
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
      {racha > 1 && <span className="fila__nota">{racha} días</span>}
      {/* Sin disparador: el ancla es el punto del clic derecho. */}
      <Menu
        etiqueta={null}
        titulo={`Acciones de ${texto}`}
        items={opcionesFila(fila, grupos)}
        abierto={menuAbierto !== null}
        onAbierto={(abierto) => {
          if (!abierto) onMenuAbierto(null);
        }}
        enPunto={menuAbierto}
        onElegir={(id) => {
          if (id === 'editar') acciones.editar(fila);
          else if (id === 'borrar') acciones.borrar(fila);
          else if (id === 'grupo-') acciones.mover(fila, null);
          else if (id.startsWith('grupo-')) acciones.mover(fila, id.slice('grupo-'.length));
          else acciones.prioridad(fila, id.replace('prioridad-', ''));
        }}
      />
    </li>
  );
}
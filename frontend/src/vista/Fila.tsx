/* Una fila de la lista, sea tarea o hábito: marca de completar, texto que abre
 * la configuración, racha y menú de acciones. Vive aparte de `Lista` para que
 * cada archivo tenga una sola responsabilidad. */
import { hechoHoy } from '../logica/seleccion';
import { IconoMenu } from './Iconos';
import { Menu } from './Menu';
import { opcionesFila, type AccionesFila } from './accionesFila';
import type { Editando } from './usarLista';

interface Props {
  fila: NonNullable<Editando>;
  saliendo: boolean;
  acciones: AccionesFila;
  grupos: string[];
  /** Día de hoy: decide si un hábito está hecho. */
  hoy: string;
  /** El menú abierto desde el clic derecho de esta fila, y dónde. */
  menuAbierto: { x: number; y: number } | null;
  onMenuAbierto: (punto: { x: number; y: number } | null) => void;
}

export function Fila({ fila, saliendo, acciones, grupos, hoy, menuAbierto, onMenuAbierto }: Props) {
  const esTarea = fila.tipo === 'tarea';
  const tarea = esTarea ? fila.tarea : null;
  const habito = esTarea ? null : fila.habito;
  // La urgencia se lee solo para el acento visual; el texto no la repite.
  const acento = tarea
    ? tarea.urgencia === 'bloqueante' || tarea.urgencia === 'urgente'
    : (habito?.importancia ?? '').toLowerCase() === 'bloqueante';
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
      // Clic derecho: el mismo menú del botón, en el punto pulsado.
      onContextMenu={(evento) => {
        evento.preventDefault();
        onMenuAbierto({ x: evento.clientX, y: evento.clientY });
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
      <Menu
        etiqueta={<IconoMenu />}
        titulo={`Acciones de ${texto}`}
        claseBoton="fila__opciones barra__icono"
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
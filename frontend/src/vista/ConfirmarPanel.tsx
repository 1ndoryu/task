/* Confirmación de lo que destruye en un panel. Dos preguntas distintas:
 * borrar una nota se lleva su texto; borrar un grupo obliga a decidir qué pasa
 * con sus filas. Archivar no pregunta: se deshace solo y no pierde nada. */
import { limpiarGrupo } from '../logica/orden';
import type { Panel } from '../logica/paneles';
import { Modal, type BotonModal } from './Modal';
import { seBorra } from './Paneles';

export interface Borrado {
  panel: Panel;
  /** Cuántas tareas y hábitos lleva el grupo; 0 en una nota. */
  filas: number;
}

interface Props {
  /** El panel que espera confirmación, o `null` si no hay nada que preguntar. */
  borrado: Borrado | null;
  onNota: () => void;
  /** Grupo: `true` se lleva sus tareas y hábitos, `false` los deja en «Tareas». */
  onGrupo: (conFilas: boolean) => void;
  onCerrar: () => void;
}

export function ConfirmarPanel({ borrado, onNota, onGrupo, onCerrar }: Props) {
  const esNota = !!borrado && seBorra(borrado.panel);
  const nombre = borrado ? (limpiarGrupo(borrado.panel.id) ?? borrado.panel.etiqueta) : '';
  const filas = borrado?.filas ?? 0;

  const botones: BotonModal[] = borrado
    ? esNota
      ? [
          { id: 'cancelar', etiqueta: 'Cancelar' },
          { id: 'borrar', etiqueta: 'Eliminar la nota', peligro: true, principal: true },
        ]
      : [
          { id: 'cancelar', etiqueta: 'Cancelar' },
          { id: 'conservar', etiqueta: 'Solo el grupo', principal: true },
          { id: 'filas', etiqueta: 'Grupo y tareas', peligro: true },
        ]
    : [];

  return (
    <Modal
      abierto={borrado !== null}
      titulo={borrado ? `Eliminar «${borrado.panel.etiqueta}»` : undefined}
      etiqueta="Eliminar"
      botones={botones}
      onElegir={(id) => {
        if (id === 'borrar') onNota();
        else if (id === 'conservar') onGrupo(false);
        else if (id === 'filas') onGrupo(true);
        onCerrar();
      }}
      onCerrar={onCerrar}
    >
      <p className="campo__nota">
        {esNota
          ? 'La nota y su texto se eliminan del todo. Si no lo tienes claro, archívala: deja de verse aquí y no se pierde.'
          : filas > 0
            ? `El grupo «${nombre}» tiene ${filas} ${filas === 1 ? 'elemento' : 'elementos'}. «Solo el grupo» los mueve a Tareas; «Grupo y tareas» los elimina también.`
            : 'El grupo está vacío: se borra el nombre y nada más.'}
      </p>
    </Modal>
  );
}

/* Lo que una fila ofrece en su menú contextual y las acciones que la vista le
 * pasa. Separa el «qué se puede hacer» del componente que lo pinta. */
import { APLAZOS } from '../logica/aplazos';
import { nivelDe, type NivelPrioridad } from '../logica/importancia';
import type { ColoresNivel } from '../logica/preferencias';
import { IconoCarpeta } from './Iconos';
import type { OpcionMenu } from './Menu';
import { aplazosMenu, gruposMenu, IconoAplazar, IconoBorrar, IconoEditar, prioridadesMenu } from './MenuOpciones';
import type { Editando } from './usarLista';

export interface AccionesFila {
  completar: (fila: NonNullable<Editando>) => void;
  editar: (fila: NonNullable<Editando>) => void;
  borrar: (fila: NonNullable<Editando>) => void;
  prioridad: (fila: NonNullable<Editando>, prioridad: string | null) => void;
  mover: (fila: NonNullable<Editando>, grupo: string | null) => void;
  /** Aplaza un hábito: `hasta` es la fecha de vuelta, `null` para quitarlo. */
  aplazar: (fila: NonNullable<Editando>, hasta: string | null) => void;
  /** Orden manual: las filas de una caja, ya en su orden nuevo. */
  reordenar: (filas: NonNullable<Editando>[]) => void;
}

/** Nivel de la fila en el id común: la tarea ya lo trae y la importancia del
 * hábito llega como texto (`Muy Alta`), así que se traduce aquí. El subhábito
 * hereda el nivel de su padre cuando no trae uno propio. */
export function prioridadDe(fila: NonNullable<Editando>): string {
  if (fila.tipo === 'tarea') return nivelDe(fila.tarea.prioridad);
  if (fila.tipo === 'habito') return nivelDe(fila.habito.importancia);
  return nivelDe(fila.subhabito.importancia ?? fila.padre.importancia);
}

/** Grupo de la fila: el subhábito no tiene, manda el de su padre. */
export function grupoDe(fila: NonNullable<Editando>): string | null {
  if (fila.tipo === 'tarea') return fila.tarea.grupoEjecucion ?? null;
  if (fila.tipo === 'habito') return fila.habito.grupoEjecucion ?? null;
  return fila.padre.grupoEjecucion ?? null;
}

/** Menú de una fila: lo justo para no salir de la lista. Vale para tarea y hábito.
 * Las categorías abren su propio panel al lado, como el menú del front original:
 * así la primera lista se queda en cinco entradas pase lo que pase.
 * Cada entrada lleva su icono; el disparador de importancia, además, el color
 * del nivel vigente, para no tener que abrirlo para saberlo. */
export function opcionesFila(
  fila: NonNullable<Editando>,
  grupos: string[],
  colores: ColoresNivel,
  /** Hay un aplazo vigente: el submenú ofrece quitarlo. */
  aplazado = false,
): OpcionMenu[] {
  const esTarea = fila.tipo === 'tarea';
  const nombre = esTarea ? 'la tarea' : 'el hábito';
  const actual = prioridadDe(fila);
  // El subhábito no tiene formulario propio: su nombre y su frecuencia se
  // editan en el modal del padre, así que aquí no hay «Configurar».
  if (fila.tipo === 'subhabito') {
    return [{ id: 'borrar', etiqueta: 'Eliminar el subhábito', accion: true, peligro: true, icono: <IconoBorrar /> }];
  }
  return [
    { id: 'editar', etiqueta: `Configurar ${nombre}`, accion: true, icono: <IconoEditar /> },
    // Solo el hábito se aplaza: una tarea se completa o se deja.
    ...(esTarea
      ? []
      : [
          {
            id: 'aplazar',
            etiqueta: 'Aplazar',
            icono: <IconoAplazar />,
            hijos: aplazosMenu(APLAZOS, aplazado),
          },
        ]),
    { id: 'grupo', etiqueta: 'Grupo', icono: <IconoCarpeta />, hijos: gruposMenu(grupos, grupoDe(fila)) },
    {
      id: 'prioridad',
      etiqueta: 'Importancia',
      color: colores[actual as NivelPrioridad],
      hijos: prioridadesMenu(colores, actual),
    },
    { id: 'borrar', etiqueta: `Eliminar ${nombre}`, accion: true, peligro: true, icono: <IconoBorrar /> },
  ];
}

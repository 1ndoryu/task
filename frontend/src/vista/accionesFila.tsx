/* Lo que una fila ofrece en su menú contextual y las acciones que la vista le
 * pasa. Separa el «qué se puede hacer» del componente que lo pinta. */
import { nivelDe, type NivelPrioridad } from '../logica/importancia';
import type { ColoresNivel } from '../logica/preferencias';
import { IconoCarpeta } from './Iconos';
import type { OpcionMenu } from './Menu';
import { gruposMenu, IconoBorrar, IconoEditar, prioridadesMenu } from './MenuOpciones';
import type { Editando } from './usarLista';

export interface AccionesFila {
  completar: (fila: NonNullable<Editando>) => void;
  editar: (fila: NonNullable<Editando>) => void;
  borrar: (fila: NonNullable<Editando>) => void;
  prioridad: (fila: NonNullable<Editando>, prioridad: string | null) => void;
  mover: (fila: NonNullable<Editando>, grupo: string | null) => void;
}

/** Nivel de la fila en el id común: la tarea ya lo trae y la importancia del
 * hábito llega como texto (`Muy Alta`), así que se traduce aquí. */
export function prioridadDe(fila: NonNullable<Editando>): string {
  return nivelDe(fila.tipo === 'tarea' ? fila.tarea.prioridad : fila.habito.importancia);
}

export function grupoDe(fila: NonNullable<Editando>): string | null {
  return (fila.tipo === 'tarea' ? fila.tarea.grupoEjecucion : fila.habito.grupoEjecucion) ?? null;
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
): OpcionMenu[] {
  const nombre = fila.tipo === 'tarea' ? 'la tarea' : 'el hábito';
  const actual = prioridadDe(fila);
  return [
    { id: 'editar', etiqueta: `Configurar ${nombre}`, accion: true, icono: <IconoEditar /> },
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

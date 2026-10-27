/* Menú contextual de un panel: las acciones que tiene un grupo o una nota,
 * tanto si está pintado como caja del carril como si es una pestaña. Es una
 * función pura porque el menú es lo mismo en las dos formas de la vista y solo
 * cambia el objeto sobre el que se abre.
 *
 * «Tareas» y «Completados» no tienen menú: no son nada de nadie. Un grupo de
 * tareas se archiva y se borra; una nota, además, se archiva sin perder su
 * texto. Renombrar es de los dos. */
import type { ReactNode } from 'react';
import type { Panel } from '../logica/paneles';
import { IconoArchivar, IconoBorrar, IconoRenombrar } from './MenuOpciones';

/** Lo que el menú puede pedir. Quien llama decide cómo hacerlo. */
export type AccionPanel = 'renombrar' | 'archivar' | 'borrar';

/** Una acción del menú, con su trazo: mismo contrato que `OpcionMenu`. */
export interface OpcionPanel {
  id: AccionPanel;
  etiqueta: string;
  icono: ReactNode;
  /** Una acción no es una elección marcada: sin marca de activo. */
  accion: true;
  peligro?: boolean;
}

/** Las acciones de un panel, en el orden en que se leen. Vacío en los de
 *  sistema: sin filas, no hay menú que pintar. */
export function opcionesPanel(panel: Panel): OpcionPanel[] {
  // Un proyecto tiene pestaña, no grupo: no se renombra ni se archiva desde aquí.
  if (panel.fija || panel.proyectoId !== undefined) return [];
  return [
    { id: 'renombrar', etiqueta: 'Cambiar el nombre', icono: <IconoRenombrar />, accion: true },
    // Archivar conserva la nota y las filas del grupo: es la salida prudente,
    // por eso va antes que la que destruye.
    { id: 'archivar', etiqueta: 'Archivar', icono: <IconoArchivar />, accion: true },
    {
      id: 'borrar',
      etiqueta: panel.tipo === 'nota' ? 'Eliminar la nota' : 'Eliminar el grupo',
      icono: <IconoBorrar />,
      accion: true,
      peligro: true,
    },
  ];
}

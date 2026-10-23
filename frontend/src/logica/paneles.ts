/* Paneles de la vista: lo que la lista pinta, sea una caja del carril o una
 * pestaña. Un panel tiene un tipo y un id estable; la vista no pregunta por
 * clases ni por forma, solo por `tipo`.
 *
 * Añadir un tipo de caja nuevo = añadir un valor a `TipoPanel`, un constructor
 * en `panelesDe` y su vista. Nada de lo demás cambia.
 *
 * El orden es una sola lista de ids, con los mismos nombres que el panel:
 * los grupos por su nombre, las notas por `nota:<id>`. «Tareas» y
 * «Completados» no están en la lista: son de sistema y su sitio lo manda la
 * vista (primera y última).
 * Lógica pura: sin React y sin tocar el `localStorage`. */
import type { ResumenNota } from './notas';
import { PESTANA_COMPLETADOS, type Grupo } from './orden';

/** Qué pinta un panel. Cada tipo trae su propia vista y sus propias acciones. */
export type TipoPanel = 'tareas' | 'habitos' | 'completados' | 'nota' | 'aplazados';

/** Prefijo del id de los paneles que no son grupos: así un grupo no puede
 *  llamarse igual que una nota y el orden guardado no se confunde. */
export const PREFIJO_NOTA = 'nota:';
/** Panel de hábitos: separa la caja «Tareas» en dos. Lleva prefijo de sistema
 *  para que un grupo con ese nombre no choque con él. */
export const PANEL_HABITOS = 'sistema:habitos';
/** Panel de lo aplazado. No es una pestaña de nada: recoge los hábitos de
 *  todos los grupos cuya vuelta aún no ha llegado. */
export const PANEL_APLAZADOS = 'sistema:aplazados';

export interface Panel {
  /** Id estable: `''` (Tareas), el nombre del grupo, `completados`, `nota:<id>`. */
  id: string;
  tipo: TipoPanel;
  /** Nombre visible. En los paneles de nota es el título de la nota. */
  etiqueta: string;
  /** Las de sistema no se renombran, no se borran y no se arrastran. */
  fija: boolean;
  /** Grupo de ejecución que filtra la caja; `null` donde no filtra. */
  grupo: Grupo;
}

/** Un panel de nota tal como lo ve esta capa: lo justo para nombrarlo. */
export type NotaResumen = ResumenNota;

export const panelDeNota = (id: string) => `${PREFIJO_NOTA}${id}`;

/** Id de nota de un panel, o `null` si no es una nota. */
export function idDeNota(panel: Panel): string | null {
  return panel.id.startsWith(PREFIJO_NOTA) ? panel.id.slice(PREFIJO_NOTA.length) : null;
}

/** Los paneles en orden: «Tareas», los ordenables (grupos y notas mezclados en
 *  el orden guardado) y «Completados» al final. Los que no están en el orden
 *  guardado entran al final, en alfabético por nombre. */
export function panelesDe(
  gruposDeFilas: Iterable<Grupo>,
  gruposConocidos: Iterable<string>,
  notas: Iterable<NotaResumen>,
  ordenGuardado: Iterable<string> = [],
  /** Grupos archivados: siguen en sus filas, pero no son paneles. */
  archivados: Iterable<string> = [],
  /** Partir «Tareas» en dos: lo suelto por un lado y los hábitos sin grupo por
   *  otro. El panel de hábitos es de sistema, así que va pegado a «Tareas». */
  separarHabitos = false,
  /** Hay hábitos aplazados: la caja «Aplazado» solo existe mientras haya algo
   *  dentro. Vacía no se pinta, y así no ocupa sitio en la vista de nadie. */
  hayAplazados = false,
): Panel[] {
  const grupos = new Set<string>(gruposConocidos);
  for (const grupo of gruposDeFilas) if (grupo) grupos.add(grupo);
  for (const nombre of archivados) grupos.delete(nombre);
  const listaNotas = new Map<string, string>();
  for (const nota of notas) listaNotas.set(panelDeNota(nota.id), nota.titulo);

  const ordenables = new Map<string, Panel>();
  for (const nombre of grupos) {
    ordenables.set(nombre, { id: nombre, tipo: 'tareas', etiqueta: nombre, fija: false, grupo: nombre });
  }
  for (const [id, titulo] of listaNotas) {
    ordenables.set(id, { id, tipo: 'nota', etiqueta: titulo, fija: false, grupo: null });
  }

  const guardados = [...new Set(ordenGuardado)].filter((id) => ordenables.has(id));
  const resto = [...ordenables.keys()]
    .filter((id) => !guardados.includes(id))
    .sort((a, b) => (ordenables.get(a)?.etiqueta ?? '').localeCompare(ordenables.get(b)?.etiqueta ?? '', 'es'));

  return [
    { id: '', tipo: 'tareas', etiqueta: 'Tareas', fija: true, grupo: null },
    ...(separarHabitos
      ? [{ id: PANEL_HABITOS, tipo: 'habitos' as const, etiqueta: 'Hábitos', fija: true, grupo: null }]
      : []),
    ...(hayAplazados
      ? [{ id: PANEL_APLAZADOS, tipo: 'aplazados' as const, etiqueta: 'Aplazado', fija: true, grupo: null }]
      : []),
    ...[...guardados, ...resto].map((id) => ordenables.get(id) as Panel),
    // Sin grupo: este panel no filtra por grupo, recoge lo hecho de todos.
    // Si llevara uno, `seleccionar` no Marcaría la pestaña de completados.
    { id: PESTANA_COMPLETADOS, tipo: 'completados', etiqueta: 'Completados', fija: true, grupo: null },
  ];
}

/** Mueve un panel a una posición entre los ordenables. El índice cuenta solo
 *  los que se pueden mover (sin «Tareas» ni «Completados»), que es el mismo
 *  espacio que usa el carril al soltar. Un índice fuera de rango se recorta. */
export function moverA(orden: string[], movido: string, indice: number): string[] {
  const desde = orden.indexOf(movido);
  if (desde < 0) return orden;
  const nuevo = [...orden];
  nuevo.splice(desde, 1);
  nuevo.splice(Math.min(nuevo.length, Math.max(0, indice)), 0, movido);
  return nuevo;
}

/* Filtro de la lista, con las mismas categorías del front original
 * (`frontend-legacy/src/app/hooks/useFiltroTareas.ts`): sueltas, todas o las de
 * un proyecto. Se omite «mis asignadas»: el payload no trae `asignadoA` y no
 * habría nada que filtrar. El valor se persiste para recordarlo entre recargas. */
import type { Proyecto, Tarea } from './tipos';

export type Filtro =
  | { tipo: 'sueltas' }
  | { tipo: 'todas' }
  | { tipo: 'proyecto'; proyectoId: number };

/** Valor serializable del filtro: `sueltas`, `todas` o `proyecto-<id>`. */
export function codificarFiltro(filtro: Filtro): string {
  return filtro.tipo === 'proyecto' ? `proyecto-${filtro.proyectoId}` : filtro.tipo;
}

export function decodificarFiltro(valor: string | null): Filtro {
  if (!valor) return { tipo: 'sueltas' };
  if (valor === 'todas') return { tipo: 'todas' };
  const coincidencia = /^proyecto-(\d+)$/.exec(valor);
  if (coincidencia) return { tipo: 'proyecto', proyectoId: Number(coincidencia[1]) };
  return { tipo: 'sueltas' };
}

export function etiquetaFiltro(filtro: Filtro, proyectos: Proyecto[]): string {
  switch (filtro.tipo) {
    case 'sueltas':
      return 'Sueltas';
    case 'todas':
      return 'Todas';
    case 'proyecto':
      return proyectos.find((p) => p.id === filtro.proyectoId)?.nombre ?? 'Proyecto';
  }
}

/** Tareas de primer nivel que entran en la lista según el filtro. */
export function aplicarFiltro(tareas: Tarea[], filtro: Filtro): Tarea[] {
  const raiz = tareas.filter((t) => t.parentId == null);
  switch (filtro.tipo) {
    case 'todas':
      return raiz;
    case 'proyecto':
      return raiz.filter((t) => t.proyectoId === filtro.proyectoId);
    case 'sueltas':
      return raiz.filter((t) => t.proyectoId == null);
  }
}

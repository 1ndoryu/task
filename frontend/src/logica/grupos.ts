/* Grupos de ejecución: nombres de texto libre que tareas y hábitos llevan en
 * `grupoEjecucion`. Los que se usan se recuerdan aunque se vacíen, para que la
 * pestaña no desaparezca al mover la última fila (igual que `gruposConocidos`
 * del front original). */
import { CLAVE_GRUPOS, limpiarGrupo } from './orden';

export function leerGruposConocidos(): string[] {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_GRUPOS) ?? '[]') as unknown;
    if (!Array.isArray(crudo)) return [];
    // Se limpian al leer: el `localStorage` puede traer basura de otras versiones.
    return [...new Set(crudo.map(limpiarGrupo).filter((g): g is string => g !== null))];
  } catch {
    return [];
  }
}

export function anotarGrupos(nombres: Iterable<string>): void {
  const conocidos = new Set(leerGruposConocidos());
  for (const nombre of nombres) {
    const limpio = limpiarGrupo(nombre);
    if (limpio) conocidos.add(limpio);
  }
  localStorage.setItem(CLAVE_GRUPOS, JSON.stringify([...conocidos]));
}

/* Grupos de ejecución: nombres de texto libre que tareas y hábitos llevan en
 * `grupoEjecucion`. Los que se usan se recuerdan aunque se vacíen, para que la
 * pestaña no desaparezca al mover la última fila (igual que `gruposConocidos`
 * del front original). También se recuerda en qué orden se dejaron las
 * pestañas al arrastrarlas. */
import { CLAVE_GRUPOS, limpiarGrupo } from './orden';

const CLAVE_ORDEN = 'tareas-nuevo:v1:orden-pestanas';

/** Lista de nombres limpios guardados bajo una clave, sin repetidos. */
function leerNombres(clave: string): string[] {
  try {
    const crudo = JSON.parse(localStorage.getItem(clave) ?? '[]') as unknown;
    if (!Array.isArray(crudo)) return [];
    // Se limpian al leer: el `localStorage` puede traer basura de otras versiones.
    return [...new Set(crudo.map(limpiarGrupo).filter((g): g is string => g !== null))];
  } catch {
    return [];
  }
}

export function leerGruposConocidos(): string[] {
  return leerNombres(CLAVE_GRUPOS);
}

export function anotarGrupos(nombres: Iterable<string>): void {
  const conocidos = new Set(leerGruposConocidos());
  for (const nombre of nombres) {
    const limpio = limpiarGrupo(nombre);
    if (limpio) conocidos.add(limpio);
  }
  localStorage.setItem(CLAVE_GRUPOS, JSON.stringify([...conocidos]));
}

/** Saca un nombre de los grupos y del orden de pestañas: el grupo deja de
 * existir para la vista aunque queden filas con ese nombre guardado. */
export function olvidarGrupo(nombre: string): void {
  const limpio = limpiarGrupo(nombre);
  if (!limpio) return;
  const quedan = leerGruposConocidos().filter((g) => g !== limpio);
  localStorage.setItem(CLAVE_GRUPOS, JSON.stringify(quedan));
  const orden = leerOrdenPestanas().filter((g) => g !== limpio);
  localStorage.setItem(CLAVE_ORDEN, JSON.stringify(orden));
}

/** Renombra el grupo en los nombres conocidos y en el orden de las pestañas.
 * Si el nombre nuevo ya existía, los dos quedan en uno. */
export function renombrarGrupoGuardado(viejo: string, nuevo: string): void {
  const desde = limpiarGrupo(viejo);
  const hasta = limpiarGrupo(nuevo);
  if (!desde || !hasta || desde === hasta) return;
  const renombrado = (nombre: string) => (nombre === desde ? hasta : nombre);
  localStorage.setItem(CLAVE_GRUPOS, JSON.stringify([...new Set(leerGruposConocidos().map(renombrado))]));
  localStorage.setItem(CLAVE_ORDEN, JSON.stringify([...new Set(leerOrdenPestanas().map(renombrado))]));
}

/** Orden de las pestañas de grupo tal como las dejó la usuaria. */
export function leerOrdenPestanas(): string[] {
  return leerNombres(CLAVE_ORDEN);
}

export function guardarOrdenPestanas(nombres: Iterable<string>): void {
  const limpios = [...nombres].map(limpiarGrupo).filter((g): g is string => g !== null);
  localStorage.setItem(CLAVE_ORDEN, JSON.stringify(limpios));
  // Una pestaña reordenada ya es una pestaña conocida: no debe desaparecer al
  // quedarse sin filas.
  anotarGrupos(limpios);
}

/* Grupos de ejecución: nombres de texto libre que tareas y hábitos llevan en
 * `grupoEjecucion`. Los que se usan se recuerdan aunque se vacíen, para que la
 * pestaña no desaparezca al mover la última fila (igual que `gruposConocidos`
 * del front original). También se recuerda en qué orden se dejaron las
 * pestañas al arrastrarlas; ese orden es el de los paneles, así que lleva
 * también las notas (`nota:<id>`): una sola lista para una sola fila. */
import { CLAVE_GRUPOS, limpiarGrupo, PESTANA_COMPLETADOS } from './orden';
import { PREFIJO_NOTA } from './paneles';

const CLAVE_ORDEN = 'tareas-nuevo:v1:orden-pestanas';
/** Grupos archivados: dejan de ser paneles pero siguen en sus filas y en el
 *  orden guardado, listos para volver. Un grupo no existe en el backend, así
 *  que su archivo vive aquí. */
const CLAVE_ARCHIVADOS = 'tareas-nuevo:v1:grupos-archivados';

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
  // Borrar de verdad también lo saca del archivo: si no, volvería al recuperar.
  archivarGrupoGuardado(limpio, false);
}

/** Grupos archivados: nombres que hoy no son paneles pero pueden volver. */
export function leerGruposArchivados(): string[] {
  return leerNombres(CLAVE_ARCHIVADOS);
}

/** Archiva un grupo o lo devuelve. Archivado sigue siendo un grupo conocido y
 *  sus filas no se tocan: solo deja de pintarse como panel. */
export function archivarGrupoGuardado(nombre: string, archivado: boolean): void {
  const limpio = limpiarGrupo(nombre);
  if (!limpio) return;
  const archivados = new Set(leerGruposArchivados());
  if (archivado) archivados.add(limpio);
  else archivados.delete(limpio);
  localStorage.setItem(CLAVE_ARCHIVADOS, JSON.stringify([...archivados]));
  // El orden de paneles no lleva archivados: uno que vuelve entra al final.
  if (archivado) {
    localStorage.setItem(CLAVE_ORDEN, JSON.stringify(leerOrdenPestanas().filter((id) => id !== limpio)));
  }
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

/** Orden de los paneles (grupos y notas) tal como los dejó la usuaria. Los ids
 *  de nota ya vienen con su prefijo `nota:`; `limpiarGrupo` los deja pasar tal
 *  cual porque son texto no vacío. */
export function leerOrdenPestanas(): string[] {
  return leerNombres(CLAVE_ORDEN);
}

export function guardarOrdenPaneles(ids: Iterable<string>): void {
  const limpios = [...ids].map(limpiarGrupo).filter((g): g is string => g !== null && g !== PESTANA_COMPLETADOS);
  localStorage.setItem(CLAVE_ORDEN, JSON.stringify(limpios));
  // Un grupo reordenado ya es un grupo conocido: no debe desaparecer al
  // quedarse sin filas. Las notas no van a la lista de grupos: su panel sale
  // de la propia nota, no de un nombre recordado.
  anotarGrupos(limpios.filter((id) => !id.startsWith(PREFIJO_NOTA)));
}

/* Cambios locales pendientes de enviar, en `localStorage`.
 * Cada copia lleva la versión del servidor sobre la que se hizo (`baseUpdatedAt`):
 * al cargar, solo sobrevive si el servidor sigue en esa versión. Así una copia
 * vieja nunca pisa una fila que otra pestaña, la app local o el agente ya
 * cambiaron. Un alta (fila que aún no está en el servidor) no tiene versión.
 * La clave lleva el correo para no mezclar cambios de dos cuentas. */
import type { Habito, Tarea } from './tipos';

/** Una copia no confirmada y la versión del servidor sobre la que se hizo. */
export interface Pendiente<T> {
  copia: T;
  /** Ausente en un alta: la fila todavía no existe en el servidor. */
  baseUpdatedAt?: string;
}

export interface Pendientes {
  tareas: Record<number, Pendiente<Tarea>>;
  habitos: Record<number, Pendiente<Habito>>;
}

const clave = (correo: string) => `tareas-nuevo:v1:${correo}`;

export function leerPendientes(correo: string): Pendientes {
  try {
    const crudo = localStorage.getItem(clave(correo));
    if (!crudo) return { tareas: {}, habitos: {} };
    const datos = JSON.parse(crudo) as Partial<Pendientes>;
    return { tareas: datos.tareas ?? {}, habitos: datos.habitos ?? {} };
  } catch {
    // Un valor corrupto no debe romper la vista; se descarta.
    return { tareas: {}, habitos: {} };
  }
}

export function guardarPendientes(correo: string, pendientes: Pendientes): void {
  const vacio = Object.keys(pendientes.tareas).length === 0 && Object.keys(pendientes.habitos).length === 0;
  if (vacio) localStorage.removeItem(clave(correo));
  else localStorage.setItem(clave(correo), JSON.stringify(pendientes));
}

/** Lo que queda de una tabla tras cruzar sus pendientes con las filas del servidor. */
export interface Fusion<T> {
  /** Filas a mostrar: la copia vigente si la hay, o la del servidor. */
  filas: T[];
  /** Pendientes que siguen vigentes: son los que hay que reenviar. */
  vigentes: Record<number, Pendiente<T>>;
  /** Pendientes descartados, para avisar una sola vez. */
  descartados: number;
}

/** Una copia vale si el servidor sigue en su versión; un alta vale si el servidor no tiene la fila. */
function esVigente<T extends { updatedAt?: string }>(pendiente: Pendiente<T>, fila: T | undefined): boolean {
  // Formato anterior sin copia: no hay forma de saber qué contenía, se descarta.
  if (!pendiente?.copia) return false;
  if (!fila) return pendiente.baseUpdatedAt === undefined;
  return pendiente.baseUpdatedAt === fila.updatedAt;
}

/** Cruza los pendientes de una tabla con sus filas del servidor; no toca los datos guardados. */
export function fusionarFilas<T extends { id: number; updatedAt?: string }>(
  filas: T[],
  pendientes: Record<number, Pendiente<T>>,
): Fusion<T> {
  const vigentes: Record<number, Pendiente<T>> = {};
  let descartados = 0;
  for (const [id, pendiente] of Object.entries(pendientes)) {
    const fila = filas.find((f) => f.id === Number(id));
    if (esVigente(pendiente, fila)) vigentes[Number(id)] = pendiente;
    else descartados++;
  }
  const enServidor = filas.map((fila) => vigentes[fila.id]?.copia ?? fila);
  // Las altas vigentes no están en el servidor: van al final, como se crearon.
  const altas = Object.values(vigentes)
    .filter((pendiente) => !filas.some((fila) => fila.id === pendiente.copia.id))
    .map((pendiente) => pendiente.copia);
  return { filas: [...enServidor, ...altas], vigentes, descartados };
}

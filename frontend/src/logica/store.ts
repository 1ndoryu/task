/* Cambios locales pendientes de enviar, en `localStorage`.
 * El front original sincronizaba por sondeo (`useSyncManager`); aquí basta con
 * guardar cada entidad tocada y vaciarla cuando el PUT confirma, para que una
 * recarga no pierda lo que todavía no llegó al backend. La clave lleva el
 * correo para no mezclar cambios de dos cuentas en el mismo navegador. */
import type { Tarea } from './tipos';

export interface Pendientes {
  tareas: Record<number, Tarea>;
}

const clave = (correo: string) => `tareas-nuevo:v1:${correo}`;

export function leerPendientes(correo: string): Pendientes {
  try {
    const crudo = localStorage.getItem(clave(correo));
    if (!crudo) return { tareas: {} };
    const datos = JSON.parse(crudo) as Partial<Pendientes>;
    return { tareas: datos.tareas ?? {} };
  } catch {
    // Un valor corrupto no debe romper la vista; se descarta.
    return { tareas: {} };
  }
}

export function guardarPendientes(correo: string, pendientes: Pendientes): void {
  const tareas = Object.values(pendientes.tareas);
  if (tareas.length === 0) localStorage.removeItem(clave(correo));
  else localStorage.setItem(clave(correo), JSON.stringify({ tareas: pendientes.tareas }));
}

/** Aplica los cambios guardados sobre lo que trajo el dashboard. */
export function fusionarPendientes(tareas: Tarea[], pendientes: Pendientes): Tarea[] {
  if (Object.keys(pendientes.tareas).length === 0) return tareas;
  return tareas.map((tarea) => pendientes.tareas[tarea.id] ?? tarea);
}

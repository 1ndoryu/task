/* Cambios locales pendientes de enviar, en `localStorage`.
 * El front original sincronizaba por sondeo (`useSyncManager`); aquí basta con
 * guardar cada entidad tocada y vaciarla cuando el PUT confirma, para que una
 * recarga no pierda lo que todavía no llegó al backend. La clave lleva el
 * correo para no mezclar cambios de dos cuentas en el mismo navegador. */
import type { Habito, Tarea } from './tipos';

export interface Pendientes {
  tareas: Record<number, Tarea>;
  habitos: Record<number, Habito>;
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

/** Aplica los cambios guardados sobre lo que trajo el dashboard. */
export function fusionarPendientes(
  tareas: Tarea[],
  habitos: Habito[],
  pendientes: Pendientes,
): { tareas: Tarea[]; habitos: Habito[] } {
  return {
    tareas: tareas.map((tarea) => pendientes.tareas[tarea.id] ?? tarea),
    habitos: habitos.map((habito) => pendientes.habitos[habito.id] ?? habito),
  };
}

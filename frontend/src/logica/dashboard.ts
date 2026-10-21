/* Lectura del dashboard: una sola llamada trae tareas y hábitos.
 * Sin caché ni sincronización todavía; lo que se necesite se irá copiando del
 * front original (`frontend-legacy/src/app/hooks/useDashboard*`). */
import { pedir } from './cliente';
import type { Dashboard, Habito, Tarea } from './tipos';

interface RespuestaDashboard {
  data: { tareas?: Tarea[]; habitos?: Habito[] };
}

export async function leerDashboard(): Promise<Dashboard> {
  const { data } = await pedir<RespuestaDashboard>('/dashboard');
  return { tareas: data.tareas ?? [], habitos: data.habitos ?? [] };
}

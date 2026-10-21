/* Lectura del dashboard: una sola llamada trae tareas, hábitos y proyectos. */
import { pedir } from './cliente';
import type { Dashboard, Habito, Proyecto, Tarea } from './tipos';

interface RespuestaDashboard {
  data: { tareas?: Tarea[]; habitos?: Habito[]; proyectos?: Proyecto[] };
}

export async function leerDashboard(): Promise<Dashboard> {
  const { data } = await pedir<RespuestaDashboard>('/dashboard');
  return {
    tareas: data.tareas ?? [],
    habitos: data.habitos ?? [],
    proyectos: data.proyectos ?? [],
  };
}

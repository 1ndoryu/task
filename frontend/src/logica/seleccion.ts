/* Qué parte del dashboard se pinta. Lógica pura sobre los datos ya leídos:
 * tareas abiertas (sin las subtareas, que pertenecen a su padre) y hábitos por
 * orden, con la fecha de hoy ya resuelta para marcar lo hecho. */
import type { Dashboard, Habito, Tarea } from './tipos';

const PESO_URGENCIA: Record<string, number> = {
  bloqueante: 0,
  urgente: 1,
  normal: 2,
  chill: 3,
};

function pesoUrgencia(tarea: Tarea): number {
  return PESO_URGENCIA[tarea.urgencia ?? 'normal'] ?? 2;
}

/** Tareas pendientes de primer nivel, las más urgentes primero. */
export function tareasAbiertas(tareas: Tarea[]): Tarea[] {
  return tareas
    .filter((tarea) => !tarea.completado && tarea.parentId == null)
    .sort((a, b) => pesoUrgencia(a) - pesoUrgencia(b) || (a.orden ?? 0) - (b.orden ?? 0));
}

export function habitosOrdenados(habitos: Habito[]): Habito[] {
  return [...habitos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

/** Fecha local en `YYYY-MM-DD`, el formato en que el backend guarda el historial. */
export function fechaLocal(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

export function hechoHoy(habito: Habito, hoy: string): boolean {
  return habito.historialCompletados?.includes(hoy) ?? false;
}

export function resumen(datos: Dashboard, hoy: string): {
  tareas: Tarea[];
  habitos: Habito[];
  hechos: number;
} {
  const habitos = habitosOrdenados(datos.habitos);
  return {
    tareas: tareasAbiertas(datos.tareas),
    habitos,
    hechos: habitos.filter((habito) => hechoHoy(habito, hoy)).length,
  };
}

/* Qué se pinta: tareas y hábitos en una sola lista, ordenados por el mismo
 * criterio (como el panel de ejecución del front original). Lógica pura. */
import { fechaLocal } from './fechas';
import { aplicarFiltro, type Filtro } from './filtros';
import { comparador, entradaDeHabito, entradaDeTarea, type ModoOrden } from './orden';
import type { Dashboard, Habito, Tarea } from './tipos';

export { fechaLocal };

/** Una fila de la lista: o una tarea real o un hábito. */
export type Fila = { tipo: 'tarea'; tarea: Tarea } | { tipo: 'habito'; habito: Habito };

export interface Vista {
  filas: Fila[];
}

export function hechoHoy(habito: Habito, hoy: string): boolean {
  return habito.historialCompletados?.includes(hoy) ?? false;
}

export function seleccionar(
  datos: Dashboard,
  opciones: { filtro: Filtro; orden: ModoOrden; hoy?: string },
): Vista {
  const hoy = opciones.hoy ?? fechaLocal();
  const tareas = aplicarFiltro(datos.tareas, opciones.filtro).filter((t) => !t.completado);

  const pares = [
    ...tareas.map((tarea) => ({ fila: { tipo: 'tarea', tarea } as Fila, entrada: entradaDeTarea(tarea) })),
    ...datos.habitos.map((habito) => ({
      fila: { tipo: 'habito', habito } as Fila,
      entrada: entradaDeHabito(habito),
    })),
  ];

  // El comparador guarda los pesos calculados: se crea una sola vez.
  const comparar = comparador(opciones.orden, hoy);
  pares.sort((a, b) => comparar(a.entrada, b.entrada));

  return { filas: pares.map((par) => par.fila) };
}

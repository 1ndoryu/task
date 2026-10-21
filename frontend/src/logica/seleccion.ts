/* Qué se pinta: tareas y hábitos en una sola lista, ordenados por el mismo
 * criterio (como el panel de ejecución del front original) y filtrados por la
 * pestaña de grupo activa. Lógica pura. */
import { fechaLocal } from './fechas';
import { aplicarFiltro, type Filtro } from './filtros';
import { comparador, entradaDeHabito, entradaDeTarea, type Grupo, type ModoOrden } from './orden';
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

/** Un grupo encaja con la pestaña si coincide el nombre; «Tareas» recoge lo
 * que no tiene grupo. Vale igual para tareas y hábitos. */
export function enGrupo(grupoDeFila: Grupo | undefined, activo: Grupo): boolean {
  return (grupoDeFila ?? null) === activo;
}

export function seleccionar(
  datos: Dashboard,
  opciones: {
    filtro: Filtro;
    orden: ModoOrden;
    /** Pestaña activa; `null` es la de «Tareas» (sin grupo). */
    grupo?: Grupo;
    hoy?: string;
    /** Tareas recién completadas que siguen en pantalla mientras salen.
     * La clave es `tarea<id>`, la misma que arma `claveFila` en la vista. */
    saliendo?: ReadonlySet<string>;
  },
): Vista {
  const hoy = opciones.hoy ?? fechaLocal();
  const grupo = opciones.grupo ?? null;
  const deFiltro = aplicarFiltro(datos.tareas, opciones.filtro);

  const tareas = deFiltro.filter(
    (t) => (!t.completado || (opciones.saliendo?.has(`tarea${t.id}`) ?? false)) && enGrupo(t.grupoEjecucion, grupo),
  );
  // Los hábitos completados hoy siguen en la lista, con su marca de hecho.
  const habitos = datos.habitos.filter((h) => enGrupo(h.grupoEjecucion, grupo));

  const pares = [
    ...tareas.map((tarea) => ({ fila: { tipo: 'tarea', tarea } as Fila, entrada: entradaDeTarea(tarea) })),
    ...habitos.map((habito) => ({ fila: { tipo: 'habito', habito } as Fila, entrada: entradaDeHabito(habito) })),
  ];

  // El comparador guarda los pesos calculados: se crea una sola vez.
  const comparar = comparador(opciones.orden, hoy);
  pares.sort((a, b) => comparar(a.entrada, b.entrada));

  return { filas: pares.map((par) => par.fila) };
}

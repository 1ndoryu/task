/* Qué se pinta: tareas y hábitos en una sola lista, ordenados por el mismo
 * criterio (como el panel de ejecución del front original) y filtrados por la
 * pestaña activa. Lógica pura. */
import { fechaLocal } from './fechas';
import { tocaHoy } from './frecuencia';
import { comparador, entradaDeHabito, entradaDeTarea, PESTANA_COMPLETADOS, type Grupo, type ModoOrden } from './orden';
import type { Dashboard, Habito, Tarea } from './tipos';

export { fechaLocal };

/** Una fila de la lista: o una tarea real o un hábito. */
export type Fila = { tipo: 'tarea'; tarea: Tarea } | { tipo: 'habito'; habito: Habito };

export interface Vista {
  filas: Fila[];
  /** La pestaña muestra lo completado: las filas se pintan tachadas. */
  completados: boolean;
}

export function hechoHoy(habito: Habito, hoy: string): boolean {
  return habito.historialCompletados?.includes(hoy) ?? false;
}

/** Un grupo encaja con la pestaña si coincide el nombre; «Tareas» recoge lo
 * que no tiene grupo. Vale igual para tareas y hábitos. */
export function enGrupo(grupoDeFila: Grupo | undefined, activo: Grupo): boolean {
  return (grupoDeFila ?? null) === activo;
}

/** Si un hábito ya hecho hoy debe esconderse. La frecuencia decide cuándo
 * vuelve a tocar: lo que tocaba hoy y ya está hecho no se repite; lo que no
 * tocaba (semanal, días fijos…) se queda en la lista como pendiente. */
export function ocultarCompletado(habito: Habito, hoy: string, ocultar: boolean): boolean {
  return ocultar && hechoHoy(habito, hoy) && tocaHoy(habito, hoy);
}

export function seleccionar(
  datos: Dashboard,
  opciones: {
    orden: ModoOrden;
    /** Pestaña activa; `null` es la de «Tareas» (sin grupo). */
    grupo?: Grupo;
    /** Esconder los hábitos ya cumplidos según su frecuencia (ajuste). */
    ocultarHabitos?: boolean;
    hoy?: string;
    /** Tareas recién completadas que siguen en pantalla mientras salen.
     * La clave es `tarea<id>`, la misma que arma `claveFila` en la vista. */
    saliendo?: ReadonlySet<string>;
  },
): Vista {
  const hoy = opciones.hoy ?? fechaLocal();
  const completados = opciones.grupo === PESTANA_COMPLETADOS;
  const grupo = completados ? null : (opciones.grupo ?? null);
  const saliendo = (id: number) => opciones.saliendo?.has(`tarea${id}`) ?? false;

  // La pestaña de completados es de sistema: recoge lo hecho de todos los
  // grupos y no se parte por pestaña.
  const tareas = datos.tareas.filter(
    (t) => t.parentId == null && (completados ? t.completado : !t.completado || saliendo(t.id)) && (completados || enGrupo(t.grupoEjecucion, grupo)),
  );
  const habitos = (completados ? datos.habitos.filter((h) => hechoHoy(h, hoy)) : datos.habitos.filter((h) => enGrupo(h.grupoEjecucion, grupo))).filter(
    (h) => completados || !ocultarCompletado(h, hoy, opciones.ocultarHabitos ?? false),
  );

  const pares = [
    ...tareas.map((tarea) => ({ fila: { tipo: 'tarea', tarea } as Fila, entrada: entradaDeTarea(tarea) })),
    ...habitos.map((habito) => ({ fila: { tipo: 'habito', habito } as Fila, entrada: entradaDeHabito(habito) })),
  ];

  // El comparador guarda los pesos calculados: se crea una sola vez.
  const comparar = comparador(opciones.orden, hoy);
  pares.sort((a, b) => comparar(a.entrada, b.entrada));

  return { filas: pares.map((par) => par.fila), completados };
}

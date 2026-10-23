/* Qué se pinta: tareas y hábitos en una sola lista, ordenados por el mismo
 * criterio (como el panel de ejecución del front original) y filtrados por la
 * pestaña activa. Lógica pura. */
import { aplazadoHasta } from './aplazos';
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
  /** Los hábitos aplazados de toda la lista, por fecha de vuelta. Es el
   *  contenido de la caja «Aplazado», viva en cualquier pestaña. */
  aplazados: Fila[];
}

export function hechoHoy(habito: Habito, hoy: string): boolean {
  return habito.historialCompletados?.includes(hoy) ?? false;
}

/** Un grupo encaja con la pestaña si coincide el nombre; «Tareas» recoge lo
 * que no tiene grupo. Vale igual para tareas y hábitos. */
export function enGrupo(grupoDeFila: Grupo | undefined, activo: Grupo): boolean {
  return (grupoDeFila ?? null) === activo;
}

/** Si un hábito debe esconderse de la lista. Es la regla del panel de
 * ejecución del legacy: se muestra si toca hoy **y** no está hecho; lo hecho
 * se esconde, y lo que no toca (cada X días, semanal, mensual, días fijos)
 * también, hasta que la frecuencia lo traiga de vuelta. */
export function ocultarCompletado(habito: Habito, hoy: string, ocultar: boolean): boolean {
  return ocultar && (hechoHoy(habito, hoy) || !tocaHoy(habito, hoy));
}

export function seleccionar(
  datos: Dashboard,
  opciones: {
    orden: ModoOrden;
    /** Pestaña activa; `null` es la de «Tareas» (sin grupo). */
    grupo?: Grupo;
    /** Pinta la pestaña de completados. Va aparte de `grupo` porque esa
     *  pestaña recoge lo hecho de todos los grupos y su panel no lleva
     *  ninguno: si dependiera de `grupo`, nunca se activaría. */
    completados?: boolean;
    /** Esconder los hábitos ya cumplidos según su frecuencia (ajuste). */
    ocultarHabitos?: boolean;
    /** Solo una clase de fila: el panel de hábitos de la vista separada. Sin
     *  él, tareas y hábitos comparten lista como siempre. */
    solo?: 'tareas' | 'habitos';
    hoy?: string;
    /** Tareas recién completadas que siguen en pantalla mientras salen.
     * La clave es `tarea<id>`, la misma que arma `claveFila` en la vista. */
    saliendo?: ReadonlySet<string>;
  },
): Vista {
  const hoy = opciones.hoy ?? fechaLocal();
  const completados = opciones.completados ?? opciones.grupo === PESTANA_COMPLETADOS;
  const grupo = completados ? null : (opciones.grupo ?? null);
  const saliendo = (id: number) => opciones.saliendo?.has(`tarea${id}`) ?? false;

  // La pestaña de completados es de sistema: recoge lo hecho de todos los
  // grupos y no se parte por pestaña. «Tareas» es la lista de lo suelto: una
  // tarea con proyecto pertenece al proyecto y no se repite aquí.
  const tareas = datos.tareas.filter(
    (t) =>
      t.parentId == null &&
      (completados ? t.completado : !t.completado || saliendo(t.id)) &&
      (completados || (enGrupo(t.grupoEjecucion, grupo) && (grupo !== null || t.proyectoId == null))),
  );
  // Aplazado es un estado propio: el hábito no toca y no se queda en su pestaña
  // (allí parecería pendiente); vive en la caja «Aplazado» hasta que vuelve.
  const aplazadosDe = (h: Habito) => aplazadoHasta(h, hoy) !== null;
  const habitos = (completados ? datos.habitos.filter((h) => hechoHoy(h, hoy)) : datos.habitos.filter((h) => enGrupo(h.grupoEjecucion, grupo))).filter(
    (h) => completados || (!aplazadosDe(h) && !ocultarCompletado(h, hoy, opciones.ocultarHabitos ?? false)),
  );
  // La caja «Aplazado» recoge los de todas las pestañas: lo que se pospone sale
  // de su grupo, y buscarlo ahí sería no encontrarlo.
  const aplazados: Fila[] = completados
    ? []
    : datos.habitos
        .filter(aplazadosDe)
        // Vuelve antes quien tiene la vuelta más cercana.
        .sort((a, b) => (aplazadoHasta(a, hoy) ?? '').localeCompare(aplazadoHasta(b, hoy) ?? ''))
        .map((habito) => ({ tipo: 'habito' as const, habito }));

  // La vista separada pide una sola clase de fila; sin `solo`, van las dos.
  const pares = [
    ...(opciones.solo === 'habitos'
      ? []
      : tareas.map((tarea) => ({ fila: { tipo: 'tarea', tarea } as Fila, entrada: entradaDeTarea(tarea) }))),
    ...(opciones.solo === 'tareas'
      ? []
      : habitos.map((habito) => ({ fila: { tipo: 'habito', habito } as Fila, entrada: entradaDeHabito(habito, hoy) }))),
  ];

  // El comparador guarda los pesos calculados: se crea una sola vez.
  const comparar = comparador(opciones.orden, hoy);
  pares.sort((a, b) => comparar(a.entrada, b.entrada));

  return { filas: pares.map((par) => par.fila), completados, aplazados };
}

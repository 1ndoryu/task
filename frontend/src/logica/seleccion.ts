/* Qué se pinta: tareas y hábitos en una sola lista, ordenados por el mismo
 * criterio (como el panel de ejecución del front original) y filtrados por la
 * pestaña activa. Lógica pura. */
import type { Algoritmo } from './algoritmo';
import { aplazadoHasta } from './aplazos';
import { fechaLocal } from './fechas';
import { tocaHoy, type ConFrecuencia } from './frecuencia';
import { contarProgreso } from './progreso';
import {
  comparador,
  entradaDeHabito,
  entradaDeTarea,
  PESTANA_COMPLETADOS,
  type Grupo,
  type ModoOrden,
  type ValoracionUrgencia,
} from './orden';
import type { Dashboard, Habito, SubHabito, Tarea } from './tipos';

export { fechaLocal };

/** Una fila de la lista: una tarea, un hábito o un subhábito. `hijos` son sus
 *  subtareas o subhábitos, ya resueltos: se pintan indentados bajo el padre.
 *  El subhábito no tiene registro propio en el backend —vive en el payload de
 *  su padre—, así que la fila lleva el padre para poder escribirlo. */
export type Fila =
  | { tipo: 'tarea'; tarea: Tarea; hijos?: Fila[] }
  | { tipo: 'habito'; habito: Habito; hijos?: Fila[] }
  | { tipo: 'subhabito'; subhabito: SubHabito; padre: Habito };

/** Subhábitos del padre como filas. Los sin nombre se saltan: el legacy dejó
 *  algunos fantasma que no se podían ni borrar. Un subhábito pausado tampoco
 *  se pinta, igual que en el legacy. */
export function subfilas(padre: Habito, hoy: string, ocultar: boolean): Fila[] {
  return (padre.subhabitos ?? [])
    .filter((s) => s.nombre?.trim() && !s.pausado && !ocultarCompletado(s, hoy, ocultar))
    .map((subhabito) => ({ tipo: 'subhabito' as const, subhabito, padre }));
}

export interface Vista {
  filas: Fila[];
  /** La pestaña muestra lo completado: las filas se pintan tachadas. */
  completados: boolean;
  /** Los hábitos aplazados de toda la lista, por fecha de vuelta. Es el
   *  contenido de la caja «Aplazado», viva en cualquier pestaña. */
  aplazados: Fila[];
}

export function hechoHoy(habito: ConFrecuencia, hoy: string): boolean {
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
export function ocultarCompletado(habito: ConFrecuencia, hoy: string, ocultar: boolean): boolean {
  return ocultar && (hechoHoy(habito, hoy) || !tocaHoy(habito, hoy));
}

/** Cuántos hábitos de hoy hay hechos y cuántos hay en total. Cuenta desde los
 *  datos y no desde la lista pintada: con «ocultar cumplidos» lo hecho desaparece
 *  de las filas y la barra perdería su numerador. Entran los que tocan hoy o ya
 *  están hechos; quedan fuera los aplazados y los de otro grupo. */
export function progresoHabitos(datos: Dashboard, grupo: Grupo, hoy: string): { hechos: number; total: number } {
  return contarProgreso(
    datos.habitos
      .filter((h) => enGrupo(h.grupoEjecucion, grupo))
      .map((h) => ({
        hecho: hechoHoy(h, hoy),
        cuenta: aplazadoHasta(h, hoy) === null && (hechoHoy(h, hoy) || tocaHoy(h, hoy)),
      })),
  );
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
    /** Nivel de estricto y reinicio de la urgencia de los hábitos (ajustes). */
    valoracion?: ValoracionUrgencia;
    /** Pesos y horas del orden inteligente (ajustes); sin él, los de fábrica. */
    algoritmo?: Algoritmo;
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
      (completados ? t.completado : !t.completado || saliendo(t.id)) &&
      (completados || (enGrupo(t.grupoEjecucion, grupo) && (grupo !== null || t.proyectoId == null))),
  );
  // El legado anidaba un solo nivel: una tarea con padre no es fila propia, se
  // pinta debajo de él. Si el padre no está en esta vista (otra pestaña, otro
  // proyecto o ya hecho), la hija sube a raíz: perder una tarea es peor.
  const porPadre = (t: Tarea) => t.parentId != null && tareas.some((p) => p.id === t.parentId);
  const hijasDe = new Map<number, Fila[]>();
  for (const t of tareas) {
    if (!porPadre(t)) continue;
    const lista = hijasDe.get(t.parentId as number) ?? [];
    lista.push({ tipo: 'tarea', tarea: t });
    hijasDe.set(t.parentId as number, lista);
  }
  const raices = tareas.filter((t) => !porPadre(t));
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
      : raices.map((tarea) => ({
          fila: { tipo: 'tarea', tarea, hijos: hijasDe.get(tarea.id) } as Fila,
          entrada: entradaDeTarea(tarea),
        }))),
    ...(opciones.solo === 'tareas'
      ? []
      : habitos.map((habito) => ({
          // En completados no se esconde nada: los hijos van tal cual, como el padre.
          fila: { tipo: 'habito', habito, hijos: subfilas(habito, hoy, completados ? false : (opciones.ocultarHabitos ?? false)) } as Fila,
          entrada: entradaDeHabito(habito, hoy, opciones.valoracion),
        }))),
  ];

  // El comparador guarda los pesos calculados: se crea una sola vez.
  const comparar = comparador(opciones.orden, hoy, opciones.algoritmo);
  pares.sort((a, b) => comparar(a.entrada, b.entrada));

  return { filas: pares.map((par) => par.fila), completados, aplazados };
}

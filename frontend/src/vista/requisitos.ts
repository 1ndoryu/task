/* Qué filas esperan a otras: lo que pintan los hilos y la nota «antes: …».
 * Vive en la vista porque «hecho» de un hábito depende de su frecuencia. */
import { claveDep, hilosPendientes } from '../logica/dependencias';
import { tocaHoy } from '../logica/frecuencia';
import { hechoHoy } from '../logica/seleccion';
import type { Dashboard, RefDependencia } from '../logica/tipos';

export interface Requisitos {
  /** Un hilo por requisito sin hacer: claves `tarea12` / `habito5`. */
  hilos: { desde: string; hasta: string }[];
  /** Por fila, los nombres de lo que debe ir antes. */
  pendientes: ReadonlyMap<string, string[]>;
}

export function calcularRequisitos(datos: Dashboard, hoy: string): Requisitos {
  const nombre = (ref: RefDependencia): string | undefined =>
    ref.tipo === 'tarea' ? datos.tareas.find((t) => t.id === ref.id)?.texto : datos.habitos.find((h) => h.id === ref.id)?.nombre;
  // Un hábito que hoy no toca no bloquea: la regla del legacy.
  const hecho = (ref: RefDependencia): boolean | undefined => {
    if (ref.tipo === 'tarea') return datos.tareas.find((t) => t.id === ref.id)?.completado;
    const h = datos.habitos.find((x) => x.id === ref.id);
    return h && (hechoHoy(h, hoy) || !tocaHoy(h, hoy));
  };
  const pendientes = new Map<string, string[]>();
  const hilos = hilosPendientes(datos, hecho).map(({ desde, hasta }) => {
    const clave = claveDep(desde);
    pendientes.set(clave, [...(pendientes.get(clave) ?? []), nombre(hasta) ?? '']);
    return { desde: clave, hasta: claveDep(hasta) };
  });
  return { hilos, pendientes };
}

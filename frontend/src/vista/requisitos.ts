/* Qué filas esperan a otras: lo que pintan los hilos.
 * Vive en la vista porque «hecho» de un hábito depende de su frecuencia. */
import { claveDep, hilosPendientes } from '../logica/dependencias';
import { tocaHoy } from '../logica/frecuencia';
import { hechoHoy } from '../logica/seleccion';
import type { Dashboard, RefDependencia } from '../logica/tipos';

export interface Requisitos {
  /** Un hilo por requisito sin hacer: claves `tarea12` / `habito5`. */
  hilos: { desde: string; hasta: string }[];
}

export function calcularRequisitos(datos: Dashboard, hoy: string): Requisitos {
  // Un hábito que hoy no toca no bloquea: la regla del legacy.
  const hecho = (ref: RefDependencia): boolean | undefined => {
    if (ref.tipo === 'tarea') return datos.tareas.find((t) => t.id === ref.id)?.completado;
    const h = datos.habitos.find((x) => x.id === ref.id);
    return h && (hechoHoy(h, hoy) || !tocaHoy(h, hoy));
  };
  const hilos = hilosPendientes(datos, hecho).map(({ desde, hasta }) => ({ desde: claveDep(desde), hasta: claveDep(hasta) }));
  return { hilos };
}

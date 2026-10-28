/* Qué filas esperan a otras: lo que pintan los hilos y lo que impide completar.
 * Vive en la vista porque «hecho» de un hábito depende de su frecuencia. */
import { claveDep, hilosPendientes, requisitosPendientes } from '../logica/dependencias';
import { tocaHoy } from '../logica/frecuencia';
import { hechoHoy } from '../logica/seleccion';
import type { Dashboard, RefDependencia } from '../logica/tipos';

export interface Requisitos {
  /** Un hilo por requisito sin hacer: claves `tarea12` / `habito5`. */
  hilos: { desde: string; hasta: string }[];
}

/** Si el requisito está cumplido hoy; `undefined` si ya no existe (no bloquea). */
function requisitoHecho(datos: Dashboard, hoy: string): (ref: RefDependencia) => boolean | undefined {
  return (ref) => {
    if (ref.tipo === 'tarea') return datos.tareas.find((t) => t.id === ref.id)?.completado;
    // Un hábito que hoy no toca no bloquea: la regla del legacy.
    const h = datos.habitos.find((x) => x.id === ref.id);
    return h && (hechoHoy(h, hoy) || !tocaHoy(h, hoy));
  };
}

export function calcularRequisitos(datos: Dashboard, hoy: string): Requisitos {
  const hilos = hilosPendientes(datos, requisitoHecho(datos, hoy)).map(({ desde, hasta }) => ({
    desde: claveDep(desde),
    hasta: claveDep(hasta),
  }));
  return { hilos };
}

/** Lo que falta hacer antes de `ref` hoy. Lista vacía: `ref` puede completarse. */
export function faltaAntes(datos: Dashboard, ref: RefDependencia, hoy: string): RefDependencia[] {
  return requisitosPendientes(datos, ref, requisitoHecho(datos, hoy));
}

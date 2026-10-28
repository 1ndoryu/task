/* Contratos compartidos de la lista: qué es una fila abierta, qué cambios
 * acepta y cómo se nombra. Viven aquí para que los módulos de la vista
 * (`usarLista`, `usarEscritura`, `usarGrupos`) no se importen entre ellos. */
import type { Fila as FilaDatos } from '../logica/seleccion';
import type { Momento } from '../logica/momentos';
import type { Dashboard, FrecuenciaDetalle, Habito, SubHabito, Tarea } from '../logica/tipos';

/** Fases de la lista: cargando, con datos o con el fallo de carga. */
export type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; datos: Dashboard }
  | { fase: 'error'; mensaje: string };

/** Lo que el modal de configuración puede abrir: una tarea o un hábito. El
 *  subhábito no tiene ajustes propios (los hereda del padre): su fila se
 *  completa y se borra, y lo demás se edita en el modal del padre. */
export type Editando =
  | { tipo: 'tarea'; tarea: Tarea }
  | { tipo: 'habito'; habito: Habito }
  | { tipo: 'subhabito'; subhabito: SubHabito; padre: Habito }
  | null;

/** Cambios comunes de una fila. `grupoEjecucion` llega desde el modal. */
export interface CambiosFila {
  texto: string;
  prioridad?: string | null;
  urgencia?: string | null;
  proyectoId?: number | null;
  fechaMaxima?: string;
  /** «Cuándo es mejor hacer»; en tareas y hábitos. */
  momentos?: Momento[];
  grupoEjecucion?: string | null;
  /** Solo hábitos: frecuencia completa; el `tipo` va a la columna del backend. */
  frecuencia?: FrecuenciaDetalle;
  /** Solo hábitos: la lista entera de subhábitos, dentro del payload. */
  subhabitos?: SubHabito[];
}

/** Clave de una fila en el conjunto de salidas: tareas y hábitos comparten id. */
export function claveFila(fila: NonNullable<Editando>): string {
  if (fila.tipo === 'tarea') return `tarea${fila.tarea.id}`;
  if (fila.tipo === 'habito') return `habito${fila.habito.id}`;
  // Los subhábitos no tienen fila propia en el backend: su id solo es único
  // dentro del padre, así que la clave lleva también el padre.
  return `subhabito${fila.padre.id}-${fila.subhabito.id}`;
}

/** Una fila de la lista, en la forma que entienden el modal y las acciones. */
export function valorDe(fila: FilaDatos): NonNullable<Editando> {
  if (fila.tipo === 'tarea') return { tipo: 'tarea', tarea: fila.tarea };
  if (fila.tipo === 'habito') return { tipo: 'habito', habito: fila.habito };
  return { tipo: 'subhabito', subhabito: fila.subhabito, padre: fila.padre };
}

/** La fila abierta con la copia viva de sus datos. El modal se abre con una
 * foto de la fila: sin esto no ve los cambios que se hacen desde él mismo
 * (altas y ediciones de subhábitos, marcas de hoy). */
export function filaViva(fila: Editando, datos: Dashboard): Editando {
  if (fila?.tipo === 'habito') {
    const habito = datos.habitos.find((h) => h.id === fila.habito.id);
    return habito ? { tipo: 'habito', habito } : fila;
  }
  if (fila?.tipo === 'tarea') {
    const tarea = datos.tareas.find((t) => t.id === fila.tarea.id);
    return tarea ? { tipo: 'tarea', tarea } : fila;
  }
  return fila;
}

/** Id de una fila nueva. El contrato usa `legacy_id` positivo como clave, así
 * que el id es la marca de tiempo en milisegundos (por mil) más un contador:
 * no colisiona con los ids migrados (bajos) ni con dos altas en el mismo ms. */
let contadorAlta = 0;
export function idNuevo(): number {
  contadorAlta = (contadorAlta + 1) % 1000;
  return Date.now() * 1000 + contadorAlta;
}

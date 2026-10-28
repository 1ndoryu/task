/* Un solo orden para tareas y hábitos, como en el panel de ejecución del front
 * original: allí los hábitos se convierten en tareas virtuales (importancia →
 * prioridad, inactividad → urgencia) y todo pasa por el mismo selector
 * (`frontend-legacy/src/app/hooks/useOrdenarTareas.ts` +
 * `useHabitosComoTareas.ts`). Aquí se conservan los mismos pesos y umbrales. */
import { ALGORITMO_DEFECTO, type Algoritmo, type ClaveAlgoritmo } from './algoritmo';
import { diferenciaDias, hoyLogico } from './fechas';
import { rachaDe, ultimoHecho } from './frecuencia';
import { nivelDe } from './importancia';
import { aplicarMomentos, leerMomentos, momentoDe, type Momento } from './momentos';
import type { Habito, Tarea } from './tipos';

export type ModoOrden = 'inteligente' | 'manual' | 'fecha' | 'prioridad';

export const MODOS_ORDEN: { id: ModoOrden; etiqueta: string }[] = [
  { id: 'inteligente', etiqueta: 'Inteligente' },
  { id: 'manual', etiqueta: 'Manual' },
  { id: 'fecha', etiqueta: 'Fecha límite' },
  { id: 'prioridad', etiqueta: 'Prioridad' },
];

/** Pestaña de sistema con lo completado: no se renombra ni se borra, pero sí
 *  se mueve como cualquier otra. Los grupos nunca pueden llamarse así:
 *  `limpiarGrupo` lo impide. */
export const PESTANA_COMPLETADOS = 'completados';

/** Grupo de ejecución: el nombre que la tarea o el hábito lleva en
 * `grupoEjecucion` (`null` = sin grupo, la pestaña «Tareas»). */
export type Grupo = string | null;

/** Nombre con el que se guardan los grupos conocidos aunque hoy estén vacíos:
 *  un grupo sin filas sigue siendo una caja. */
export const CLAVE_GRUPOS = 'tareas-nuevo:v1:grupos';
/** Las claves del respaldo local de la vista, en un sitio: las leen y las
 *  escriben `preferencias.ts` y `grupos.ts`, y las sube `preferenciasRemotas.ts`. */
export const CLAVES_VISTA = {
  preferencias: 'tareas-nuevo:v1:vista',
  orden: 'tareas-nuevo:v1:orden-pestanas',
  grupos: CLAVE_GRUPOS,
} as const;

/* Los nombres de grupo son texto libre del usuario: se recortan y se ignoran
 * los vacíos para que no aparezcan pestañas fantasma. */
export function limpiarGrupo(crudo: unknown): Grupo {
  if (typeof crudo !== 'string') return null;
  const nombre = crudo.trim();
  // «Completados» es de sistema: un grupo con ese nombre no tendría pestaña.
  return nombre && nombre.toLowerCase() !== PESTANA_COMPLETADOS ? nombre : null;
}

/* Qué parámetro de `Algoritmo` pesa cada urgencia y cada importancia. */
const CLAVE_URGENCIA: Record<string, ClaveAlgoritmo> = {
  bloqueante: 'urgBloqueante',
  urgente: 'urgUrgente',
  normal: 'urgNormal',
  chill: 'urgChill',
};

const CLAVE_PRIORIDAD: Record<string, ClaveAlgoritmo> = {
  muy_alta: 'priMuyAlta',
  alta: 'priAlta',
  media: 'priMedia',
  baja: 'priBaja',
  muy_baja: 'priMuyBaja',
};

/* Una urgencia desconocida pesa como «normal»; una importancia desconocida, como «media». */
const pesoUrgencia = (a: Algoritmo, urgencia: string): number => a[CLAVE_URGENCIA[urgencia] ?? 'urgNormal'];
const pesoPrioridad = (a: Algoritmo, prioridad: string): number => a[CLAVE_PRIORIDAD[prioridad] ?? 'priMedia'];

/* Niveles de estricto, como en el legacy: días sin hacerlo para pasar a cada
 * urgencia. `normal` es el primer día que cuenta como pendiente. */
export type Tolerancia = 'muyEstricto' | 'estricto' | 'moderado' | 'relajado' | 'libre';
export interface Umbrales {
  normal: number;
  urgente: number;
  bloqueante: number;
}
export const UMBRALES: Record<Tolerancia, Umbrales> = {
  muyEstricto: { normal: 1, urgente: 1, bloqueante: 2 },
  estricto: { normal: 1, urgente: 2, bloqueante: 4 },
  moderado: { normal: 1, urgente: 3, bloqueante: 5 },
  relajado: { normal: 3, urgente: 7, bloqueante: 14 },
  // Infinito: ningún número de días llega, así que los días sin hacer no suben
  // la urgencia. El resto del orden (racha, prioridad, fechas) sigue igual.
  libre: { normal: Infinity, urgente: Infinity, bloqueante: Infinity },
};

/* Cómo valora la urgencia un hábito: el nivel de estricto y el día en que se
 * reinició la valoración (`''` si nunca). Lo hecho antes de ese día no cuenta. */
export interface ValoracionUrgencia {
  umbrales: Umbrales;
  reinicio: string;
}
export const VALORACION_DEFECTO: ValoracionUrgencia = { umbrales: UMBRALES.moderado, reinicio: '' };

/* La inactividad se cuenta del historial: `diasInactividad` y `racha` vinieron
 * congelados del front legacy y aquí nadie los recalcula. */
function inactividadDeHabito(habito: Habito, hoy: string, reinicio: string): number {
  const ultimo = ultimoHecho(habito);
  // Reiniciar la valoración cuenta desde ese día: lo anterior deja de contar.
  const desde = reinicio && (ultimo === null || reinicio > ultimo) ? reinicio : ultimo;
  return desde === null ? 0 : Math.max(0, diferenciaDias(desde, hoy));
}

function urgenciaDeHabito(habito: Habito, hoy: string, { umbrales, reinicio }: ValoracionUrgencia): string {
  const dias = inactividadDeHabito(habito, hoy, reinicio);
  if (rachaDe(habito, hoy) > 0 && dias < umbrales.normal) return 'chill';
  if (dias >= umbrales.bloqueante) return 'bloqueante';
  if (dias >= umbrales.urgente) return 'urgente';
  if (dias >= umbrales.normal) return 'normal';
  return 'chill';
}

/** Lo mínimo que necesita el comparador; tareas y hábitos se reducen a esto. */
export interface EntradaOrdenable {
  orden: number;
  prioridad: string;
  urgencia: string;
  fechaMaxima?: string;
  /** Cuándo conviene hacerlo; solo cuenta en el modo inteligente. */
  momentos?: Momento[];
}

export function entradaDeTarea(tarea: Tarea): EntradaOrdenable {
  return {
    orden: tarea.orden ?? 0,
    prioridad: nivelDe(tarea.prioridad),
    urgencia: tarea.urgencia ?? 'normal',
    fechaMaxima: tarea.configuracion?.fechaMaxima,
    momentos: leerMomentos(tarea.configuracion?.momentos),
  };
}

export function entradaDeHabito(
  habito: Habito,
  hoy: string,
  valoracion: ValoracionUrgencia = VALORACION_DEFECTO,
): EntradaOrdenable {
  return {
    orden: habito.orden ?? 0,
    prioridad: nivelDe(habito.importancia),
    urgencia: urgenciaDeHabito(habito, hoy, valoracion),
    momentos: leerMomentos(habito.momentos),
  };
}

/** Vencida, hoy, mañana, esta semana (hasta 7 días); más lejos, 0. */
function pesoFecha(fecha: string | undefined, hoy: string, a: Algoritmo): number {
  if (!fecha) return 0;
  const dias = diferenciaDias(hoy, fecha);
  if (dias < 0) return a.fecVencida;
  if (dias === 0) return a.fecHoy;
  if (dias === 1) return a.fecManana;
  if (dias <= 7) return a.fecSemana;
  return 0;
}

/* Los momentos van al final: multiplican el peso base si toca ahora (ver `aplicarMomentos`). */
function pesoTotal(entrada: EntradaOrdenable, hoy: string, momento: Momento, a: Algoritmo): number {
  // Cada día de retraso suma: lo olvidado sube poco a poco.
  const retraso = entrada.fechaMaxima ? Math.max(0, -diferenciaDias(hoy, entrada.fechaMaxima)) : 0;
  const base =
    pesoUrgencia(a, entrada.urgencia) +
    pesoPrioridad(a, entrada.prioridad) +
    pesoFecha(entrada.fechaMaxima, hoy, a) +
    retraso * a.retrasoDia;
  return aplicarMomentos(base, entrada.momentos, momento, a);
}

const porFecha = (a: EntradaOrdenable, b: EntradaOrdenable): number => {
  if (!a.fechaMaxima && !b.fechaMaxima) return a.orden - b.orden;
  if (!a.fechaMaxima) return 1;
  if (!b.fechaMaxima) return -1;
  return a.fechaMaxima.localeCompare(b.fechaMaxima);
};

const porPrioridad =
  (algoritmo: Algoritmo) =>
  (a: EntradaOrdenable, b: EntradaOrdenable): number => {
    const p = pesoPrioridad(algoritmo, b.prioridad) - pesoPrioridad(algoritmo, a.prioridad);
    if (p !== 0) return p;
    const u = pesoUrgencia(algoritmo, b.urgencia) - pesoUrgencia(algoritmo, a.urgencia);
    return u !== 0 ? u : a.orden - b.orden;
  };

/** Comparador del modo elegido, listo para `Array.sort` sobre entradas. */
export function comparador(
  modo: ModoOrden,
  hoy = hoyLogico(),
  algoritmo: Algoritmo = ALGORITMO_DEFECTO,
  momento: Momento = momentoDe(new Date(), algoritmo),
): (a: EntradaOrdenable, b: EntradaOrdenable) => number {
  switch (modo) {
    case 'manual':
      return (a, b) => a.orden - b.orden;
    case 'fecha':
      return porFecha;
    case 'prioridad':
      return porPrioridad(algoritmo);
    case 'inteligente': {
      // El peso se calcula una vez por elemento: comparar es O(n log n).
      const pesos = new WeakMap<EntradaOrdenable, number>();
      return (a, b) => {
        const pa = pesos.get(a) ?? pesoTotal(a, hoy, momento, algoritmo);
        const pb = pesos.get(b) ?? pesoTotal(b, hoy, momento, algoritmo);
        pesos.set(a, pa);
        pesos.set(b, pb);
        return pb - pa || porFecha(a, b);
      };
    }
  }
}

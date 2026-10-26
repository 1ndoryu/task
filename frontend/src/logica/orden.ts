/* Un solo orden para tareas y hábitos, como en el panel de ejecución del front
 * original: allí los hábitos se convierten en tareas virtuales (importancia →
 * prioridad, inactividad → urgencia) y todo pasa por el mismo selector
 * (`frontend-legacy/src/app/hooks/useOrdenarTareas.ts` +
 * `useHabitosComoTareas.ts`). Aquí se conservan los mismos pesos y umbrales. */
import { diferenciaDias, fechaLocal } from './fechas';
import { rachaDe, ultimoHecho } from './frecuencia';
import { nivelDe } from './importancia';
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

const PESO_URGENCIA: Record<string, number> = {
  bloqueante: 1000,
  urgente: 500,
  normal: 0,
  chill: -200,
};

const PESO_PRIORIDAD: Record<string, number> = {
  muy_alta: 500,
  alta: 300,
  media: 100,
  baja: 0,
  muy_baja: -100,
};

/* Cada día de retraso suma 50: lo olvidado sube poco a poco. */
const PESO_POR_DIA_RETRASO = 50;

/* Umbrales de inactividad del legacy: días sin hacerlo y sube de urgencia. */
const UMBRAL = { normal: 1, urgente: 3, bloqueante: 5 };

/* La inactividad se cuenta del historial: `diasInactividad` y `racha` vinieron
 * congelados del front legacy y aquí nadie los recalcula. */
function inactividadDeHabito(habito: Habito, hoy: string): number {
  const ultimo = ultimoHecho(habito);
  return ultimo === null ? 0 : Math.max(0, diferenciaDias(ultimo, hoy));
}

function urgenciaDeHabito(habito: Habito, hoy: string): string {
  const dias = inactividadDeHabito(habito, hoy);
  if (rachaDe(habito, hoy) > 0 && dias < UMBRAL.normal) return 'chill';
  if (dias >= UMBRAL.bloqueante) return 'bloqueante';
  if (dias >= UMBRAL.urgente) return 'urgente';
  if (dias >= UMBRAL.normal) return 'normal';
  return 'chill';
}

/** Lo mínimo que necesita el comparador; tareas y hábitos se reducen a esto. */
export interface EntradaOrdenable {
  orden: number;
  prioridad: string;
  urgencia: string;
  fechaMaxima?: string;
}

export function entradaDeTarea(tarea: Tarea): EntradaOrdenable {
  return {
    orden: tarea.orden ?? 0,
    prioridad: nivelDe(tarea.prioridad),
    urgencia: tarea.urgencia ?? 'normal',
    fechaMaxima: tarea.configuracion?.fechaMaxima,
  };
}

export function entradaDeHabito(habito: Habito, hoy: string): EntradaOrdenable {
  return {
    orden: habito.orden ?? 0,
    prioridad: nivelDe(habito.importancia),
    urgencia: urgenciaDeHabito(habito, hoy),
  };
}

/** Vencida +400, hoy +300, mañana +200, esta semana +100, resto 0. */
function pesoFecha(fecha: string | undefined, hoy: string): number {
  if (!fecha) return 0;
  const dias = diferenciaDias(hoy, fecha);
  if (dias < 0) return 400;
  if (dias === 0) return 300;
  if (dias === 1) return 200;
  if (dias <= 7) return 100;
  return 0;
}

function pesoTotal(entrada: EntradaOrdenable, hoy: string): number {
  const retraso = entrada.fechaMaxima ? Math.max(0, -diferenciaDias(hoy, entrada.fechaMaxima)) : 0;
  return (
    (PESO_URGENCIA[entrada.urgencia] ?? 0) +
    (PESO_PRIORIDAD[entrada.prioridad] ?? 100) +
    pesoFecha(entrada.fechaMaxima, hoy) +
    retraso * PESO_POR_DIA_RETRASO
  );
}

const porFecha = (a: EntradaOrdenable, b: EntradaOrdenable): number => {
  if (!a.fechaMaxima && !b.fechaMaxima) return a.orden - b.orden;
  if (!a.fechaMaxima) return 1;
  if (!b.fechaMaxima) return -1;
  return a.fechaMaxima.localeCompare(b.fechaMaxima);
};

const porPrioridad = (a: EntradaOrdenable, b: EntradaOrdenable): number => {
  const p = (PESO_PRIORIDAD[b.prioridad] ?? 100) - (PESO_PRIORIDAD[a.prioridad] ?? 100);
  if (p !== 0) return p;
  const u = (PESO_URGENCIA[b.urgencia] ?? 0) - (PESO_URGENCIA[a.urgencia] ?? 0);
  return u !== 0 ? u : a.orden - b.orden;
};

/** Comparador del modo elegido, listo para `Array.sort` sobre entradas. */
export function comparador(modo: ModoOrden, hoy = fechaLocal()): (a: EntradaOrdenable, b: EntradaOrdenable) => number {
  switch (modo) {
    case 'manual':
      return (a, b) => a.orden - b.orden;
    case 'fecha':
      return porFecha;
    case 'prioridad':
      return porPrioridad;
    case 'inteligente': {
      // El peso se calcula una vez por elemento: comparar es O(n log n).
      const pesos = new WeakMap<EntradaOrdenable, number>();
      return (a, b) => {
        const pa = pesos.get(a) ?? pesoTotal(a, hoy);
        const pb = pesos.get(b) ?? pesoTotal(b, hoy);
        pesos.set(a, pa);
        pesos.set(b, pb);
        return pb - pa || porFecha(a, b);
      };
    }
  }
}

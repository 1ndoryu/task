/* Frecuencia de un hábito y cuándo vuelve a tocar. Portado del front original
 * (`frontend-legacy/src/app/utils/frecuenciaHabitos.ts`): los valores y umbrales
 * son suyos para que un hábito caiga en el mismo día en los dos. El backend
 * guarda el tipo en una columna y el objeto entero dentro del `payload`, así
 * que `cadaDias`, `diasSemana` y `vecesAlMes` viven aquí. */
import { diferenciaDias } from './fechas';
import type { Frecuencia, Habito } from './tipos';

export const FRECUENCIAS: { id: Frecuencia; etiqueta: string }[] = [
  { id: 'diario', etiqueta: 'Diario' },
  { id: 'cadaXDias', etiqueta: 'Cada X días' },
  { id: 'semanal', etiqueta: 'Semanal' },
  { id: 'diasEspecificos', etiqueta: 'Días fijos' },
  { id: 'mensual', etiqueta: 'Mensual' },
];

/** Días fijos: el orden es el de `Date.getDay()` (0 = domingo). */
export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;

/** La frecuencia tal como la entiende la vista, venga como string o como objeto. */
export function frecuenciaDe(habito: Habito): { tipo: Frecuencia; cadaDias: number; diasSemana: string[]; vecesAlMes: number } {
  const cruda = habito.frecuencia;
  const objeto = typeof cruda === 'object' && cruda !== null ? cruda : null;
  const tipo = (typeof cruda === 'string' ? cruda : objeto?.tipo) as Frecuencia | undefined;
  return {
    tipo: FRECUENCIAS.some((f) => f.id === tipo) ? (tipo as Frecuencia) : 'diario',
    cadaDias: Math.min(30, Math.max(2, objeto?.cadaDias ?? 2)),
    diasSemana: objeto?.diasSemana ?? ['lunes', 'miercoles', 'viernes'],
    vecesAlMes: Math.min(30, Math.max(1, objeto?.vecesAlMes ?? 4)),
  };
}

/** Si el hábito toca hoy. La fecha de referencia entra como parámetro para
 * poder probarlo sin depender del reloj. */
export function tocaHoy(habito: Habito, hoy: string): boolean {
  const { tipo, cadaDias, diasSemana, vecesAlMes } = frecuenciaDe(habito);
  // Sin marca previa cualquier frecuencia toca: es lo que hace el legacy.
  const ultimo = habito.ultimoCompletado ?? null;
  switch (tipo) {
    case 'diario':
      return true;
    case 'cadaXDias':
      return !ultimo || diferenciaDias(ultimo, hoy) >= cadaDias;
    case 'semanal':
      return !ultimo || diferenciaDias(ultimo, hoy) >= 7;
    case 'diasEspecificos':
      return diasSemana.includes(DIAS_SEMANA[new Date(`${hoy}T00:00:00`).getDay()]);
    case 'mensual': {
      if (!ultimo) return true;
      const fecha = new Date(`${hoy}T00:00:00`);
      const diasDelMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
      return diferenciaDias(ultimo, hoy) >= Math.floor(diasDelMes / vecesAlMes);
    }
  }
}

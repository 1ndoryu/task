/* Frecuencia de un hábito y cuándo vuelve a tocar. Portado del front original
 * (`frontend-legacy/src/app/utils/frecuenciaHabitos.ts`): los valores y umbrales
 * son suyos para que un hábito caiga en el mismo día en los dos. El backend
 * guarda el tipo en una columna y el objeto entero dentro del `payload`, así
 * que `cadaDias`, `diasSemana` y `vecesAlMes` viven aquí. */
import { diferenciaDias, fechaLocal } from './fechas';
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

/** Último día cumplido. Sale del historial, que es lo que escribe esta vista;
 * `ultimoCompletado` lo mantenía el front legacy y quedó congelado al migrar,
 * así que solo vale como respaldo cuando no hay historial. */
export function ultimoHecho(habito: Habito): string | null {
  const fechas = habito.historialCompletados ?? [];
  let ultima: string | null = null;
  for (const fecha of fechas) if (ultima === null || fecha > ultima) ultima = fecha;
  return ultima ?? habito.ultimoCompletado ?? null;
}

/** Días seguidos cumplidos que terminan hoy o ayer. Se calcula del historial:
 * el `racha` del payload lo escribía el front legacy y aquí no se actualiza. */
export function rachaDe(habito: Habito, hoy: string): number {
  const hechos = new Set(habito.historialCompletados ?? []);
  let dias = 0;
  // El día de hoy puede no estar hecho todavía sin que la racha esté perdida.
  const ayer = restarDias(hoy, 1);
  const cursorInicial = hechos.has(hoy) ? hoy : hechos.has(ayer) ? ayer : null;
  if (cursorInicial === null) return 0;
  let cursor = cursorInicial;
  while (hechos.has(cursor)) {
    dias += 1;
    cursor = restarDias(cursor, 1);
  }
  return dias;
}

/** `YYYY-MM-DD` menos días, en calendario local. */
export function restarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00`);
  base.setDate(base.getDate() - dias);
  return fechaLocal(base);
}

/** Primer día en que vuelve a tocar, contando desde que se hace hoy. Es la
 * misma regla que `tocaHoy`: sirve para decirlo al marcar y que la fila no
 * parezca desaparecer sin motivo. */
export function proximaRepeticion(habito: Habito, hoy: string): string {
  const { tipo, cadaDias, diasSemana, vecesAlMes } = frecuenciaDe(habito);
  if (tipo === 'diario') return hoy;
  if (tipo === 'cadaXDias') return sumarDias(hoy, cadaDias);
  if (tipo === 'semanal') return sumarDias(hoy, 7);
  if (tipo === 'diasEspecificos') {
    for (let salto = 0; salto < 7; salto += 1) {
      const dia = sumarDias(hoy, salto);
      if (diasSemana.includes(DIAS_SEMANA[new Date(`${dia}T00:00:00`).getDay()])) return dia;
    }
    return hoy;
  }
  const fecha = new Date(`${hoy}T00:00:00`);
  const diasDelMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  return sumarDias(hoy, Math.floor(diasDelMes / vecesAlMes));
}

/** Día corto para la fila: «mié 28». Sin `Intl` para no arrastrar la config
 * del navegador y quedar en español siempre. */
export function diaCorto(fecha: string): string {
  const base = new Date(`${fecha}T00:00:00`);
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return `${dias[base.getDay()]} ${base.getDate()}`;
}

/** `YYYY-MM-DD` más días, en calendario local. */
function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00`);
  base.setDate(base.getDate() + dias);
  return fechaLocal(base);
}

/** Si el hábito toca hoy. La fecha de referencia entra como parámetro para
 * poder probarlo sin depender del reloj. */
export function tocaHoy(habito: Habito, hoy: string): boolean {
  const { tipo, cadaDias, diasSemana, vecesAlMes } = frecuenciaDe(habito);
  // Sin marca previa cualquier frecuencia toca: es lo que hace el legacy.
  const ultimo = ultimoHecho(habito);
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

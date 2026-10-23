/* Aplazar un hábito: cuánto tarda en volver a tocar. El front legacy guardaba
 * `pospuestoHasta` en el payload del hábito y marcaba el día en
 * `historialPospuestos`; aquí se escribe igual para que los dos fronts lean el
 * mismo dato y el backend lo sincronice con su tabla de historial. */
import { fechaLocal } from './fechas';
import { sumarDias } from './frecuencia';
import type { Habito } from './tipos';

/** Las opciones que ofrece el menú de la fila, en el orden en que se leen. */
export const APLAZOS: { id: string; etiqueta: string; dias: number }[] = [
  // «Solo hoy» = omitir el día de hoy y volver mañana.
  { id: 'hoy', etiqueta: 'Solo hoy', dias: 1 },
  { id: '2d', etiqueta: '2 días', dias: 2 },
  { id: '3d', etiqueta: '3 días', dias: 3 },
  { id: '1sem', etiqueta: '1 semana', dias: 7 },
  // Un mes es de calendario, no 30 días: el día vuelve el mismo número.
  { id: '1mes', etiqueta: '1 mes', dias: 0 },
];

/** Primer día en que el hábito vuelve, contando desde `hoy`. */
export function fechaAplazo(hoy: string, opcion: string): string {
  if (opcion === '1mes') {
    const base = new Date(`${hoy}T00:00:00`);
    base.setMonth(base.getMonth() + 1);
    return fechaLocal(base);
  }
  const aplazo = APLAZOS.find((a) => a.id === opcion);
  return sumarDias(hoy, aplazo?.dias ?? 1);
}

/** Día en que vuelve, mientras siga aplazado; `null` si ya toca o no lo está.
 * La fecha guardada es `YYYY-MM-DD`, así que comparar textos es comparar días. */
export function aplazadoHasta(habito: Habito, hoy: string): string | null {
  const hasta = habito.pospuestoHasta;
  return typeof hasta === 'string' && hasta > hoy ? hasta : null;
}

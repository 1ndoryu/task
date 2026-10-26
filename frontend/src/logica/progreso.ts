/* Progreso del día: cuántos hábitos de los que cuentan están hechos. Aparte de
 * `seleccion.ts` para que sea lógica pura sin dependencias y se pueda probar. */

export interface EstadoHabito {
  /** Cuenta para el día: toca hoy o ya está hecho, y no está aplazado. */
  cuenta: boolean;
  hecho: boolean;
}

export function contarProgreso(estados: EstadoHabito[]): { hechos: number; total: number } {
  const delDia = estados.filter((e) => e.cuenta);
  return { hechos: delDia.filter((e) => e.hecho).length, total: delDia.length };
}

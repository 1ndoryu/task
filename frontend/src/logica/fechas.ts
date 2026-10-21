/* Fechas en el formato del historial y del payload: `YYYY-MM-DD` local.
 * Sin las vocales de `Date.toISOString()`, que convierte a UTC y adelanta o
 * atrasa el día según la zona. */

export function fechaLocal(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Días de `hasta` menos `desde`, ambos `YYYY-MM-DD` (positivo si `hasta` es futuro). */
export function diferenciaDias(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00`).getTime();
  const b = new Date(`${hasta}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

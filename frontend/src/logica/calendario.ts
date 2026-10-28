/* Calendario de un mes: la rejilla de días y los límites de elección.
 * Lógica pura (fechas `YYYY-MM-DD` locales); la parte visual vive en
 * `vista/Calendario.tsx`. */

/* Sin importar `fechas`: los tests cargan este módulo suelto, sin resolver extensiones. */
function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mes visible: `mes` va de 0 a 11, como `Date`. */
export interface MesVisible {
  anio: number;
  mes: number;
}

export function mesDe(fecha: string): MesVisible {
  const [anio, mes] = fecha.split('-').map(Number);
  return { anio, mes: mes - 1 };
}

/** Mes anterior (`-1`) o siguiente (`1`); `Date` resuelve el cambio de año. */
export function moverMes({ anio, mes }: MesVisible, delta: number): MesVisible {
  const d = new Date(anio, mes + delta, 1);
  return { anio: d.getFullYear(), mes: d.getMonth() };
}

/** Seis semanas de siete días, empezando en lunes: tamaño fijo para que el
 *  calendario no salte de alto al cambiar de mes. */
export function rejillaMes({ anio, mes }: MesVisible): string[] {
  const primero = new Date(anio, mes, 1);
  const desfase = (primero.getDay() + 6) % 7; // lunes = 0
  return Array.from({ length: 42 }, (_, i) => fechaLocal(new Date(anio, mes, 1 - desfase + i)));
}

/** Si el día se puede elegir según los límites (inclusivos, opcionales). */
export function dentroDeLimites(fecha: string, min?: string, max?: string): boolean {
  return (min === undefined || fecha >= min) && (max === undefined || fecha <= max);
}

/* Marcas de hecho por estado destino. Funciones puras: sin red ni React, para que
 * los tests las carguen sin el cliente HTTP. `vista/usarFilas` las usa al clic. */
import type { SubHabito, Tarea } from './tipos';

/** Pone `completado` al valor pedido (no lo invierte: una copia vieja no debe
 * desmarcar lo que otra pestaña ya marcó); al completar, anota el día. */
export function fijarCompletado(tarea: Tarea, completado: boolean, hoy: string): Tarea {
  const configuracion = { ...tarea.configuracion };
  if (completado) configuracion.fechaCompletado = hoy;
  else delete configuracion.fechaCompletado;
  return { ...tarea, completado, configuracion };
}

/** Marca o desmarca el subhábito para `hoy` según lo pedido, no alternando: repetir
 * la misma marca no cambia nada. */
export function fijarMarcaSubhabito(sub: SubHabito, hecho: boolean, hoy: string): SubHabito {
  const historial = new Set(sub.historialCompletados ?? []);
  if (hecho) historial.add(hoy);
  else historial.delete(hoy);
  const fechas = [...historial].sort();
  return { ...sub, historialCompletados: fechas, ultimoCompletado: fechas.at(-1) ?? null };
}

/* Qué cajas están encendidas en el explorador. Completados, Diario y Archivados
 * ya tienen su interruptor en Ajustes y se respetan; las demás usan `ocultas`.
 * Lógica pura. */
import type { Panel } from './paneles';
import type { Preferencias } from './preferencias';

type Ajustes = Pick<Preferencias, 'ocultas' | 'mostrarCompletados' | 'mostrarDiario' | 'mostrarArchivados'>;

/** La caja se pinta si nada la apaga. */
export function cajaActiva(panel: Panel, a: Ajustes): boolean {
  if (panel.tipo === 'completados') return a.mostrarCompletados;
  if (panel.tipo === 'diario') return a.mostrarDiario;
  if (panel.tipo === 'archivados') return a.mostrarArchivados;
  return !a.ocultas.includes(panel.id);
}

/** El cambio de preferencias que enciende o apaga una caja. Sin cambio (`null`)
 *  si apagarla dejaría la vista sin ninguna: siempre queda una a la vista. */
export function alternarCaja(panel: Panel, todos: readonly Panel[], a: Ajustes): Partial<Preferencias> | null {
  const activa = cajaActiva(panel, a);
  if (activa && todos.filter((p) => cajaActiva(p, a)).length <= 1) return null;
  if (panel.tipo === 'completados') return { mostrarCompletados: !activa };
  if (panel.tipo === 'diario') return { mostrarDiario: !activa };
  if (panel.tipo === 'archivados') return { mostrarArchivados: !activa };
  return { ocultas: activa ? [...a.ocultas, panel.id] : a.ocultas.filter((id) => id !== panel.id) };
}

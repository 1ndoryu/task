/* Contratos compartidos de la lista: qué es una fila abierta, qué cambios
 * acepta y cómo se nombra. Viven aquí para que los módulos de la vista
 * (`usarLista`, `usarEscritura`, `usarGrupos`) no se importen entre ellos. */
import type { Dashboard, FrecuenciaDetalle, Habito, Tarea } from '../logica/tipos';

/** Fases de la lista: cargando, con datos o con el fallo de carga. */
export type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; datos: Dashboard }
  | { fase: 'error'; mensaje: string };

/** Lo que el modal de configuración puede abrir: una tarea o un hábito. */
export type Editando = { tipo: 'tarea'; tarea: Tarea } | { tipo: 'habito'; habito: Habito } | null;

/** Cambios comunes de una fila. `grupoEjecucion` llega desde el modal. */
export interface CambiosFila {
  texto: string;
  prioridad?: string | null;
  urgencia?: string | null;
  proyectoId?: number | null;
  fechaMaxima?: string;
  grupoEjecucion?: string | null;
  /** Solo hábitos: frecuencia completa; el `tipo` va a la columna del backend. */
  frecuencia?: FrecuenciaDetalle;
}

/** Clave de una fila en el conjunto de salidas: tareas y hábitos comparten id. */
export const claveFila = (fila: NonNullable<Editando>) =>
  `${fila.tipo}${fila.tipo === 'tarea' ? fila.tarea.id : fila.habito.id}`;

/** Id de una fila nueva. El contrato usa `legacy_id` positivo como clave, así
 * que el id es la marca de tiempo en milisegundos (por mil) más un contador:
 * no colisiona con los ids migrados (bajos) ni con dos altas en el mismo ms. */
let contadorAlta = 0;
export function idNuevo(): number {
  contadorAlta = (contadorAlta + 1) % 1000;
  return Date.now() * 1000 + contadorAlta;
}

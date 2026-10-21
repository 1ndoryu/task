/* Tipos del contrato que sirve `GET /api/dashboard`.
 * Solo se declaran los campos que usa esta vista; el resto del payload viaja
 * intacto dentro de cada entidad y se ignora. Origen: los tipos del front
 * original (`frontend-legacy/src/app/types/`). */

export interface Tarea {
  id: number;
  texto: string;
  completado: boolean;
  orden?: number;
  prioridad?: string | null;
  urgencia?: string | null;
  parentId?: number | null;
  proyectoId?: number | null;
}

export interface Habito {
  id: number;
  nombre: string;
  importancia?: string;
  orden?: number;
  /* En el payload histórico llega como string o como `{tipo}`; aquí solo se
   * muestra, no se evalúa. */
  frecuencia?: string | { tipo?: string };
  historialCompletados?: string[];
  historialPospuestos?: string[];
  racha?: number;
  ultimoCompletado?: string | null;
}

export interface Dashboard {
  tareas: Tarea[];
  habitos: Habito[];
}

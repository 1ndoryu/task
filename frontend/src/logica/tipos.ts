/* Tipos del contrato que sirve `GET /api/dashboard`.
 * Solo se declaran los campos que usa esta vista; el resto del payload viaja
 * intacto dentro de cada entidad y se ignora. Origen: los tipos del front
 * original (`frontend-legacy/src/app/types/`). */

export interface ConfiguracionTarea {
  fechaMaxima?: string;
  fechaCompletado?: string;
  descripcion?: string;
  [clave: string]: unknown;
}

export interface Tarea {
  id: number;
  texto: string;
  completado: boolean;
  orden?: number;
  prioridad?: string | null;
  urgencia?: string | null;
  parentId?: number | null;
  proyectoId?: number | null;
  fechaCreacion?: string;
  configuracion?: ConfiguracionTarea;
  /** Grupo de ejecución: la pestaña en la que aparece (null = «Tareas»). */
  grupoEjecucion?: string | null;
}

export interface Proyecto {
  id: number;
  nombre: string;
  orden?: number;
}

export interface Habito {
  id: number;
  nombre: string;
  importancia?: string;
  orden?: number;
  /* En el payload histórico llega como string o como `{tipo, cadaDias?, …}`;
   * aquí solo se usa `cadaDias` para repartir la inactividad. */
  frecuencia?: string | { tipo?: string; cadaDias?: number };
  historialCompletados?: string[];
  historialPospuestos?: string[];
  racha?: number;
  diasInactividad?: number;
  ultimoCompletado?: string | null;
  /** Grupo de ejecución, el mismo campo que en las tareas. */
  grupoEjecucion?: string | null;
}

export interface Dashboard {
  tareas: Tarea[];
  habitos: Habito[];
  proyectos: Proyecto[];
}

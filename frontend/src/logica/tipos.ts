/* Tipos del contrato que sirve `GET /api/dashboard`.
 * Solo se declaran los campos que usa esta vista; el resto del payload viaja
 * intacto dentro de cada entidad y se ignora. Origen: los tipos del front
 * original (`frontend-legacy/src/app/types/`). */

import type { Momento } from './momentos';

export interface ConfiguracionTarea {
  fechaMaxima?: string;
  /** «Cuándo es mejor hacer»: pesa en el orden inteligente. */
  momentos?: Momento[];
  fechaCompletado?: string;
  descripcion?: string;
  [clave: string]: unknown;
}

/** Lo que debe estar hecho antes que una fila (otra tarea u otro hábito). */
export interface RefDependencia {
  tipo: "tarea" | "habito";
  id: number;
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
  /** Requisitos: lo que debe hacerse antes (en el payload, como el legacy). */
  dependencias?: RefDependencia[];
  /** Grupo de ejecución: la pestaña en la que aparece (null = «Tareas»). */
  grupoEjecucion?: string | null;
}

export interface Proyecto {
  id: number;
  nombre: string;
  orden?: number;
}

/** Los cinco tipos del legacy (`TipoFrecuencia`). */
export type Frecuencia = 'diario' | 'cadaXDias' | 'semanal' | 'diasEspecificos' | 'mensual';

/** El backend guarda el tipo en su columna y el objeto entero en el `payload`;
 * al leer llega una u otra forma, así que se aceptan las dos. */
export interface FrecuenciaDetalle {
  tipo?: Frecuencia;
  /** `cadaXDias`: días entre repeticiones (2–30). */
  cadaDias?: number;
  /** `diasEspecificos`: días de la semana en minúsculas y sin tilde. */
  diasSemana?: string[];
  /** `mensual`: veces al mes (1–30). */
  vecesAlMes?: number;
}

export interface Habito {
  id: number;
  nombre: string;
  importancia?: string;
  orden?: number;
  frecuencia?: Frecuencia | string | FrecuenciaDetalle;
  historialCompletados?: string[];
  historialPospuestos?: string[];
  /** Primer día en que vuelve tras aplazarlo (`YYYY-MM-DD`, como el legacy).
   *  Mientras sea futuro, el hábito no toca y se esconde de la lista. */
  pospuestoHasta?: string;
  racha?: number;
  diasInactividad?: number;
  ultimoCompletado?: string | null;
  /** Grupo de ejecución, el mismo campo que en las tareas. */
  grupoEjecucion?: string | null;
  /** «Cuándo es mejor hacer»: pesa en el orden inteligente. */
  momentos?: Momento[];
  /** Subhábitos: viven dentro del payload del padre (un solo nivel), como en
   *  el legacy; no tienen grupo ni fila propia en el backend. */
  subhabitos?: SubHabito[];
  /** Requisitos: lo que debe hacerse antes. */
  dependencias?: RefDependencia[];
}

/** Un hábito hijo: mismo contrato que el padre en pequeño. Lo que comparte
 *  con él (grupo) no se guarda aquí: manda el padre. */
export interface SubHabito {
  id: number;
  nombre: string;
  importancia?: string;
  frecuencia?: Frecuencia | string | FrecuenciaDetalle;
  historialCompletados?: string[];
  historialPospuestos?: string[];
  ultimoCompletado?: string | null;
  racha?: number;
  pausado?: boolean;
}

export interface Dashboard {
  tareas: Tarea[];
  habitos: Habito[];
  proyectos: Proyecto[];
}

/* Vocabulario del formulario de fila: lo que el modal puede cambiar y las
 * listas cerradas que ofrece. Vive aparte para que quien lo use (el modal y la
 * lista) no tenga que importar el componente entero. */
import type { Momento } from '../logica/momentos';
import type { FrecuenciaDetalle } from '../logica/tipos';

/** Cambios de una fila según lo edita el modal; cada uno se guarda al momento. */
export interface CambiosFilaForm {
  texto: string;
  prioridad: string;
  urgencia: string;
  proyectoId: number | null;
  fechaMaxima: string;
  /** «Cuándo es mejor hacer»: tareas y hábitos. */
  momentos?: Momento[];
  /** `''` es «Tareas»; el nombre libre es el grupo. */
  grupoEjecucion: string;
  /** Solo hábitos. */
  frecuencia?: FrecuenciaDetalle;
}

export const URGENCIAS = [
  { id: 'bloqueante', etiqueta: 'Bloqueante' },
  { id: 'urgente', etiqueta: 'Urgente' },
  { id: 'normal', etiqueta: 'Normal' },
  { id: 'chill', etiqueta: 'Chill' },
];

export const PRIORIDADES = [
  { id: 'muy_alta', etiqueta: 'Muy alta' },
  { id: 'alta', etiqueta: 'Alta' },
  { id: 'media', etiqueta: 'Media' },
  { id: 'baja', etiqueta: 'Baja' },
  { id: 'muy_baja', etiqueta: 'Muy baja' },
];

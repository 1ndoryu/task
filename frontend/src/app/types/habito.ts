/*
 * types/habito.ts
 * [H-F15-01] Tipos del dominio de hábitos (extraídos de types/dashboard.ts).
 * Incluye los tipos base compartidos con tareas (NivelImportancia,
 * ReferenciaDependencia) y los DTOs de creación.
 */

/*
 * Niveles de importancia para habitos
 * Muy Alta: habitos críticos e innegociables (máxima prioridad)
 * Alta: habitos criticos para objetivos principales
 * Media: habitos importantes pero no criticos
 * Baja: habitos deseables pero opcionales
 */
export type NivelImportancia = 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja';

/*
 * Tipos de frecuencia para habitos
 * Define cada cuanto tiempo debe realizarse un habito
 */
export type TipoFrecuencia = 'diario' | 'cadaXDias' | 'semanal' | 'diasEspecificos' | 'mensual';

/*
 * Dias de la semana para frecuencia diasEspecificos
 */
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

/*
 * Configuracion de frecuencia para un habito
 * Permite definir cuando debe realizarse el habito
 */
export interface FrecuenciaHabito {
    tipo: TipoFrecuencia;
    /* Para 'cadaXDias': numero de dias entre repeticiones */
    cadaDias?: number;
    /* Para 'diasEspecificos': dias de la semana */
    diasSemana?: DiaSemana[];
    /* Para 'mensual': veces por mes */
    vecesAlMes?: number;
}

/*
 * Frecuencia por defecto: diario
 */
export const FRECUENCIA_POR_DEFECTO: FrecuenciaHabito = {
    tipo: 'diario'
};

/*
 * Referencia a otro elemento que actua como dependencia/requisito
 */
export interface ReferenciaDependencia {
    tipo: 'tarea' | 'habito' | 'subhabito';
    id: number;
    padreId?: number;
    nombreSnapshot?: string;
    /* Modo de la dependencia: estricto se reinicia cada periodo, suave queda desbloqueado una vez cumplido */
    modo?: 'estricto' | 'suave';
}

/*
 * Ventana de oportunidad para un hábito
 * Define el período de tiempo óptimo para realizar el hábito
 */
export interface VentanaOportunidad {
    /* Hora de inicio (0-23) */
    horaInicio: number;
    /* Minuto de inicio (0-59) */
    minutoInicio: number;
    /* Hora de fin (0-23) */
    horaFin: number;
    /* Minuto de fin (0-59) */
    minutoFin: number;
    /* Si la ventana está habilitada */
    habilitada: boolean;
}

/*
 * SubHabito: Hábito anidado dentro de otro hábito
 * Solo permite un nivel de anidación (sin subhábitos recursivos)
 * Hereda inicialmente propiedades del padre pero puede tener frecuencia e importancia independiente
 */
export interface SubHabito {
    id: number;
    nombre: string;
    importancia: NivelImportancia;
    frecuencia?: FrecuenciaHabito;
    historialCompletados: string[];
    historialPospuestos?: string[];
    ultimoCompletado?: string;
    fechaCreacion: string;
    /* Campos heredados del padre al crear (pueden modificarse independientemente) */
    diasInactividad: number;
    racha: number;
    pausado?: boolean;
    fechaPausa?: string;
    /* Posposición temporal individual (diferente de historialPospuestos que es por día) */
    pospuestoHasta?: string;
    /* Ventana de oportunidad individual (hereda del padre si no se define) */
    ventanaOportunidad?: VentanaOportunidad;
    /* Dependencias condicionales: elementos que deben cumplirse antes de marcar este subhabito */
    dependencias?: ReferenciaDependencia[];
}

export interface Habito {
    id: number;
    nombre: string;
    importancia: NivelImportancia;
    diasInactividad: number;
    racha: number;
    tags: string[];
    historialCompletados: string[] /* Fechas ISO de completados */;
    /* Historial de fechas pospuestas (no cuentan como incumplimiento) */
    historialPospuestos?: string[];
    ultimoCompletado?: string /* Fecha ISO del ultimo completado */;
    fechaCreacion: string /* Fecha ISO de cuando se creo el habito */;
    /* Frecuencia del habito (opcional, por defecto diario) */
    frecuencia?: FrecuenciaHabito;
    /* Campos esteticos */
    descripcion?: string;
    icono?: string;
    colorIcono?: string;
    /* Estado de pausa: el habito no aparece en pendientes y la racha se congela */
    pausado?: boolean;
    fechaPausa?: string /* Fecha ISO de cuando se pauso el habito */;
    /* IDs de tareas asociadas al habito, en orden personalizado (Fase 14.8) */
    tareasIds?: number[];
    /* SubHabitos: hábitos anidados con frecuencia e importancia independiente */
    subhabitos?: SubHabito[];
    /* Ventana de oportunidad: período de tiempo óptimo para realizar el hábito */
    ventanaOportunidad?: VentanaOportunidad;
    /* [2303A-41] Fecha ISO hasta la que el hábito está pospuesto por tiempo (diferente de historialPospuestos que es por día) */
    pospuestoHasta?: string;
    /* [014A-19] Timestamp de última modificación local (ms). Usado para resolución de
     * conflictos per-entity: el backend rechaza writes con updatedAt menor al existente. */
    updatedAt?: number;
    /* Dependencias condicionales: elementos que deben cumplirse antes de marcar este habito */
    dependencias?: ReferenciaDependencia[];
    /* Orden manual para drag & drop (menor = primero). Igual patrón que Tarea.orden */
    orden?: number;
    /* Orden exclusivo para el panel de Ejecución, separado del panel de Hábitos */
    ordenEjecucion?: number;
    /* Grupo de ejecución para organizar paneles de ejecución múltiples */
    grupoEjecucion?: string | null;
}

/*
 * Datos para crear un nuevo habito
 */
export interface DatosNuevoHabito {
    nombre: string;
    importancia: NivelImportancia;
    tags: string[];
    frecuencia?: FrecuenciaHabito;
    descripcion?: string;
    icono?: string;
    colorIcono?: string;
    /* TAREA 4: Ventana de oportunidad */
    ventanaOportunidad?: VentanaOportunidad;
    /* Dependencias condicionales para completar el hábito */
    dependencias?: ReferenciaDependencia[];
    /* Grupo de ejecución para organizar paneles de ejecución múltiples */
    grupoEjecucion?: string | null;
}

/*
 * Datos para crear un nuevo subhabito
 * Hereda inicialmente propiedades del habito padre
 */
export interface DatosNuevoSubHabito {
    nombre: string;
    importancia: NivelImportancia;
    frecuencia?: FrecuenciaHabito;
    ventanaOportunidad?: VentanaOportunidad;
    /* Dependencias condicionales para completar el subhábito */
    dependencias?: ReferenciaDependencia[];
}

/*
 * Tipos para el MCP Server
 * Subconjunto de tipos del frontend necesarios para el MCP
 */

/* Niveles de prioridad para tareas (importancia) */
export type NivelPrioridad = 'alta' | 'media' | 'baja';

/* Niveles de urgencia para tareas (temporalidad) */
export type NivelUrgencia = 'bloqueante' | 'urgente' | 'normal' | 'chill';

/* Niveles de importancia para hábitos */
export type NivelImportancia = 'Muy Alta' | 'Alta' | 'Media' | 'Baja';

/* Tipos de frecuencia para hábitos */
export type TipoFrecuencia = 'diario' | 'cadaXDias' | 'semanal' | 'diasEspecificos' | 'mensual';

/* Días de la semana */
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

/* Configuración de frecuencia para hábitos */
export interface FrecuenciaHabito {
    tipo: TipoFrecuencia;
    cadaDias?: number;
    diasSemana?: DiaSemana[];
    vecesAlMes?: number;
}

/* Tipos de repetición para tareas */
export type TipoRepeticion = 'despuesCompletar' | 'intervaloFijo';

/* Configuración de repetición para tareas */
export interface RepeticionTarea {
    tipo: TipoRepeticion;
    intervalo: number;
    diasSemana?: DiaSemana[];
    ultimaRepeticion?: string;
}

/* Archivo adjunto */
export interface Adjunto {
    id: number;
    tipo: 'imagen' | 'audio' | 'archivo';
    url: string;
    nombre: string;
    tamano: number;
    fechaSubida: string;
    thumbnailUrl?: string;
}

/* Configuración avanzada de tarea */
export interface TareaConfiguracion {
    fechaMaxima?: string;
    descripcion?: string;
    repeticion?: RepeticionTarea;
    adjuntos?: Adjunto[];
}

/* Entidad Tarea */
export interface Tarea {
    id: number;
    texto: string;
    completado: boolean;
    fechaCreacion?: string;
    fechaCompletado?: string;
    orden?: number;
    parentId?: number;
    proyectoId?: number;
    prioridad?: NivelPrioridad;
    urgencia?: NivelUrgencia;
    configuracion?: TareaConfiguracion;
    tags?: string[];
}

/* Entidad Proyecto */
export interface Proyecto {
    id: number;
    nombre: string;
    descripcion?: string;
    icono?: string;
    colorIcono?: string;
    prioridad: NivelPrioridad;
    urgencia?: NivelUrgencia;
    fechaLimite?: string;
    estado: 'activo' | 'completado' | 'pausado';
    progreso?: number;
    fechaCreacion: string;
    fechaCompletado?: string;
}

/* Entidad Hábito */
export interface Habito {
    id: number;
    nombre: string;
    importancia: NivelImportancia;
    diasInactividad: number;
    racha: number;
    tags: string[];
    historialCompletados: string[];
    historialPospuestos?: string[];
    ultimoCompletado?: string;
    fechaCreacion: string;
    frecuencia?: FrecuenciaHabito;
    descripcion?: string;
    icono?: string;
    colorIcono?: string;
}

/* Datos completos del Dashboard */
export interface DashboardData {
    habitos: Habito[];
    tareas: Tarea[];
    proyectos?: Proyecto[];
    notasIniciales?: string;
}

/* Datos para crear nueva tarea */
export interface DatosNuevaTarea {
    texto: string;
    prioridad?: NivelPrioridad;
    urgencia?: NivelUrgencia;
    configuracion?: TareaConfiguracion;
    proyectoId?: number;
    tags?: string[];
}

/* Datos para editar tarea */
export interface DatosEdicionTarea {
    texto?: string;
    prioridad?: NivelPrioridad | null;
    urgencia?: NivelUrgencia | null;
    completado?: boolean;
    configuracion?: TareaConfiguracion;
    proyectoId?: number;
    tags?: string[];
}

/*
 * types/proyecto.ts
 * [H-F15-01] Tipos del dominio de proyectos (extraídos de types/dashboard.ts).
 */

import type {Adjunto, NivelPrioridad, NivelUrgencia, RolCompartido} from './tarea';

/*
 * Entidad Proyecto
 * Contenedor de alto nivel para agrupar tareas relacionadas
 */
/* Fragmentos cohesivos de Proyecto (ISP) */
export interface ProyectoBasico {
    id: number;
    nombre: string;
    prioridad: NivelPrioridad;
    estado: 'activo' | 'completado' | 'pausado';
}

/* Detalles descriptivos y planeacion visual */
export interface ProyectoDetalle {
    descripcion?: string;
    /* Icono del proyecto (id del icono de lucide) */
    icono?: string;
    /* Color del icono (hex) */
    colorIcono?: string;
    /* Urgencia: temporalidad (bloqueante, urgente, normal, chill) */
    urgencia?: NivelUrgencia;
    fechaLimite?: string;
    /* Progreso calculado (0-100) */
    progreso?: number;
}

/* Temporalidad y sincronizacion de conflictos */
export interface ProyectoTemporalidad {
    fechaCreacion: string;
    fechaCompletado?: string;
    /* [014A-19] Timestamp de última modificación local (ms) para resolución de conflictos. */
    updatedAt?: number;
}

/* Metadata de proyectos compartidos conmigo */
export interface ProyectoCompartido {
    /* Metadata para proyectos compartidos conmigo */
    esCompartido?: boolean;
    propietarioId?: number;
    propietarioNombre?: string;
    propietarioAvatar?: string;
    miRol?: RolCompartido;
}

/* Adjuntos y hitos del proyecto (Fase 9) */
export interface ProyectoContenido {
    /* Adjuntos del proyecto (Fase 9) */
    adjuntos?: Adjunto[];
    /* Hitos del proyecto (Fase 9) */
    hitos?: Hito[];
}

/*
 * Entidad Proyecto
 * Contenedor de alto nivel para agrupar tareas relacionadas
 */
export interface Proyecto extends ProyectoBasico, ProyectoDetalle, ProyectoTemporalidad, ProyectoCompartido, ProyectoContenido {}

export interface Hito {
    id: number;
    titulo: string;
    completado: boolean;
    prioridad: NivelPrioridad;
    fechaLimite?: string;
}
